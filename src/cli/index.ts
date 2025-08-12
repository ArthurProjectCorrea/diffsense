#!/usr/bin/env node
import { Command } from "commander";
import { runAnalysis } from "../index.js";
import { AnalysisOptions } from "../types/index.js";
import * as fs from "fs";
import * as path from "path";

const program = new Command();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
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
      
      // Imprimir relatório
      console.log(result.report);
      
      // Se a opção auto-commit estiver habilitada, criar commit
      if (opts.autoCommit && result.suggestedCommit) {
        const { type, scope, subject, breaking, body } = result.suggestedCommit;
        
        // Implementação do auto-commit
        // (exigiria acesso ao git, omitido nesta versão)
        console.log("Auto-commit habilitado, mas a funcionalidade não está implementada ainda.");
        console.log(`Sugestão de commit: ${type}${scope ? `(${scope})` : ''}${breaking ? '!' : ''}: ${subject}`);
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
    reason: "Arquivo de teste"
  - id: docs
    match: "**/*.md"
    type: docs
    reason: "Arquivo de documentação"
`;
      
      try {
        fs.writeFileSync(".diffsenserc.yaml", defaultConfig);
        console.log("Configuração padrão criada em .diffsenserc.yaml");
      } catch (error) {
        console.error("Erro ao criar arquivo de configuração:", error);
      }
    } else if (opts.show) {
      // Mostrar configuração atual
      try {
        if (fs.existsSync(".diffsenserc.yaml")) {
          const config = fs.readFileSync(".diffsenserc.yaml", "utf-8");
          console.log("Configuração atual:");
          console.log(config);
        } else {
          console.log("Nenhuma configuração encontrada. Use --init para criar uma configuração padrão.");
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

program.parse();
