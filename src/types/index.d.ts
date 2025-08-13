/**
 * Tipos principais usados pelo framework DiffSense
 */

/**
 * Representa um arquivo alterado e suas informações
 */
export interface Change {
  /** Caminho do arquivo */
  filePath: string;
  
  /** Tipo de alteração */
  type: ChangeType;
  
  /** Conteúdo antes da alteração (pode ser vazio se for arquivo novo) */
  oldContent?: string;
  
  /** Conteúdo após a alteração (pode ser vazio se arquivo foi removido) */
  newContent?: string;
  
  /** Metadados relacionados à alteração */
  metadata: ChangeMetadata;
}

/**
 * Tipos possíveis de alteração
 */
export enum ChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed'
}

/**
 * Interface para alteração com informações adicionais
 */
export interface ExtendedChange {
  path?: string;
  type?: ChangeType;
  additions: number;
  deletions: number;
  hunks: CodeHunk[];
  score?: number;
  description?: string;
}

// Interface para um trecho de código alterado
export interface CodeHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

// Interface para uma regra de classificação
export interface Rule {
  id: string;
  match?: string;
  match_ast?: string;
  match_path?: string;
  type?: ChangeType;
  reason?: string;
  heuristics?: RuleHeuristic[];
}

// Interface para uma heurística de regra
export interface RuleHeuristic {
  if: string;
  set: ChangeType;
}

// Interface para configuração do DiffSense
export interface DiffSenseConfig {
  rules?: Rule[];
  excludePaths?: string[];
  includeOnly?: string[];
  verboseOutput?: boolean;
}
