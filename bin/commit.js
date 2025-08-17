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

program
  .name('diffsense commit')
  .description('Realiza commits inteligentes baseados em análise semântica de alterações')
  .option('-a, --analyzer', 'Executa apenas a análise e exibe o resultado')
  .option('-ac, --autoComplete', 'Realiza commits automáticos com descrições predefinidas')
  .version('1.0.0')
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
