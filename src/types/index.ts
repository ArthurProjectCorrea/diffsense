/**
 * Tipos de classificação de alterações
 */
export enum ChangeType {
  FEAT = 'feat',
  FIX = 'fix',
  DOCS = 'docs',
  REFACTOR = 'refactor',
  TEST = 'test',
  CHORE = 'chore',
}

/**
 * Estado de um arquivo no git
 */
export enum FileStatus {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed',
  UNMODIFIED = 'unmodified',
}

/**
 * Prioridade dos tipos de alteração (quanto menor o número, maior a prioridade)
 */
export const CHANGE_PRIORITY: Record<ChangeType, number> = {
  [ChangeType.FEAT]: 1,     // Nova funcionalidade tem a maior prioridade
  [ChangeType.FIX]: 2,      // Correção de bugs tem a segunda maior prioridade
  [ChangeType.REFACTOR]: 3, // Refatoração tem prioridade média
  [ChangeType.TEST]: 4,     // Alterações de testes têm prioridade mais baixa
  [ChangeType.DOCS]: 5,     // Documentação tem prioridade ainda mais baixa
  [ChangeType.CHORE]: 6,    // Tarefas de manutenção têm a menor prioridade
};

/**
 * Representa uma alteração detectada em um arquivo
 */
export interface FileChange {
  filePath: string;
  changeTypes: ChangeType[];
  diff: string;
  primaryType?: ChangeType;
  status?: FileStatus;
  additions?: number;
  deletions?: number;
  isBreakingChange?: boolean;   // Indica se a alteração representa uma quebra de compatibilidade
  breakingChangeReason?: string; // Razão pela qual foi classificada como breaking change
}

/**
 * Resultado da análise de alterações
 */
export interface AnalysisResult {
  files: FileChange[];
  summary: {
    [key in ChangeType]?: number;
  };
  primaryType: ChangeType;
  baseBranch?: string;
  headBranch?: string;
  hasBreakingChanges: boolean;  // Indica se há quebras de compatibilidade no conjunto de alterações
  breakingChanges: FileChange[]; // Lista de alterações que são breaking changes
}
