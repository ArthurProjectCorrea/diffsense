// Módulo para análise de alterações no código
import ora from 'ora';
import chalk from 'chalk';
import { analyzeChanges } from '../../dist/index.js';
import { ResultFormatter } from '../../dist/utils/formatter.js';

/**
 * Analisa as alterações no repositório
 * @param {Object} options - Opções de configuração
 * @param {string} options.base - Referência base para comparação
 * @param {string} options.head - Referência para comparação
 * @param {boolean} options.debug - Modo de depuração
 * @returns {Promise<Object>} Resultado da análise
 */
export async function analyzeRepo(options) {
  const spinner = ora('🔍 Analisando alterações...').start();
  console.log('⚠️  Nota: Todos os arquivos serão adicionados ao stage (git add .) para garantir análise completa.');
  
  // Analisar as alterações
  console.log(`Chamando analyzeChanges com base=${options.base}, head=${options.head}`);
  try {
    const result = await analyzeChanges(options.base, options.head);
    console.log('Análise concluída com sucesso');
    spinner.succeed('✅ Análise concluída!');
    
    // Exibir o resultado da análise
    const formatter = new ResultFormatter();
    const output = formatter.format(result);
    console.log(output);
    
    return result;
  } catch (error) {
    console.error('Erro durante analyzeChanges:', error);
    spinner.fail('❌ Erro na análise');
    throw error;
  }
}

/**
 * Agrupa arquivos por tipo de alteração
 * @param {Array} files - Lista de arquivos analisados
 * @returns {Object} Arquivos agrupados por tipo
 */
export function groupFilesByType(files) {
  const filesByType = {};
  
  for (const file of files) {
    if (!file.primaryType) {
      console.log(`Arquivo sem tipo primário: ${file.filePath}`);
      continue;
    }
    
    if (!filesByType[file.primaryType]) {
      filesByType[file.primaryType] = [];
    }
    
    filesByType[file.primaryType].push(file);
  }
  
  return filesByType;
}
