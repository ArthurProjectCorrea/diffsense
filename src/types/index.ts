/**
 * Main types used by the DiffSense framework
 */

/**
 * Represents a changed file and its information
 */
export interface Change {
  /** Path to the file */
  filePath: string;
  
  /** Type of change */
  type: ChangeType;
  
  /** Content before the change (can be empty if file is new) */
  oldContent?: string;
  
  /** Content after the change (can be empty if file was deleted) */
  newContent?: string;
  
  /** Metadata related to the change */
  metadata: ChangeMetadata;
}

/**
 * Possible types of change
 */
export enum ChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed'
}

/**
 * Metadata related to a change
 */
export interface ChangeMetadata {
  /** Number of lines added */
  linesAdded: number;
  
  /** Number of lines removed */
  linesRemoved: number;
  
  /** Additional information depending on file type */
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
 * - feat: novas funcionalidades
 * - fix: correções de bugs
 * - docs: alterações em documentação
 * - refactor: refatorações de código
 * - test: adição ou modificação de testes
 * - chore: alterações que não entram no versionamento (configs, scripts, etc)
 */
export type CommitType = 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore';

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
