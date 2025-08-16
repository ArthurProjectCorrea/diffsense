/**
 * Módulo de análise de código
 * Responsável por analisar alterações e exibir resultados
 */

import { analyzeChanges } from '../../dist/index.js';
import { ResultFormatter } from '../../dist/utils/formatter.js';
import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

/**
 * Executa análise de alterações entre referências Git
 * @param {Object} options - Opções de configuração
 * @param {string} options.base - Referência base para comparação
 * @param {string} options.head - Referência alvo para comparação
 * @param {boolean} options.json - Se deve exibir resultado em formato JSON
 * @param {boolean} options.verbose - Se deve exibir informações detalhadas
 * @returns {Promise<Object>} Resultado da análise
 */
export async function executeAnalysis(options) {
  console.log(chalk.blue('🔍 Analisando alterações...'));
  console.log(chalk.yellow('⚠️  Nota: Todos os arquivos serão adicionados ao stage (git add .) para garantir análise completa.'));
  
  const result = await analyzeChanges(options.base, options.head);
  
  if (options.json) {
    // Saída em formato JSON
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Saída formatada para o console
    const formatter = new ResultFormatter();
    const output = formatter.format(result);
    console.log(output);
  }
  
  return result;
}
