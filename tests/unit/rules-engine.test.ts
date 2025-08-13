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
  reason: "TypeScript file"
- id: fix-rule
  match: "**/*.js"
  type: fix
  reason: "Fix in JavaScript file"
    `;
  }),
  existsSync: vi.fn().mockReturnValue(true)
}));

describe('RulesEngine', () => {
  let rulesEngine: RulesEngine;
  
  beforeEach(() => {
    rulesEngine = new RulesEngine();
  });
  
  it('should load default rules', () => {
    expect(rulesEngine['rules']).toBeInstanceOf(Array);
    expect(rulesEngine['rules'].length).toBeGreaterThan(0);
  });
  
  it('should apply rules to changes', () => {
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
            description: 'New function added: example',
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
