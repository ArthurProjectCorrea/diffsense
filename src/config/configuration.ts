/**
 * Interface for DiffSense configuration.
 */
export interface IConfiguration {
  /**
   * Base directory for project
   */
  baseDir: string;
  
  /**
   * Output directory for reports
   */
  outDir: string;
  
  /**
   * Paths to ignore when analyzing changes
   */
  ignorePaths: string[];
  
  /**
   * Whether to use context correlation when analyzing changes
   */
  useContextCorrelation: boolean;
}
