/**
 * Módulo principal de comandos CLI
 * Integra funcionalidades de análise e commit
 */

import { runCommitProcess } from '../commit/index.js';
import { executeAnalysis } from './analyzer.js';
import { handleError, showBanner } from '../cli-template.js';

/**
 * Executa o comando principal baseado nas opções fornecidas
 * @param {Object} options - Opções de linha de comando
 * @returns {Promise<void>}
 */
export async function executeCommand(options) {
  try {
    // Determinar o modo e mostrar banner apropriado se não for modo silencioso
    const isAnalyzerMode = options.analyzer;
    const silentMode = options.autoComplete || options.json;
    
    if (!silentMode) {
      showBanner(
        isAnalyzerMode ? 'Análise de Alterações' : 'Commit Inteligente',
        isAnalyzerMode 
          ? 'Análise detalhada de mudanças no código' 
          : '✨ Ferramenta para commits semânticos automatizados ✨',
        false // Não mostrar o header grande para uma interface mais limpa
      );
    }
    
    // Determinar modo de operação baseado nas opções
    if (isAnalyzerMode) {
      // Modo analisador - apenas exibe análise sem commit
      return await executeAnalysis(options);
    } else {
      // Modo commit - análise + commit
      return await runCommitProcess(options);
    }
  } catch (error) {
    handleError(error, options.verbose);
  }
}
