#!/usr/bin/env node
import { Command } from "commander";
import { runAnalysis } from "../index.js";
import { AnalysisOptions } from "../types/index.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const program = new Command();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8")
);

program
  .name("diffsense")
  .description("Analyze code changes and suggest semantic commits.")
  .version(packageJson.version);

program
  .command("run")
  .description("Run analysis on current changes")
  .option("--base <ref>", "Base branch/commit to compare", "main")
  .option("--head <ref>", "Head branch/commit to compare", "HEAD")
  .option("--format <format>", "Output format (markdown, json, cli)", "cli")
  .option("--config <path>", "Path to custom rules config file")
  .option("--auto-commit", "Automatically create a commit with the suggested message")
  .option("--verbose", "Show detailed output")
  .action(async (opts) => {
    try {
      console.log(`DiffSense v${packageJson.version}`);
      console.log(`Analyzing changes from ${opts.base} to ${opts.head}...`);
      
      const options: AnalysisOptions = {
        format: opts.format,
        configPath: opts.config,
        autoCommit: opts.autoCommit,
      };
      
      const result = await runAnalysis(opts.base, opts.head, options);
      
      // Print report
      console.log(result.report);
      
      // If auto-commit option is enabled, create commit
      if (opts.autoCommit && result.suggestedCommit) {
        const { type, scope, subject, breaking, body } = result.suggestedCommit;
        
        // Auto-commit implementation
        // (would require git access, omitted in this version)
        console.log("Auto-commit enabled, but functionality is not implemented yet.");
        console.log(`Commit suggestion: ${type}${scope ? `(${scope})` : ''}${breaking ? '!' : ''}: ${subject}`);
      }
    } catch (error) {
      console.error("Erro ao executar análise:", error);
      process.exit(1);
    }
  });

program
  .command("config")
  .description("Manage DiffSense configuration")
  .option("--init", "Initialize default configuration")
  .option("--show", "Show current configuration")
  .option("--edit", "Open configuration in editor")
  .action((opts) => {
    if (opts.init) {
      console.log("Initializing default configuration...");
      // Implementação da inicialização de configuração
      
      // Crie um arquivo .diffsenserc.yaml na raiz do projeto
      const defaultConfig = `# DiffSense Configuration
rules:
  - id: tests
    match: "**/*.{spec,test}.{ts,js}"
    type: test
    reason: "Test file"
  - id: docs
    match: "**/*.md"
    type: docs
    reason: "Documentation file"
`;
      
      try {
        fs.writeFileSync(".diffsenserc.yaml", defaultConfig);
        console.log("Default configuration created in .diffsenserc.yaml");
      } catch (error) {
        console.error("Error creating configuration file:", error);
      }
    } else if (opts.show) {
      // Mostrar configuração atual
      try {
        if (fs.existsSync(".diffsenserc.yaml")) {
          const config = fs.readFileSync(".diffsenserc.yaml", "utf-8");
          console.log("Current configuration:");
          console.log(config);
        } else {
          console.log("No configuration found. Use --init to create a default configuration.");
        }
      } catch (error) {
        console.error("Erro ao ler configuração:", error);
      }
    } else if (opts.edit) {
      console.log("Abrir configuração no editor não implementado ainda.");
    } else {
      program.help();
    }
  });

program
  .command("commit")
  .description("Groups and commits changes by semantic type")
  .option("--show-only", "Only show changes without committing")
  .option("--simple", "Use simplified interface for commits")
  .action((opts) => {
    try {
      console.log(`DiffSense v${packageJson.version} - Commit por Tipo`);
      
      const scriptPath = opts.simple 
        ? path.join(projectRoot, "bin", "commit-by-type-direct.js")
        : path.join(projectRoot, "bin", "commit-by-type.js");
      
      const cmdArgs = opts.showOnly ? ["--show-only"] : [];
      
      // Executar o script com os argumentos apropriados
      execSync(`node ${scriptPath} ${cmdArgs.join(" ")}`, { 
        stdio: "inherit"
      });
      
    } catch (error) {
      console.error("Erro ao executar commit por tipo:", error);
      process.exit(1);
    }
  });

program
  .command("workflow")
  .description("Runs analysis and automatic commit for CI/CD workflows")
  .option("--base <ref>", "Base branch/commit for comparison", "main")
  .option("--head <ref>", "Head branch/commit for comparison", "HEAD")
  .option("--prefix <prefix>", "Prefix for commit message (optional)")
  .option("--scope <scope>", "Scope for commit message (optional)")
  .option("--no-add", "Do not add files automatically (git add .)")
  .option("--push", "Push after commit")
  .action(async (opts) => {
    try {
      console.log(`DiffSense v${packageJson.version} - Workflow Automatizado`);
      
      // Executar git add . se necessário
      if (opts.add !== false) {
        console.log("Adicionando arquivos modificados ao stage...");
        execSync("git add .", { stdio: "inherit" });
      }
      
      // Verificar se há alterações para commitar
      const status = execSync("git status --porcelain").toString().trim();
      if (!status) {
        console.log("Nenhuma alteração para commitar. Workflow finalizado.");
        return;
      }
      
      // Executar análise do DiffSense
      console.log("Analisando alterações...");
      const result = await runAnalysis(opts.base, opts.head, {
        format: "json",
        autoCommit: false,
      });
      
      // Extrair sugestão de commit
      const suggestionData = result.suggestedCommit || {
        type: "chore",
        subject: "automated changes",
        breaking: false
      };
      
      // Usar prefixo e escopo fornecidos ou os sugeridos pela análise
      const commitType = opts.prefix || suggestionData.type || "chore";
      const commitScope = opts.scope || suggestionData.scope || "workflow";
      const breaking = suggestionData.breaking ? "!" : "";
      const subject = suggestionData.subject || "automated changes";
      
      // Formatar mensagem de commit
      const commitMsg = `${commitType}(${commitScope})${breaking}: ${subject}`;
      
      // Realizar o commit
      console.log(`Realizando commit: ${commitMsg}`);
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
      
      // Realizar push se solicitado
      if (opts.push) {
        const currentBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
        console.log(`Realizando push para branch: ${currentBranch}...`);
        execSync(`git push origin ${currentBranch}`, { stdio: "inherit" });
      }
      
      console.log("Workflow automatizado concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao executar workflow:", error);
      process.exit(1);
    }
  });

program
  .command("suggest")
  .description("Sugere mensagem de commit sem executar o commit")
  .option("--from <sha>", "SHA do commit base para comparação")
  .option("--to <sha>", "SHA do commit final para comparação (default: HEAD)")
  .option("--branch <branch>", "Branch base para comparação (e.g., main, develop)")
  .option("--staged", "Analisar apenas mudanças staged")
  .option("--all", "Analisar todas as alterações no repositório")
  .action((opts) => {
    try {
      console.log(`DiffSense v${packageJson.version} - Sugestão de Commit`);
      
      const scriptPath = path.join(projectRoot, "scripts", "suggest-commit.js");
      
      // Construir argumentos com base nas opções fornecidas
      const cmdArgs = [];
      
      if (opts.from) cmdArgs.push(`--from ${opts.from}`);
      if (opts.to) cmdArgs.push(`--to ${opts.to}`);
      if (opts.branch) cmdArgs.push(`--branch ${opts.branch}`);
      if (opts.staged) cmdArgs.push("--staged");
      if (opts.all) cmdArgs.push("--all");
      
      // Executar o script de sugestão de commit
      execSync(`node ${scriptPath} ${cmdArgs.join(" ")}`, {
        stdio: "inherit"
      });
      
    } catch (error) {
      console.error("Erro ao gerar sugestão de commit:", error);
      process.exit(1);
    }
  });

program
  .command("help")
  .description("Exibe ajuda detalhada para o DiffSense")
  .action(() => {
    console.log(`
DiffSense v${packageJson.version}
Framework inteligente para análise de alterações em código e commits semânticos automáticos.

COMANDOS:

  diffsense run [options]      Analisa alterações de código atual e gera relatório
    Opções:
      --base <ref>             Branch/commit base para comparação (default: "main")
      --head <ref>             Branch/commit alvo para comparação (default: "HEAD")
      --format <format>        Formato de saída (markdown, json, cli) (default: "cli")
      --config <path>          Caminho para arquivo de regras personalizado
      --auto-commit            Automaticamente cria um commit com a mensagem sugerida
      --verbose                Mostra saída detalhada
      
  diffsense commit [options]  Agrupa e comita alterações por tipo semântico
    Opções:
      --show-only              Apenas mostra as alterações sem commitar
      --simple                 Usa interface simplificada para commits
      
  diffsense suggest [options] Sugere mensagem de commit sem executar o commit
    Opções:
      --from <sha>             SHA do commit base para comparação
      --to <sha>               SHA do commit final para comparação (default: HEAD)
      --branch <branch>        Branch base para comparação (e.g., main)
      --staged                 Analisa apenas mudanças staged
      --all                    Analisa todas as alterações no repositório
      
  diffsense workflow [options]  Executa análise e commit automático para workflows CI/CD
    Opções:
      --base <ref>             Branch/commit base para comparação (default: "main") 
      --head <ref>             Branch/commit alvo para comparação (default: "HEAD")
      --prefix <prefix>        Prefixo para a mensagem de commit (opcional)
      --scope <scope>          Escopo para a mensagem de commit (opcional)
      --no-add                 Não adicionar arquivos automaticamente (git add .)
      --push                   Realizar push após o commit
      
  diffsense config [options]  Gerencia configuração do DiffSense
    Opções:
      --init                   Inicializa configuração padrão
      --show                   Mostra configuração atual
      --edit                   Abre configuração no editor

EXEMPLOS:
  $ diffsense run                         # Analisa todas as alterações
  $ diffsense run --base main --head HEAD # Compara branch main com HEAD
  $ diffsense commit                      # Agrupa e comita por tipo
  $ diffsense suggest --staged            # Sugere commit para mudanças staged
  $ diffsense workflow --push             # Comita automaticamente e faz push (para CI/CD)
`);
  });

program.parse();
