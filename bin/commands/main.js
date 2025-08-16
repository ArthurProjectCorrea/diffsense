/**
 * Módulo principal de comandos CLI
 * Integra funcionalidades de análise e commit
 */

import { runCommitProcess } from '../commit/index.js';
import { executeAnalysis } from './analyzer.js';
import chalk from 'chalk';

/**
 * Executa o comando principal baseado nas opções fornecidas
 * @param {Object} options - Opções de linha de comando
 * @returns {Promise<void>}
 */
export async function executeCommand(options) {
  try {
    // Determinar modo de operação baseado nas opções
    if (options.analyzer) {
      // Modo analisador - apenas exibe análise sem commit
      return await executeAnalysis(options);
    } else {
      // Modo commit - análise + commit
      return await runCommitProcess(options);
    }
  } catch (error) {
    handleCommandError(error, options.verbose);
  }
}

/**
 * Gerencia erros de comando de forma padronizada
 * @param {Error} error - O erro capturado
 * @param {boolean} verbose - Se deve exibir detalhes adicionais
 */
export function handleCommandError(error, verbose = false) {
  console.error(chalk.red('\n❌ Erro:'), chalk.red(error instanceof Error ? error.message : String(error)));
  
  if (verbose && error instanceof Error && error.stack) {
    console.error(chalk.gray('\nStack trace:'));
    console.error(chalk.gray(error.stack));
  }
  
  process.exit(1);
}
