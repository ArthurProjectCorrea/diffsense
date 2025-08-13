import { Project } from 'ts-morph';
import { Dependency } from '../types/index.js';
import path from 'path';

/**
 * Classe para análise de dependências entre arquivos
 * Constrói um grafo de dependências do código
 */
export class DependencyGraph {
  private project: Project;
  
  constructor() {
    this.project = new Project();
  }
  
  /**
   * Adiciona arquivos ao projeto para análise
   * @param files Caminhos dos arquivos a serem analisados
   */
  public async addFilesToProject(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        this.project.addSourceFileAtPath(file);
      } catch (error) {
        console.warn(`Erro ao adicionar arquivo ${file} ao projeto:`, error);
      }
    }
  }
  
  /**
   * Analisa as dependências entre os arquivos do projeto
   * @returns Mapa de dependências entre arquivos
   */
  public analyzeDependencies(): Map<string, Dependency[]> {
    const dependencies = new Map<string, Dependency[]>();
    const sourceFiles = this.project.getSourceFiles();
    
    sourceFiles.forEach(sourceFile => {
      const filePath = sourceFile.getFilePath();
      
      // Analisa imports
      const imports = sourceFile.getImportDeclarations();
      
      imports.forEach(importDecl => {
        try {
          const moduleSpecifier = importDecl.getModuleSpecifierValue();
          // Ignorar imports de bibliotecas externas
          if (moduleSpecifier.startsWith('.')) {
            const importPath = this.resolveImportPath(moduleSpecifier, filePath);
            
            const namedImports = importDecl.getNamedImports().map(ni => ni.getName());
            
            const dependency: Dependency = {
              from: filePath,
              to: importPath,
              type: 'import',
              symbols: namedImports.length > 0 ? namedImports : undefined
            };
            
            if (dependencies.has(filePath)) {
              dependencies.get(filePath)?.push(dependency);
            } else {
              dependencies.set(filePath, [dependency]);
            }
          }
        } catch (error) {
          console.warn(`Erro ao analisar import em ${filePath}:`, error);
        }
      });
      
      // Analisar classes e suas relações de herança
      const classes = sourceFile.getClasses();
      
      classes.forEach(classDecl => {
        try {
          const _className = classDecl.getName() || 'AnonymousClass';
          
          // Verificar herança
          const heritageClauses = classDecl.getHeritageClauses();
          
          heritageClauses.forEach(clause => {
            clause.getTypeNodes().forEach(typeNode => {
              try {
                const typeName = typeNode.getText();
                
                // Simplificando a análise para não usar language service
                // Apenas registramos o nome do tipo como possível dependência
                
                // Em uma implementação real, precisaríamos resolver o arquivo
                // onde o tipo é definido, mas isso é complexo sem language service
                
                const dependency: Dependency = {
                  from: filePath,
                  to: `${typeName}.ts`, // Simplificação
                  type: 'uses',
                  symbols: [typeName]
                };
                
                if (dependencies.has(filePath)) {
                  dependencies.get(filePath)?.push(dependency);
                } else {
                  dependencies.set(filePath, [dependency]);
                }
              } catch (error) {
                console.warn(`Erro ao analisar herança em ${filePath}:`, error);
              }
            });
          });
        } catch (error) {
          console.warn(`Erro ao analisar classe em ${filePath}:`, error);
        }
      });
    });
    
    return dependencies;
  }
  
  /**
   * Constrói um grafo de dependências entre arquivos
   * @param changes Lista de arquivos a analisar
   * @returns Grafo de dependências
   */
  public async buildDependencyGraph(filePaths: string[]): Promise<Record<string, Record<string, Dependency>>> {
    await this.addFilesToProject(filePaths);
    
    const dependenciesMap = this.analyzeDependencies();
    const graph: Record<string, Record<string, Dependency>> = {};
    
    dependenciesMap.forEach((deps, _file) => {
      deps.forEach(dep => {
        if (!graph[dep.to]) {
          graph[dep.to] = {};
        }
        
        graph[dep.to][dep.from] = dep;
      });
    });
    
    return graph;
  }
  
  /**
   * Resolve o caminho de um import relativo
   * @param moduleSpecifier Especificador do módulo
   * @param basePath Caminho base
   * @returns Caminho resolvido
   */
  private resolveImportPath(moduleSpecifier: string, basePath: string): string {
    const baseDir = path.dirname(basePath);
    
    // Adicionar extensão se necessário
    let resolvedPath = path.resolve(baseDir, moduleSpecifier);
    if (!path.extname(resolvedPath)) {
      resolvedPath += '.ts';
    }
    
    return resolvedPath;
  }
}
