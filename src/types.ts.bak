/**
 * Types for DiffSense
 */

/**
 * File change status
 */
export type FileStatus = 'added' | 'modified' | 'renamed' | 'deleted';

/**
 * Represents a file change
 */
export interface FileChange {
  /**
   * Current path of the file
   */
  path: string;
  
  /**
   * Status of the change
   */
  status: FileStatus;
  
  /**
   * Previous path of the file (if applicable, for rename or move)
   */
  previousPath: string;
}

/**
 * Impact level of a semantic change
 */
export type ImpactLevel = 'minor' | 'moderate' | 'major';

/**
 * Represents a semantic change in code
 */
export interface ISemanticChange {
  /**
   * Type of semantic change
   */
  type: string;
  
  /**
   * Description of the change
   */
  description: string;
  
  /**
   * Optional: Items affected by the change
   */
  items?: string[];
}

/**
 * Result of semantic analysis on a file
 */
export interface ISemanticAnalysis {
  /**
   * Path to the file
   */
  file: string;
  
  /**
   * List of semantic changes detected
   */
  semanticChanges: ISemanticChange[];
  
  /**
   * Impact level of the changes
   */
  impact: ImpactLevel;
  
  /**
   * Summary of the changes
   */
  summary: string;
  
  /**
   * Optional: Additional details about the changes
   */
  details?: Record<string, any>;
}

/**
 * Represents a commit suggestion
 */
export interface ICommitSuggestion {
  /**
   * Type of the commit (feat, fix, docs, etc.)
   */
  type: string;
  
  /**
   * Scope of the commit (optional)
   */
  scope?: string;
  
  /**
   * Short description of the commit
   */
  description: string;
  
  /**
   * Body of the commit (optional)
   */
  body?: string;
  
  /**
   * Footer of the commit (optional)
   */
  footer?: string;
}

/**
 * Format of the generated report
 */
export interface IReport {
  /**
   * Summary of changes
   */
  summary: string;
  
  /**
   * List of semantic analyses
   */
  analyses: ISemanticAnalysis[];
  
  /**
   * Suggested commit message
   */
  commitSuggestion: ICommitSuggestion;
}
