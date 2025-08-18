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
    [chalk.green('-ac, --autoComplete'), 'Realiza commits automáticos com descrições predefinidas baseadas na análise (inclui tratamento automático para breaking changes)'],
    [chalk.green('-t, --types'), 'Lista todos os tipos de commit suportados com descrições e exemplos'],
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
    [chalk.yellow('$ diffsense --types'), 'Listar todos os tipos de commit suportados']
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
if (process.argv.includes('--types') || process.argv.includes('-t')) {
  // Animação de carregamento dos tipos de commit
  const spinner = ora('Carregando tipos de commit...').start();
  spinner.succeed(chalk.green('Tipos de commit prontos!'));
  showCommitTypes();
  process.exit(0);
}

// Configurar o programa para o fluxo normal
program
  .name('diffsense')
  .description('Ferramenta de análise semântica de alterações e commits organizados')
  .option('-a, --analyzer', 'Executa apenas a análise e exibe o resultado')
  .option('-ac, --autoComplete', 'Realiza commits automáticos com descrições predefinidas')
  .option('-t, --types', 'Lista todos os tipos de commit suportados com descrições e exemplos')
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
      // Banner indicando execução no modo análise
      console.log(
        boxen(
          chalk.yellow('Modo Análise') + '\n' + chalk.dim('Nenhum commit foi realizado.'),
          { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'yellow' }
        )
      );
      return;
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
