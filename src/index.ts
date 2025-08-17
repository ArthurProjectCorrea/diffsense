import { ChangeAnalyzer } from './core/change-analyzer.js';
import { AnalysisResult, ChangeType } from './types/index.js';

/**
 * Analisa as alterações entre duas referências Git
 * @param base Referência base (ex: 'main')
 * @param head Referência de comparação (ex: 'HEAD')
 * @returns Promise com o resultado da análise
 */
export async function analyzeChanges(base = 'HEAD^', head = 'HEAD'): Promise<AnalysisResult> {
  const analyzer = new ChangeAnalyzer();
  return await analyzer.analyzeChanges(base, head);
}

/**
 * Obtém a descrição para um tipo de alteração
 * @param type Tipo de alteração
 * @returns Descrição do tipo
 */
export function getChangeTypeDescription(type: ChangeType): string {
  const descriptions: Record<ChangeType, string> = {
    [ChangeType.FEAT]: 'Nova funcionalidade',
    [ChangeType.FIX]: 'Correção de bug',
    [ChangeType.DOCS]: 'Documentação',
    [ChangeType.REFACTOR]: 'Refatoração de código',
    [ChangeType.TEST]: 'Testes',
    [ChangeType.CHORE]: 'Tarefas de manutenção',
  };
  return descriptions[type] || 'Desconhecido';
}

// Exporta os tipos e utilidades
export { 
  ChangeType, 
  FileStatus,
  CHANGE_PRIORITY, 
  FileChange,
  AnalysisResult 
} from './types/index.js';
