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
  Rule
} from './types/index.js';
import path from 'path';

/**
 * Executa a análise completa do DiffSense de acordo com a arquitetura de referência
 * 
 * @param base - Branch ou commit base para comparação
 * @param head - Branch ou commit head para comparação (geralmente o estado atual)
 * @param options - Opções adicionais para personalizar a análise
 * @returns Objeto com resultado da análise e relatório
 */
export async function runAnalysis(
  base: string, 
  head: string, 
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  console.log(`Running DiffSense analysis from ${base} to ${head}...`);

  try {
    // 1. Detecta as mudanças entre os commits/branches
    const changeDetector = new ChangeDetector();
    const changes = await changeDetector.detectChanges(base, head);
    console.log(`Detectadas ${changes.length} mudanças`);

    // 2. Correlaciona o contexto das mudanças
    const contextCorrelator = new ContextCorrelator();
    const contextualizedChanges = await contextCorrelator.correlateChanges(changes);
    
    // 3. Analisa semanticamente as mudanças
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
      status: change.type as any, // Compatibilidade de tipos
      previousPath: ''
    }));
    
    const analyzedChanges = await semanticAnalyzer.analyzeChanges(fileChanges as any);
    
    // 4. Aplica regras de classificação
    const rulesEngine = new RulesEngine(options.configPath);
    
    // Converter ISemanticAnalysis[] para SemanticChange[]
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
      
      // Detectar arquivos de teste
      if (analysis.file.includes('/test') || analysis.file.includes('/__test__') || 
          fileName.includes('test') || fileName.includes('spec') || 
          analysis.file.includes('/tests/')) {
        commitType = 'test';
      } 
      // Detectar arquivos de documentação
      else if (fileExt === '.md' || fileExt === '.txt' || fileName.includes('readme') || 
               fileName.includes('license') || fileName.includes('changelog')) {
        commitType = 'docs';
      }
      // Detectar arquivos de configuração
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
      if (analysis.semanticChanges.some(c => c.type === 'file_deleted')) {
        commitType = 'refactor';
      } else if (analysis.semanticChanges.some(c => c.description?.includes('fix') || 
                                                 c.description?.includes('corrige') || 
                                                 c.description?.includes('resolve'))) {
        commitType = 'fix';
      }
      
      return {
        ...baseChange,
        semanticChanges: analysis.semanticChanges.map(sc => ({
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
 * Gera uma sugestão de commit com base nas mudanças analisadas
 */
function generateCommitSuggestion(changes: ScoredChange[]) {
  // Se não houver mudanças, retornar undefined
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
                           `Alteração incompatível em ${change.filePath}`).join('\n');
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
