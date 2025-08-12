import { Project, Node, SourceFile, SyntaxKind, ts } from 'ts-morph';
import path from 'path';
import { ISemanticAnalysis, FileChange } from '../types';
import { IConfiguration } from '../config/configuration';
import { DependencyGraph } from './dependency-graph.js';

/**
 * SemanticAnalyzer is responsible for analyzing the semantic meaning of code changes.
 * It uses ts-morph to parse TypeScript files and analyze their AST (Abstract Syntax Tree).
 */
export class SemanticAnalyzer {
  private project: Project;
  private dependencyGraph: DependencyGraph | null = null;
  private config: IConfiguration;

  /**
   * Creates a new instance of SemanticAnalyzer.
   * @param config Configuration for the analyzer
   */
  constructor(config: IConfiguration) {
    this.project = new Project({
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: false,
    });
    this.config = config;
  }

  /**
   * Analyzes changes in files and returns semantic analysis results.
   * @param fileChanges Array of file changes to analyze
   * @returns Promise resolving to semantic analysis results
   */
  public async analyzeChanges(fileChanges: FileChange[]): Promise<ISemanticAnalysis[]> {
    try {
      const results: ISemanticAnalysis[] = [];
      
      // Initialize dependency graph if needed
      if (this.config.useContextCorrelation && !this.dependencyGraph) {
        this.dependencyGraph = new DependencyGraph();
        // Adicionar arquivos ao projeto posteriormente
      }

      // Process each file change
      for (const change of fileChanges) {
        try {
          let analysis: ISemanticAnalysis | null = null;
          
          if (change.status === 'added') {
            analysis = await this.analyzeNewFile(change.path);
          } else if (change.status === 'modified') {
            analysis = await this.analyzeModifiedFile(change.path, change.previousPath);
          } else if (change.status === 'renamed') {
            analysis = await this.analyzeRenamedFile(change.path, change.previousPath);
          } else if (change.status === 'deleted') {
            analysis = await this.analyzeDeletedFile(change.previousPath);
          }
          
          if (analysis) {
            results.push(analysis);
          }
        } catch (fileError) {
          console.error(`Error analyzing file ${change.path}:`, fileError);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error during semantic analysis:', error);
      return [];
    }
  }

  /**
   * Analyzes a newly added file.
   * @param filePath Path to the new file
   * @returns Promise resolving to semantic analysis or null if analysis fails
   */
  private async analyzeNewFile(filePath: string): Promise<ISemanticAnalysis | null> {
    try {
      if (!this.isAnalyzableFile(filePath)) {
        return {
          file: filePath,
          semanticChanges: [],
          impact: 'minor',
          summary: `Added non-code file: ${path.basename(filePath)}`,
        };
      }

      const sourceFile = this.addFileToProject(filePath);
      if (!sourceFile) return null;

      const fileType = this.determineFileType(sourceFile);
      const exports = this.extractExports(sourceFile);
      const declarations = this.extractDeclarations(sourceFile);
      
      return {
        file: filePath,
        semanticChanges: [
          { type: 'file_added', description: `Added ${fileType}: ${path.basename(filePath)}` }
        ],
        impact: exports.length > 0 ? 'moderate' : 'minor',
        summary: `Added ${fileType} with ${declarations.length} declarations and ${exports.length} exports`,
        details: {
          exports,
          declarations
        }
      };
    } catch (error) {
      console.error(`Error analyzing new file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Analyzes a modified file by comparing with its previous version.
   * @param filePath Path to the current file
   * @param previousPath Path to the previous version of the file
   * @returns Promise resolving to semantic analysis or null if analysis fails
   */
  private async analyzeModifiedFile(filePath: string, previousPath: string): Promise<ISemanticAnalysis | null> {
    try {
      if (!this.isAnalyzableFile(filePath)) {
        return {
          file: filePath,
          semanticChanges: [],
          impact: 'minor',
          summary: `Modified non-code file: ${path.basename(filePath)}`,
        };
      }

      const currentFile = this.addFileToProject(filePath);
      const previousFile = previousPath ? this.addFileToProject(previousPath) : null;

      if (!currentFile) return null;
      
      // If we have both versions, compare them
      if (previousFile) {
        return this.compareFiles(currentFile, previousFile, filePath);
      }
      
      // If we don't have previous version, treat it as a new file
      return this.analyzeNewFile(filePath);
    } catch (error) {
      console.error(`Error analyzing modified file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Analyzes a renamed file.
   * @param newPath New path of the file
   * @param oldPath Previous path of the file
   * @returns Promise resolving to semantic analysis or null if analysis fails
   */
  private async analyzeRenamedFile(newPath: string, oldPath: string): Promise<ISemanticAnalysis | null> {
    try {
      if (!this.isAnalyzableFile(newPath)) {
        return {
          file: newPath,
          semanticChanges: [{ 
            type: 'file_renamed', 
            description: `Renamed from ${path.basename(oldPath)} to ${path.basename(newPath)}` 
          }],
          impact: 'minor',
          summary: `Renamed non-code file from ${path.basename(oldPath)} to ${path.basename(newPath)}`,
        };
      }

      // Add both files to project
      const newFile = this.addFileToProject(newPath);
      const oldFile = oldPath ? this.addFileToProject(oldPath) : null;
      
      if (!newFile) return null;

      // If content also changed, compare the files
      if (oldFile) {
        const comparison = await this.compareFiles(newFile, oldFile, newPath);
        if (comparison) {
          comparison.semanticChanges.unshift({ 
            type: 'file_renamed', 
            description: `Renamed from ${path.basename(oldPath)} to ${path.basename(newPath)}` 
          });
          return comparison;
        }
      }
      
      // If just a rename without content changes
      return {
        file: newPath,
        semanticChanges: [{ 
          type: 'file_renamed', 
          description: `Renamed from ${path.basename(oldPath)} to ${path.basename(newPath)}` 
        }],
        impact: 'moderate', // Renaming can break imports
        summary: `Renamed file from ${path.basename(oldPath)} to ${path.basename(newPath)}`,
      };
    } catch (error) {
      console.error(`Error analyzing renamed file ${newPath}:`, error);
      return null;
    }
  }

  /**
   * Analyzes a deleted file.
   * @param filePath Path to the deleted file
   * @returns Promise resolving to semantic analysis or null if analysis fails
   */
  private async analyzeDeletedFile(filePath: string): Promise<ISemanticAnalysis | null> {
    try {
      if (!this.isAnalyzableFile(filePath)) {
        return {
          file: filePath,
          semanticChanges: [],
          impact: 'minor',
          summary: `Deleted non-code file: ${path.basename(filePath)}`,
        };
      }

      // We try to analyze the old file if available
      const oldFile = filePath ? this.addFileToProject(filePath) : null;
      
      if (!oldFile) {
        return {
          file: filePath,
          semanticChanges: [{ type: 'file_deleted', description: `Deleted file: ${path.basename(filePath)}` }],
          impact: 'moderate',
          summary: `Deleted file: ${path.basename(filePath)}`,
        };
      }
      
      // Analyze exports to determine impact
      const exports = this.extractExports(oldFile);
      
      return {
        file: filePath,
        semanticChanges: [{ type: 'file_deleted', description: `Deleted file: ${path.basename(filePath)}` }],
        impact: exports.length > 0 ? 'major' : 'moderate',
        summary: `Deleted file with ${exports.length} exports: ${path.basename(filePath)}`,
        details: {
          exports
        }
      };
    } catch (error) {
      console.error(`Error analyzing deleted file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Compares two versions of a file to identify semantic changes.
   * @param currentFile Current version of the file
   * @param previousFile Previous version of the file
   * @param filePath Path to the current file
   * @returns Promise resolving to semantic analysis or null if analysis fails
   */
  private async compareFiles(currentFile: SourceFile, previousFile: SourceFile, filePath: string): Promise<ISemanticAnalysis | null> {
    try {
      const currentExports = this.extractExports(currentFile);
      const previousExports = this.extractExports(previousFile);
      
      const currentDeclarations = this.extractDeclarations(currentFile);
      const previousDeclarations = this.extractDeclarations(previousFile);
      
      // Analyze exports differences
      const addedExports = currentExports.filter(exp => !previousExports.includes(exp));
      const removedExports = previousExports.filter(exp => !currentExports.includes(exp));
      
      // Analyze declarations differences
      const addedDeclarations = currentDeclarations.filter(
        decl => !previousDeclarations.includes(decl)
      );
      const removedDeclarations = previousDeclarations.filter(
        decl => !currentDeclarations.includes(decl)
      );
      
      // Build semantic changes list
      const semanticChanges = [];
      
      if (addedExports.length > 0) {
        semanticChanges.push({
          type: 'exports_added',
          description: `Added exports: ${addedExports.join(', ')}`,
          items: addedExports
        });
      }
      
      if (removedExports.length > 0) {
        semanticChanges.push({
          type: 'exports_removed',
          description: `Removed exports: ${removedExports.join(', ')}`,
          items: removedExports
        });
      }
      
      if (addedDeclarations.length > 0) {
        semanticChanges.push({
          type: 'declarations_added',
          description: `Added declarations: ${addedDeclarations.join(', ')}`,
          items: addedDeclarations
        });
      }
      
      if (removedDeclarations.length > 0) {
        semanticChanges.push({
          type: 'declarations_removed',
          description: `Removed declarations: ${removedDeclarations.join(', ')}`,
          items: removedDeclarations
        });
      }
      
      // Determine impact level based on changes
      let impact: 'minor' | 'moderate' | 'major' = 'minor';
      if (removedExports.length > 0) {
        impact = 'major'; // Breaking change
      } else if (addedExports.length > 0 || removedDeclarations.length > 0) {
        impact = 'moderate';
      }
      
      // Create summary
      let summary = `Modified ${this.determineFileType(currentFile)}: ${path.basename(filePath)}`;
      if (semanticChanges.length > 0) {
        summary += ` with ${semanticChanges.length} semantic changes`;
      }
      
      return {
        file: filePath,
        semanticChanges,
        impact,
        summary,
        details: {
          addedExports,
          removedExports,
          addedDeclarations,
          removedDeclarations
        }
      };
    } catch (error) {
      console.error(`Error comparing files for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Adds a file to the ts-morph project.
   * @param filePath Path to the file
   * @returns SourceFile or null if the file cannot be added
   */
  private addFileToProject(filePath: string): SourceFile | null {
    try {
      // Check if file is already in project
      let sourceFile = this.project.getSourceFile(filePath);
      if (!sourceFile) {
        // Add file to project
        sourceFile = this.project.addSourceFileAtPath(filePath);
      }
      return sourceFile;
    } catch (error) {
      console.error(`Error adding file ${filePath} to project:`, error);
      return null;
    }
  }

  /**
   * Determines if a file is analyzable based on its extension.
   * @param filePath Path to the file
   * @returns Boolean indicating if the file is analyzable
   */
  private isAnalyzableFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  /**
   * Determines the type of file based on its content and name.
   * @param sourceFile SourceFile to analyze
   * @returns String describing the file type
   */
  private determineFileType(sourceFile: SourceFile): string {
    const fileName = path.basename(sourceFile.getFilePath()).toLowerCase();
    
    if (fileName.includes('test') || fileName.includes('spec')) {
      return 'test file';
    }
    
    const classes = sourceFile.getClasses();
    const interfaces = sourceFile.getInterfaces();
    const functions = sourceFile.getFunctions();
    const enums = sourceFile.getEnums();
    const typeAliases = sourceFile.getTypeAliases();
    
    if (interfaces.length > 0 && classes.length === 0 && functions.length === 0) {
      return 'interface definition';
    }
    
    if (typeAliases.length > 0 && classes.length === 0 && functions.length === 0) {
      return 'type definition';
    }
    
    if (enums.length > 0 && classes.length === 0 && functions.length === 0) {
      return 'enum definition';
    }
    
    if (classes.length > 0) {
      return 'class module';
    }
    
    if (functions.length > 0) {
      return 'function module';
    }
    
    // Check for React components
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      if (sourceFile.getFullText().includes('React')) {
        return 'React component';
      }
    }
    
    return 'module';
  }

  /**
   * Extracts export names from a source file.
   * @param sourceFile SourceFile to analyze
   * @returns Array of export names
   */
  private extractExports(sourceFile: SourceFile): string[] {
    try {
      const exports: string[] = [];
      
      // Get named exports
      const exportDeclarations = sourceFile.getExportDeclarations();
      exportDeclarations.forEach(exportDecl => {
        const namedExports = exportDecl.getNamedExports();
        namedExports.forEach(namedExport => {
          exports.push(namedExport.getName());
        });
      });
      
      // Get default export if exists
      const defaultExport = sourceFile.getDefaultExportSymbol();
      if (defaultExport) {
        exports.push('default');
      }
      
      // Get exported variables, functions, classes, interfaces, etc.
      const exportedDeclarations = sourceFile.getExportedDeclarations();
      exportedDeclarations.forEach((declarations, name) => {
        if (name !== 'default') {
          exports.push(name);
        }
      });
      
      return [...new Set(exports)]; // Remove duplicates
    } catch (error) {
      console.error('Error extracting exports:', error);
      return [];
    }
  }

  /**
   * Extracts declaration names from a source file.
   * @param sourceFile SourceFile to analyze
   * @returns Array of declaration names
   */
  private extractDeclarations(sourceFile: SourceFile): string[] {
    try {
      const declarations: string[] = [];
      
      // Classes
      sourceFile.getClasses().forEach(cls => {
        declarations.push(cls.getName() || '<anonymous class>');
      });
      
      // Interfaces
      sourceFile.getInterfaces().forEach(intf => {
        declarations.push(intf.getName());
      });
      
      // Functions
      sourceFile.getFunctions().forEach(func => {
        declarations.push(func.getName() || '<anonymous function>');
      });
      
      // Enums
      sourceFile.getEnums().forEach(enum_ => {
        declarations.push(enum_.getName());
      });
      
      // Type aliases
      sourceFile.getTypeAliases().forEach(type => {
        declarations.push(type.getName());
      });
      
      // Variables
      sourceFile.getVariableDeclarations().forEach(variable => {
        // Only include top-level variables
        if (variable.getParent()?.getParent()?.getKind() === SyntaxKind.SourceFile) {
          declarations.push(variable.getName());
        }
      });
      
      return [...new Set(declarations)]; // Remove duplicates
    } catch (error) {
      console.error('Error extracting declarations:', error);
      return [];
    }
  }
}
