/**
 * Módulo para análise de alterações usando o DiffSense
 */
import ora from 'ora';
import chalk from 'chalk';
import boxen from 'boxen';
import { analyzeChanges as analyze } from '../../dist/index.js';
import { ResultFormatter } from '../../dist/utils/formatter.js';

/**
 * Analisa as alterações no repositório
 * @returns {Promise<Object>} Resultado da análise
 */
export async function analyzeChanges() {
  const spinner = ora('🔍 Analisando alterações...').start();
  
  try {
    // Analisar as alterações entre HEAD^ (commit anterior) e HEAD (estado atual)
    const result = await analyze('HEAD^', 'HEAD');
    // Concluir spinner e exibir banner padronizado de conclusão
    spinner.stop();
    console.log(
      boxen(
        chalk.green.bold(`Análise concluída: ${result.files.length} arquivos analisados`),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
      )
    );
    // Exibir resultado da análise formatado
    const formatter = new ResultFormatter();
    console.log(formatter.format(result));
    return result;
  } catch (error) {
    spinner.fail('❌ Erro na análise');
    console.error(chalk.red('Erro durante análise:'), error.message);
    throw new Error('Falha ao analisar alterações');
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
      console.log(chalk.yellow(`Arquivo sem tipo primário: ${file.filePath}`));
      continue;
    }
    
    if (!filesByType[file.primaryType]) {
      filesByType[file.primaryType] = [];
    }
    
    filesByType[file.primaryType].push(file);
  }
  
  return filesByType;
}
