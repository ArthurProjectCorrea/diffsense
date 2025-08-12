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
 * Metadados relacionados a uma alteração
 */
export interface ChangeMetadata {
  /** Número de linhas adicionadas */
  linesAdded: number;
  
  /** Número de linhas removidas */
  linesRemoved: number;
  
  /** Informação adicional dependendo do tipo de arquivo */
  fileType?: string;
  
  /** Se a alteração é binária ou textual */
  isBinary?: boolean;
  
  /** Dados adicionais específicos ao tipo de arquivo */
  extraData?: Record<string, any>;
}

/**
 * Interface para um trecho de código alterado (hunk)
 */
export interface CodeHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  
  /** Linhas adicionadas */
  addedLines: string[];
  
  /** Linhas removidas */
  removedLines: string[];
}

/**
 * Representa um contexto de alteração com informações adicionais
 */
export interface ContextualizedChange extends Change {
  /** Arquivos relacionados */
  relatedFiles: string[];
  
  /** Imports/exports afetados */
  dependencies: Dependency[];
  
  /** Escopo da alteração (ex: API pública, interna, testes) */
  scope?: string;
  
  /** Hunks de código */
  hunks: CodeHunk[];
}

/**
 * Representa uma dependência entre arquivos
 */
export interface Dependency {
  /** Caminho do arquivo que importa */
  from: string;
  
  /** Caminho do arquivo importado */
  to: string;
  
  /** Tipo da dependência */
  type: 'import' | 'export' | 'uses';
  
  /** Símbolos específicos importados/exportados */
  symbols?: string[];
}

/**
 * Representa uma alteração após análise semântica
 */
export interface SemanticChange extends ContextualizedChange {
  /** Alterações semânticas detectadas */
  semanticChanges: SemanticDelta[];
  
  /** Identificadores/símbolos afetados */
  affectedSymbols: string[];
}

/**
 * Representa uma mudança semântica específica
 */
export interface SemanticDelta {
  /** Tipo de mudança semântica */
  type: SemanticChangeType;
  
  /** Descrição da mudança */
  description: string;
  
  /** Nível de gravidade da mudança */
  severity: 'low' | 'medium' | 'high' | 'breaking';
  
  /** Símbolo ou identificador afetado */
  affectedSymbol?: string;
}

/**
 * Tipos possíveis de mudanças semânticas
 */
export enum SemanticChangeType {
  METHOD_ADDED = 'method-added',
  METHOD_REMOVED = 'method-removed',
  PARAMETER_ADDED = 'parameter-added',
  PARAMETER_REMOVED = 'parameter-removed',
  RETURN_TYPE_CHANGED = 'return-type-changed',
  INTERFACE_CHANGED = 'interface-changed',
  TYPE_CHANGED = 'type-changed',
  ACCESS_MODIFIER_CHANGED = 'access-modifier-changed',
  DEPENDENCY_ADDED = 'dependency-added',
  DEPENDENCY_REMOVED = 'dependency-removed',
  IMPLEMENTATION_CHANGED = 'implementation-changed'
}

/**
 * Interface para uma regra de classificação
 */
export interface Rule {
  id: string;
  match?: string;
  match_ast?: string;
  match_path?: string;
  type?: CommitType;
  reason?: string;
  heuristics?: RuleHeuristic[];
}

/**
 * Interface para uma heurística de regra
 */
export interface RuleHeuristic {
  if: string;
  set: CommitType;
}

/**
 * Tipos de commit semântico
 */
export type CommitType = 'feat' | 'fix' | 'chore' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'revert';

/**
 * Representa uma alteração classificada após a aplicação de regras
 */
export interface ClassifiedChange extends SemanticChange {
  /** Tipo de commit semântico */
  commitType?: CommitType;
  
  /** Escopo do commit semântico */
  commitScope?: string;
  
  /** Se a mudança introduz uma quebra de compatibilidade */
  breaking: boolean;
  
  /** Regras que foram aplicadas */
  appliedRules: string[];
  
  /** Descrição automática gerada */
  description?: string;
}

/**
 * Representa uma mudança pontuada por impacto
 */
export interface ScoredChange extends ClassifiedChange {
  /** Pontuação de impacto */
  score: number;
  
  /** Fatores que influenciaram a pontuação */
  scoreFactors: {
    name: string;
    value: number;
    weight: number;
  }[];
}

/**
 * Interface para configuração do DiffSense
 */
export interface DiffSenseConfig {
  rules?: Rule[];
  excludePaths?: string[];
  includeOnly?: string[];
  verboseOutput?: boolean;
  customScoring?: Record<string, number>;
}

/**
 * Opções para execução da análise
 */
export interface AnalysisOptions {
  /** Formato de saída do relatório */
  format?: 'json' | 'markdown' | 'cli';
  
  /** Caminho para configuração personalizada */
  configPath?: string;
  
  /** Se deve gerar commits automaticamente */
  autoCommit?: boolean;
  
  /** Opções específicas para cada módulo */
  modules?: {
    changeDetector?: Record<string, any>;
    contextCorrelator?: Record<string, any>;
    semanticAnalyzer?: Record<string, any>;
    rulesEngine?: Record<string, any>;
    scoring?: Record<string, any>;
    reporter?: Record<string, any>;
  };
}

/**
 * Resultado da análise
 */
export interface AnalysisResult {
  /** Alterações processadas com pontuação */
  changes: ScoredChange[];
  
  /** Relatório gerado */
  report: string;
  
  /** Sugestão de commit */
  suggestedCommit?: {
    type: string;
    scope?: string;
    subject: string;
    body?: string;
    breaking: boolean;
  };
}
