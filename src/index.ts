import { ChangeDetector } from './core/change-detector.js';
import { ContextCorrelator } from './core/context-correlator.js';
import { SemanticAnalyzer } from './core/semantic-analyzer.js';
import { RulesEngine } from './core/rules-engine.js';
import { ScoringSystem } from './core/scoring.js';
import { Reporter, FormatterOptions } from './core/reporter.js';
import { 
  AnalysisOptions, 
  AnalysisResult, 
  ScoredChange,
  SemanticChange,
  ChangeType,
  SemanticChangeType,
  Rule,
  FileChange
} from './types/index.js';
import path from 'path';

/**
 * Executes complete DiffSense analysis according to the reference architecture
 * 
 * @param base - Base branch or commit for comparison
 * @param head - Head branch or commit for comparison (usually the current state)
 * @param options - Additional options to customize the analysis
 * @returns Object with analysis result and report
 */
export async function runAnalysis(
  base: string, 
  head: string, 
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  console.log(`Running DiffSense analysis from ${base} to ${head}...`);

  try {
    // 1. Detects changes between commits/branches
    const changeDetector = new ChangeDetector();
    const changes = await changeDetector.detectChanges(base, head);
    console.log(`Detected ${changes.length} changes`);

    // 2. Correlates the context of changes
    const contextCorrelator = new ContextCorrelator();
    const contextualizedChanges = await contextCorrelator.correlateChanges(changes);
    
    // 3. Semantically analyzes the changes
    const config = {
      baseDir: process.cwd(),
      outDir: './reports',
      ignorePaths: [],
      useContextCorrelation: true
    };
    
    if (options.modules?.semanticAnalyzer) {
      Object.assign(config, options.modules.semanticAnalyzer);
    }
    
    const semanticAnalyzer = new SemanticAnalyzer(config);
    
    // Converter para o formato FileChange esperado pelo novo SemanticAnalyzer
    const fileChanges = contextualizedChanges.map(change => ({
      path: change.filePath,
      status: change.type as FileChange['status'], // Tipagem correta
      previousPath: ''
    }));
    
    const analyzedChanges = await semanticAnalyzer.analyzeChanges(fileChanges);
    
    // 4. Apply classification rules
    const rulesEngine = new RulesEngine(options.configPath);
    
    // Convert ISemanticAnalysis[] to SemanticChange[]
    const semanticChanges: SemanticChange[] = analyzedChanges.map(analysis => {
      // Mapear o resultado do novo SemanticAnalyzer para o formato esperado pelo sistema legado
      const baseChange = contextualizedChanges.find(c => c.filePath === analysis.file) || 
                        contextualizedChanges[0] || 
                        { 
                          filePath: analysis.file, 
                          type: ChangeType.MODIFIED,
                          metadata: { linesAdded: 0, linesRemoved: 0 },
                          relatedFiles: [],
                          dependencies: [],
                          hunks: []
                        };
      
      // Determinar tipo de commit com base no tipo de arquivo e na análise semântica
      let commitType = 'feat'; // padrão
      
      // Detectar tipos de arquivo específicos
      const fileExt = path.extname(analysis.file).toLowerCase();
      const fileName = path.basename(analysis.file).toLowerCase();
      
      // Detect test files
      if (analysis.file.includes('/test') || analysis.file.includes('/__test__') || 
          fileName.includes('test') || fileName.includes('spec') || 
          analysis.file.includes('/tests/')) {
        commitType = 'test';
      } 
      // Detect documentation files
      else if (fileExt === '.md' || fileExt === '.txt' || fileName.includes('readme') || 
               fileName.includes('license') || fileName.includes('changelog')) {
        commitType = 'docs';
      }
      // Detect configuration files
      else if (fileExt === '.json' || fileExt === '.yaml' || fileExt === '.yml' || 
               fileExt === '.toml' || fileExt === '.ini' || fileName.startsWith('.')) {
        commitType = 'chore';
      }
      // Detectar arquivos de estilo
      else if (fileExt === '.css' || fileExt === '.scss' || fileExt === '.less' || 
               fileExt === '.style') {
        commitType = 'style';
      }
      
      // Sobrescrever com base na análise semântica
      if (analysis.semanticChanges.some((c: {type: string}) => c.type === 'file_deleted')) {
        commitType = 'refactor';
      } else if (analysis.semanticChanges.some((c: {description?: string}) => c.description?.includes('fix') || 
                                                 c.description?.includes('corrige') || 
                                                 c.description?.includes('resolve'))) {
        commitType = 'fix';
      }
      
      return {
        ...baseChange,
        semanticChanges: analysis.semanticChanges.map((sc: {description?: string}) => ({
          type: SemanticChangeType.IMPLEMENTATION_CHANGED,
          description: sc.description,
          severity: analysis.impact === 'major' ? 'breaking' : 
                   analysis.impact === 'moderate' ? 'medium' : 'low'
        })),
        affectedSymbols: analysis.details?.addedExports || 
                        analysis.details?.removedExports || 
                        analysis.details?.addedDeclarations || 
                        [],
        // Adicionar informações de commit para uso no commit-by-type
        commitType,
        impact: analysis.impact
      };
    });
    
    const classifiedChanges = rulesEngine.applyRules(semanticChanges);
    
    // 5. Pontua as mudanças por impacto
    const scoringSystem = new ScoringSystem(options.modules?.scoring);
    const scoredChanges = scoringSystem.scoreChanges(classifiedChanges);
    
    // 6. Gera o relatório final
    const reporter = new Reporter();
    const formatterOptions: FormatterOptions = {
      format: options.format || 'markdown',
      detailed: true,
      includeSuggestion: true
    };
    const report = reporter.generateReport(scoredChanges, formatterOptions);
    
    // 7. Gerar sugestão de commit
    const suggestion = generateCommitSuggestion(scoredChanges);
    
    return {
      changes: scoredChanges,
      report,
      suggestedCommit: suggestion
    };
  } catch (error) {
    console.error('Erro ao executar análise:', error);
    throw error;
  }
}

/**
 * Generates a commit suggestion based on analyzed changes
 */
function generateCommitSuggestion(changes: ScoredChange[]) {
  // If there are no changes, return undefined
  if (changes.length === 0) {
    return undefined;
  }
  
  // Determinar o tipo de commit mais relevante
  const commitTypes = changes
    .filter(change => change.commitType)
    .map(change => change.commitType!);
    
  // Prioridade dos tipos
  const typePriorities = {
    'feat': 4,
    'fix': 3,
    'refactor': 2,
    'docs': 1,
    'test': 1,
    'chore': 0
  };
  
  // Ordenar por prioridade e escolher o mais relevante
  const type = commitTypes
    .sort((a, b) => (typePriorities[a as keyof typeof typePriorities] || 0) - 
                    (typePriorities[b as keyof typeof typePriorities] || 0))
    .pop() || 'chore';
  
  // Determinar o escopo mais comum
  const scopes = changes
    .filter(change => change.commitScope)
    .map(change => change.commitScope!);
    
  const scopeCounts: Record<string, number> = {};
  scopes.forEach(scope => {
    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
  });
  
  let maxCount = 0;
  let scope: string | undefined = undefined;
  
  Object.entries(scopeCounts).forEach(([s, count]) => {
    if (count > maxCount) {
      maxCount = count;
      scope = s;
    }
  });
  
  // Verificar se há breaking changes
  const breaking = changes.some(change => change.breaking);
  
  // Gerar assunto do commit baseado na mudança mais impactante
  const topChange = [...changes].sort((a, b) => b.score - a.score)[0];
  const subject = topChange?.description || 
    (type === 'feat' ? 'adiciona novo recurso' : 
     type === 'fix' ? 'corrige problema' : 
     'atualiza código');
  
  // Gerar body para breaking changes
  let body: string | undefined;
  
  if (breaking) {
    const breakingChanges = changes.filter(change => change.breaking);
    body = 'BREAKING CHANGE: ' + 
      breakingChanges.map(change => change.description || 
                           `Incompatible change in ${change.filePath}`).join('\n');
  }
  
  return {
    type,
    scope,
    subject,
    body,
    breaking
  };
}

// Exportações adicionais para uso público da API
export { 
  ChangeDetector,
  ContextCorrelator,
  SemanticAnalyzer,
  RulesEngine,
  ScoringSystem,
  Reporter,
  // Tipos
  AnalysisOptions,
  AnalysisResult,
  ScoredChange,
  SemanticChange,
  ChangeType,
  SemanticChangeType,
  Rule
};

// Versão do pacote
export const VERSION = '1.0.0';
