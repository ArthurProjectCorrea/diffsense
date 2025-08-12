import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesEngine } from '../../src/core/rules-engine';
import { SemanticChange, ChangeType, SemanticChangeType } from '../../src/types';

// Mock para fs
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation(() => {
    return `
- id: test-rule
  match: "**/*.ts"
  type: feat
  reason: "Arquivo TypeScript"
- id: fix-rule
  match: "**/*.js"
  type: fix
  reason: "Correção em arquivo JavaScript"
    `;
  }),
  existsSync: vi.fn().mockReturnValue(true)
}));

describe('RulesEngine', () => {
  let rulesEngine: RulesEngine;
  
  beforeEach(() => {
    rulesEngine = new RulesEngine();
  });
  
  it('deve carregar regras padrão', () => {
    expect(rulesEngine['rules']).toBeInstanceOf(Array);
    expect(rulesEngine['rules'].length).toBeGreaterThan(0);
  });
  
  it('deve aplicar regras às mudanças', () => {
    const changes: SemanticChange[] = [
      {
        filePath: 'src/example.ts',
        type: ChangeType.ADDED,
        metadata: {
          linesAdded: 10,
          linesRemoved: 0,
          fileType: 'typescript'
        },
        semanticChanges: [
          {
            type: SemanticChangeType.METHOD_ADDED,
            description: 'Nova função adicionada: exemplo',
            severity: 'low',
            affectedSymbol: 'exemplo'
          }
        ],
        affectedSymbols: ['exemplo'],
        relatedFiles: [],
        dependencies: [],
        hunks: []
      }
    ];
    
    const classified = rulesEngine.applyRules(changes);
    
    expect(classified).toBeInstanceOf(Array);
    expect(classified.length).toBe(1);
    expect(classified[0].commitType).toBe('feat');
    expect(classified[0].appliedRules).toContain('test-rule');
  });
});
