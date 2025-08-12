import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';
import { Change, ContextualizedChange, Dependency, CodeHunk } from '../types/index.js';
import { DependencyGraph } from './dependency-graph.js';

/**
 * Responsável por correlacionar contextos entre arquivos e mudanças
 * Analisa as relações entre arquivos e enriquece as informações sobre mudanças
 */
export class ContextCorrelator {
  private project: Project;
  private dependencyGraph: DependencyGraph;
  private workingDir: string;

  constructor(workingDir?: string) {
    this.workingDir = workingDir || process.cwd();
    this.project = new Project();
    this.dependencyGraph = new DependencyGraph();
  }

  /**
   * Correlaciona contextos entre arquivos e enriquece informações sobre mudanças
   */
  async correlateChanges(changes: Change[], graph?: any): Promise<ContextualizedChange[]> {
    console.log('Correlacionando contexto entre mudanças...');
    
    // Adicionar os arquivos ao projeto ts-morph
    this.addFilesToProject(changes);
    
    // Construir grafo de dependências se não foi fornecido
    if (!graph) {
      const files = changes.map(change => change.filePath);
      graph = await this.dependencyGraph.buildDependencyGraph(files);
    }
    
    // Converter para mudanças contextualizadas
    return changes.map(change => this.contextualizeChange(change, graph));
  }
  
  /**
   * Adiciona arquivos ao projeto ts-morph para análise
   */
  private addFilesToProject(changes: Change[]): void {
    // Limpar projeto anterior
    this.project.getSourceFiles().forEach(file => this.project.removeSourceFile(file));
    
    // Adicionar somente arquivos de código
    changes.forEach(change => {
      const filePath = change.filePath;
      const isCodeFile = this.isCodeFile(filePath);
      
      if (isCodeFile && change.newContent) {
        try {
          this.project.createSourceFile(filePath, change.newContent, { overwrite: true });
        } catch (error) {
          console.warn(`Não foi possível adicionar o arquivo ${filePath} ao projeto:`, error);
        }
      }
    });
  }
  
  /**
   * Verifica se um arquivo é um arquivo de código fonte
   */
  private isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
  }
  
  /**
   * Contextualiza uma mudança com informações adicionais
   */
  private contextualizeChange(change: Change, graph: any): ContextualizedChange {
    // Extrair hunks (trechos modificados) do código
    const hunks = this.extractHunks(change);
    
    // Identificar arquivos relacionados
    const relatedFiles = this.findRelatedFiles(change.filePath, graph);
    
    // Descobrir dependências
    const dependencies = this.discoverDependencies(change.filePath);
    
    // Determinar escopo da mudança
    const scope = this.determineScope(change.filePath);
    
    return {
      ...change,
      hunks,
      relatedFiles,
      dependencies,
      scope
    };
  }
  
  /**
   * Extrai hunks (trechos modificados) de uma mudança
   */
  private extractHunks(change: Change): CodeHunk[] {
    if (!change.oldContent || !change.newContent) {
      return [];
    }
    
    // Implementação simples de extração de hunks
    // Uma implementação real usaria um algoritmo de diff mais sofisticado
    const oldLines = change.oldContent.split('\n');
    const newLines = change.newContent.split('\n');
    
    // Este é um exemplo muito básico que cria um único hunk
    // Uma implementação real usaria um algoritmo de diff que identifica múltiplos hunks
    const hunk: CodeHunk = {
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
      content: change.newContent,
      addedLines: newLines.filter(
        (line, i) => i >= oldLines.length || line !== oldLines[i]
      ),
      removedLines: oldLines.filter(
        (line, i) => i >= newLines.length || line !== newLines[i]
      )
    };
    
    return [hunk];
  }
  
  /**
   * Encontra arquivos relacionados a um arquivo específico
   */
  private findRelatedFiles(filePath: string, graph: any): string[] {
    // Se o arquivo estiver no grafo, retorne os arquivos relacionados
    if (graph && graph[filePath]) {
      return Object.keys(graph[filePath]);
    }
    
    // Caso contrário, tente encontrar relacionamentos baseados em convenções
    const relatedFiles: string[] = [];
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);
    
    // Se for um arquivo de código, procure por testes relacionados
    if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
      const possibleTestNames = [
        path.join(dirName, `${baseName}.spec${ext}`),
        path.join(dirName, `${baseName}.test${ext}`),
        path.join('tests', 'unit', `${baseName}.spec${ext}`),
        path.join('tests', 'unit', `${baseName}.test${ext}`)
      ];
      
      // Adicionar possíveis arquivos de teste (não verificamos se existem)
      relatedFiles.push(...possibleTestNames);
    }
    
    // Se for um teste, tente encontrar o arquivo de implementação
    if (filePath.includes('.spec.') || filePath.includes('.test.')) {
      const implName = filePath
        .replace('.spec.', '.')
        .replace('.test.', '.');
        
      relatedFiles.push(implName);
    }
    
    return relatedFiles;
  }
  
  /**
   * Descobre dependências (imports/exports) de um arquivo
   */
  private discoverDependencies(filePath: string): Dependency[] {
    const dependencies: Dependency[] = [];
    // Usamos a API adequada para ts-morph - getSourceFiles e depois encontramos o arquivo
    const sourceFiles = this.project.getSourceFiles();
    const sourceFile = sourceFiles.find(sf => sf.getFilePath().includes(filePath));
    
    if (!sourceFile) {
      return dependencies;
    }
    
    // Analisar importações
    const importDeclarations = sourceFile.getImportDeclarations();
    importDeclarations.forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const importedSymbols = importDecl.getNamedImports().map(named => named.getName());
      
      // Converter caminho relativo para absoluto
      let absolutePath = moduleSpecifier;
      if (moduleSpecifier.startsWith('.')) {
        absolutePath = path.resolve(path.dirname(filePath), moduleSpecifier);
        // Adicionar extensão se não tiver
        if (!path.extname(absolutePath)) {
          absolutePath += '.ts';
        }
      }
      
      dependencies.push({
        from: filePath,
        to: absolutePath,
        type: 'import',
        symbols: importedSymbols
      });
    });
    
    // Analisar exportações
    sourceFile.getExportDeclarations().forEach(exportDecl => {
      const moduleSpecifier = exportDecl.getModuleSpecifierValue();
      
      if (moduleSpecifier) {
        // Re-exportação
        let absolutePath = moduleSpecifier;
        if (moduleSpecifier.startsWith('.')) {
          absolutePath = path.resolve(path.dirname(filePath), moduleSpecifier);
          if (!path.extname(absolutePath)) {
            absolutePath += '.ts';
          }
        }
        
        dependencies.push({
          from: filePath,
          to: absolutePath,
          type: 'export',
          symbols: []
        });
      }
    });
    
    return dependencies;
  }
  
  /**
   * Determina o escopo da mudança com base no caminho do arquivo
   */
  private determineScope(filePath: string): string {
    const lowerPath = filePath.toLowerCase();
    
    if (lowerPath.includes('test') || lowerPath.includes('spec')) {
      return 'test';
    }
    
    if (lowerPath.includes('/src/api/') || lowerPath.includes('/src/public/')) {
      return 'public';
    }
    
    if (lowerPath.includes('/src/internal/') || lowerPath.includes('/src/core/')) {
      return 'internal';
    }
    
    if (lowerPath.includes('/docs/')) {
      return 'documentation';
    }
    
    if (lowerPath.includes('/example/')) {
      return 'example';
    }
    
    if (lowerPath.endsWith('package.json') || 
        lowerPath.endsWith('.gitignore') ||
        lowerPath.includes('/config/') ||
        lowerPath.endsWith('tsconfig.json')) {
      return 'configuration';
    }
    
    return 'unknown';
  }
}
