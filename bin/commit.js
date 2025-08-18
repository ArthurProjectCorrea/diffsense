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

// Configurando commander para CLI
const program = new Command();

// Importando biblioteca para tabelas de linha de comando
import Table from 'cli-table3';

// Função para gerar o texto de ajuda personalizado com estilo tabular mais compacto
function generateCustomHelp() {
  let output = '';
  
  // Cabeçalho principal com linha superior para destaque
  output += chalk.cyan('====================================================\n');
  output += chalk.cyan.bold('DiffSense Commit - ') + chalk.dim('v1.0.0') + '\n';
  output += chalk.dim('Análise semântica de alterações e commit inteligente') + '\n';
  output += chalk.cyan('====================================================\n');
  
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
    [chalk.green('-ac, --autoComplete'), 'Realiza commits automáticos com descrições predefinidas baseadas na análise'],
    [chalk.green('-v, --version'), 'Exibe a versão atual da ferramenta'],
    [chalk.green('-h, --help'), 'Exibe este guia de ajuda']
  );
  
  output += optionsTable.toString() + '\n\n';
  
  // Tabela de exemplos com o mesmo estilo das tabelas de análise
  output += chalk.bold('💡 EXEMPLOS:\n');
  
  const examplesTable = new Table({
    head: [chalk.cyan('Comando'), chalk.cyan('Descrição')],
    style: { head: [], border: [] },
    wordWrap: true
  });
  
  examplesTable.push(
    [chalk.yellow('$ diffsense'), 'Fluxo padrão interativo de commit'],
    [chalk.yellow('$ diffsense --analyzer'), 'Apenas analisar alterações sem fazer commit'],
    [chalk.yellow('$ diffsense --autoComplete'), 'Realizar commits automáticos com descrições geradas']
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
  // Exibir ajuda personalizada e sair
  console.log(generateCustomHelp());
  process.exit(0);
}

// Configurar o programa para o fluxo normal
program
  .name('diffsense')
  .description('Ferramenta de análise semântica de alterações e commits organizados')
  .option('-a, --analyzer', 'Executa apenas a análise e exibe o resultado')
  .option('-ac, --autoComplete', 'Realiza commits automáticos com descrições predefinidas')
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
    // Etapa 1: Adicionar arquivos ao stage
    await stageAllFiles();

    // Etapa 2: Analisar alterações
    const analysisResult = await analyzeChanges();
    
    // Etapa 3.1: Verificar se é apenas para análise
    if (options.analyzer) {
      console.log(chalk.yellow('Modo de análise. Finalizando sem realizar commits.'));
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
