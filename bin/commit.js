#!/usr/bin/env node

/**
 * DiffSense - Ferramenta de commit inteligente
 * 
 * Este script centraliza o fluxo de commit baseado na análise semântica das alterações.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

// Importando módulos das etapas
import { stageAllFiles } from './commit-modules/stage-files.js';
import { analyzeChanges } from './commit-modules/analyze-changes.js';
import { confirmCommit } from './commit-modules/confirm-commit.js';
import { commitByTypes } from './commit-modules/commit-by-types.js';
import inquirer from 'inquirer';
import { commitFiles, commitBreakingChange } from './commit-modules/commit-by-types.js';

// Importar tipos e funções do core
import { ChangeType, CHANGE_PRIORITY } from '../dist/types/index.js';
import { getChangeTypeDescription } from '../dist/index.js';

// Importar o módulo para mostrar os tipos de commit
import { showCommitTypes } from './commit-modules/show-types.js';

// Configurando commander para CLI
const program = new Command();

// Importando biblioteca para tabelas de linha de comando
import Table from 'cli-table3';
import { findPackageScopes } from '../src/utils/scope-finder.js';
import { classifyFilesByScope } from '../src/utils/scope-classifier.js';

// Função para gerar o texto de ajuda personalizado com estilo tabular mais compacto
function generateCustomHelp() {
  let output = '';
  
  // Banner padrão
    // Banner padrão
    const helpBanner = boxen(
      chalk.cyan.bold('DiffSense Commit') + '\n' + chalk.dim('Análise semântica de alterações e commit inteligente'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
    );
    output += helpBanner + '\n';
  
  // Descrição curta
  output += chalk.bold('🔍 SOBRE:') + '\n';
  output += 'Ferramenta para análise de alterações de código e organização de commits.\n';
  
  // Tabela de opções estilo padrão do projeto (com bordas)
  output += chalk.bold('⚙️  OPÇÕES:\n');
  
  const optionsTable = new Table({
    head: [chalk.cyan('Opção'), chalk.cyan('Descrição')],
    style: { head: [], border: [] },
    colWidths: [25, 55],
    wordWrap: true
  });
  
  // Adicionar opções na tabela
  optionsTable.push(
    [chalk.green('-a, --analyzer'), 'Executa apenas a análise e exibe o resultado, sem realizar commits'],
    [chalk.green('-ac, --autoComplete'), 'Realiza commits automáticos com descrições predefinidas'],
    [chalk.green('-t, --types'), 'Lista todos os tipos de commit suportados'],
    [chalk.green('-s, --scopes'), 'Lista todos os escopos (package.json) encontrados'],
    [chalk.green('-v, --version'), 'Exibe a versão atual da ferramenta'],
    [chalk.green('-h, --help'), 'Exibe este guia de ajuda']
  );
  
  output += optionsTable.toString() + '\n\n';
  
  // Tabela de exemplos com o mesmo estilo das tabelas de análise
  output += chalk.bold('💡 EXEMPLOS:\n');
  
  const examplesTable = new Table({
    head: [chalk.cyan('Comando'), chalk.cyan('Descrição')],
    style: { head: [], border: [] },
    wordWrap: true,
    wrapOnWordBoundary: true,
    colWidths: [30, 50]
  });
  
  examplesTable.push(
    [chalk.yellow('$ diffsense'), 'Fluxo padrão interativo de commit'],
    [chalk.yellow('$ diffsense --analyzer'), 'Apenas analisar alterações sem fazer commit'],
    [chalk.yellow('$ diffsense --autoComplete'), 'Realizar commits automáticos com descrições geradas (incluindo breaking changes)'],
    [chalk.yellow('$ diffsense --types'), 'Listar todos os tipos de commit suportados'],
    [chalk.yellow('$ diffsense --scopes'), 'Listar todos os escopos (package.json) encontrados']
  );
  
  output += examplesTable.toString() + '\n\n';
  
  // Documentação em formato tabular para manter consistência
  output += chalk.bold('📚 DOCUMENTAÇÃO:\n');
  
  const docsTable = new Table({
    style: { head: [], border: [] },
    wordWrap: true
  });
  
  docsTable.push(
    ['Repositório GitHub:', chalk.blue('https://github.com/ArthurProjectCorrea/diffsense')],
    ['Convenções de Commit:', chalk.blue('https://www.conventionalcommits.org/')]
  );
  
  output += docsTable.toString() + '\n';
  
  return output;
}

// Verificar se está solicitando ajuda
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  // Animação de carregamento da ajuda
  const spinner = ora('Carregando guia de ajuda...').start();
  spinner.succeed(chalk.green('Guia de ajuda pronto!'));
  console.log(generateCustomHelp());
  process.exit(0);
}

// Verificar se está solicitando a lista de tipos
// Verificar se está solicitando a lista de tipos
if (process.argv.includes('--types') || process.argv.includes('-t')) {
  const spinner = ora('Carregando tipos de commit...').start();
  spinner.succeed(chalk.green('Tipos de commit prontos!'));
  showCommitTypes();
  process.exit(0);
}
// Verificar se está solicitando a lista de escopos
// Verificar se está solicitando a lista de escopos
if (process.argv.includes('--scopes') || process.argv.includes('-s')) {
  const spinnerScopes = ora('Carregando escopos do projeto...').start();
  findPackageScopes(process.cwd())
    .then(scopes => {
      spinnerScopes.succeed(chalk.green('Escopos encontrados!'));
      // Exibir banner de escopos
      console.log(boxen(
        chalk.cyan.bold('DiffSense - Escopos de Pacotes') + '\n' +
        chalk.dim('Lista de pacotes (package.json) detectados no monorepo'),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
      ));
      // Criar tabela de escopos
      const scopesTable = new Table({
        head: [chalk.cyan('Escopo'), chalk.cyan('Diretório')],
        style: { head: [], border: [] },
        colWidths: [30, 60],
        wordWrap: true
      });
      scopes.forEach(s => scopesTable.push([chalk.green(s.name), s.dir]));
      console.log(scopesTable.toString());
      process.exit(0);
    })
    .catch(err => {
      spinnerScopes.fail(chalk.red('Erro ao carregar escopos'));
      console.error(err);
      process.exit(1);
    });
}

// Configurar o programa para o fluxo normal
program
  .name('diffsense')
  .description('Ferramenta de análise semântica de alterações e commits organizados')
  .option('-a, --analyzer', 'Executa apenas a análise e exibe o resultado')
  .option('-ac, --autoComplete', 'Realiza commits automáticos com descrições predefinidas')
  .option('-t, --types', 'Lista todos os tipos de commit suportados com descrições e exemplos')
  .option('-s, --scopes', 'Lista todos os escopos (package.json) encontrados no projeto')
  .version('1.0.0', '-v, --version', 'Exibe a versão atual da ferramenta')
  .helpOption('-h, --help', 'Exibe informações de ajuda sobre os comandos disponíveis')
  .addHelpCommand(false)
  .parse(process.argv);

const options = program.opts();

// Exibir banner do DiffSense
console.log(boxen(
  chalk.cyan.bold('DiffSense Commit') + '\n' +
  chalk.dim('Análise semântica de alterações e commit inteligente'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  }
));

async function run() {
  try {
    // Fluxo custom: commit de um único tipo via args
    const args = program.args;
    const validTypes = ['feat','fix','docs','refactor','test','chore'];
    if (args.length >= 2) {
      const typeArg = args[0];
      const isBreaking = typeArg.endsWith('!');
      const baseType = isBreaking ? typeArg.slice(0, -1) : typeArg;
      if (validTypes.includes(baseType)) {
        const description = args.slice(1).join(' ');
        await stageAllFiles();
        const analysisResult = await analyzeChanges();
        const shouldProceed = await confirmCommit();
        if (!shouldProceed) return;
        const filesOfType = analysisResult.files.filter(
          f => f.primaryType === baseType && f.isBreakingChange === isBreaking
        );
        if (filesOfType.length === 0) {
          console.log(chalk.yellow(`Nenhum arquivo do tipo ${baseType}${isBreaking ? '!' : ''}`));
          return;
        }
        if (isBreaking) {
          const { breakingDesc } = await inquirer.prompt([{
            type: 'input', name: 'breakingDesc',
            message: chalk.red('Descreva o breaking change:'),
            validate: input => input ? true : 'Descrição obrigatória'
          }]);
          await commitBreakingChange(`${baseType}!`, filesOfType, description, breakingDesc);
        } else {
          await commitFiles(baseType, filesOfType, description);
        }
        return;
      }
    }
    // Etapa 1: Adicionar arquivos ao stage
    await stageAllFiles();
  // Etapa 2: Analisar alterações
  const analysisResult = await analyzeChanges();
    
  // Etapa 3.1: Verificar se é apenas para análise
    if (options.analyzer) {
      // Agrupar arquivos por escopo
      const scopes = await findPackageScopes(process.cwd());
      const filePaths = analysisResult.files.map(f => f.filePath);
      const grouped = classifyFilesByScope(filePaths, scopes);
      for (const [scope, fps] of Object.entries(grouped)) {
        if (fps.length === 0) continue;
        console.log(chalk.bold(`\nEscopo: ${scope}`));
        const table = new Table({
          head: [chalk.cyan('Arquivo'), chalk.cyan('Tipo'), chalk.cyan('+/-'), chalk.cyan('Status')],
          style: { head: [], border: [] },
          wordWrap: true
        });
        fps.forEach(fp => {
          const f = analysisResult.files.find(x => x.filePath === fp);
          table.push([
            fp,
            f.primaryType || '',
            `+${f.additions||0}/-${f.deletions||0}`,
            f.status || ''
          ]);
        });
        console.log(table.toString());
      }
      return;
    }
    // Exibir agrupamento por escopos antes do commit
    const allScopes = await findPackageScopes(process.cwd());
    const allPaths = analysisResult.files.map(f => f.filePath);
    const scopeGroups = classifyFilesByScope(allPaths, allScopes);
    console.log(boxen(
      chalk.cyan.bold('DiffSense - Resumo de Alterações por Escopo'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
    ));
    for (const [scope, fps] of Object.entries(scopeGroups)) {
      if (!fps.length) continue;
      console.log(chalk.bold(`\nEscopo: ${scope}`));
      const tbl = new Table({
        head: [chalk.cyan('Arquivo'), chalk.cyan('Tipo'), chalk.cyan('+/-')],
        style: { head: [], border: [] },
        wordWrap: true
      });
      fps.forEach(fp => {
        const file = analysisResult.files.find(x => x.filePath === fp);
        tbl.push([
          fp,
          file.primaryType || '',
          `+${file.additions || 0}/-${file.deletions || 0}`
        ]);
      });
      console.log(tbl.toString());
    }
    
    // Etapa 3.2 e 4: Confirmar commit
    const shouldProceed = await confirmCommit();
    
    if (!shouldProceed) {
      console.log(chalk.yellow('Operação de commit cancelada pelo usuário.'));
      return;
    }
    
    // Etapa 5 e 6: Realizar commits por tipo
    await commitByTypes(analysisResult, options.autoComplete || false);
    
    console.log(chalk.green.bold('\n✨ Processo de commit concluído com sucesso!'));
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Erro: ${error.message || 'Ocorreu um erro desconhecido.'}`));
    console.error(chalk.dim(error.stack));
    process.exit(1);
  }
}

// Executar o fluxo
run();
