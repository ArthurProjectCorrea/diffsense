import { describe, it, expect } from 'vitest';
import { Reporter } from '../../src/core/reporter';
import { ScoredChange, ChangeType, CommitType } from '../../src/types';

describe('Reporter', () => {
  it('deve gerar um relatório JSON corretamente', () => {
    const reporter = new Reporter();
    
    const scoredChanges: ScoredChange[] = [
      {
        filePath: 'src/example.ts',
        type: ChangeType.ADDED,
        metadata: {
          linesAdded: 10,
          linesRemoved: 0,
          fileType: 'typescript'
        },
        semanticChanges: [],
        affectedSymbols: ['exemplo'],
        relatedFiles: [],
        dependencies: [],
        hunks: [],
        commitType: 'feat' as CommitType,
        commitScope: 'core',
        breaking: false,
        appliedRules: ['test-rule'],
        description: 'Adiciona novo método',
        score: 8.5,
        scoreFactors: [
          { name: 'linesOfCode', value: 10, weight: 0.5 },
          { name: 'semanticImportance', value: 7, weight: 0.8 }
        ]
      }
    ];
    
    const result = reporter.generateReport(scoredChanges, { format: 'json', detailed: true });
    
    expect(typeof result).toBe('string');
    
    // Parse the result to verify its content
    const parsedResult = JSON.parse(result);
    expect(parsedResult).toBeDefined();
    expect(parsedResult.changes).toBeInstanceOf(Array);
    expect(parsedResult.changes.length).toBe(1);
    
    // Verificar sugestão de commit
    expect(parsedResult.suggestedCommit).toBeDefined();
    expect(parsedResult.suggestedCommit.type).toBe('feat');
  });
  
  it('deve gerar um relatório Markdown corretamente', () => {
    const reporter = new Reporter();
    
    const scoredChanges: ScoredChange[] = [
      {
        filePath: 'src/example.ts',
        type: ChangeType.ADDED,
        metadata: {
          linesAdded: 10,
          linesRemoved: 0,
          fileType: 'typescript'
        },
        semanticChanges: [],
        affectedSymbols: ['exemplo'],
        relatedFiles: [],
        dependencies: [],
        hunks: [],
        commitType: 'feat' as CommitType,
        commitScope: 'core',
        breaking: false,
        appliedRules: ['test-rule'],
        description: 'Adiciona novo método',
        score: 8.5,
        scoreFactors: [
          { name: 'linesOfCode', value: 10, weight: 0.5 },
          { name: 'semanticImportance', value: 7, weight: 0.8 }
        ]
      }
    ];
    
    const result = reporter.generateReport(scoredChanges, { format: 'markdown', detailed: true });
    
    expect(typeof result).toBe('string');
    expect(result).toContain('# Relatório de Análise DiffSense');
    expect(result).toContain('## Sugestão de Commit');
    expect(result).toContain('feat(core):');
  });
});
