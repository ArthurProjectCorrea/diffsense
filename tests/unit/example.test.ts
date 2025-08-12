import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetector } from '../../src/core/change-detector';
import { RulesEngine } from '../../src/core/rules-engine';
import { SemanticAnalyzer } from '../../src/core/semantic-analyzer';
import { ScoringSystem } from '../../src/core/scoring';
import { Change, ChangeType, SemanticChange } from '../../src/types/index';

// Mock para simpleGit
vi.mock('simple-git', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      diff: vi.fn().mockResolvedValue('A\tsrc/example.ts\nM\tsrc/modified.ts\nD\tsrc/deleted.ts'),
      show: vi.fn().mockImplementation((path) => {
        if (path.includes('example.ts')) {
          return 'export const example = "test";';
        }
        if (path.includes('modified.ts')) {
          return 'export const modified = "updated";';
        }
        return '';
      })
    }))
  };
});

// Mocks para módulos do Node
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation((path) => {
    if (path.includes('default-rules.yaml')) {
      return `
- id: test-rule
  match: "**/*.ts"
  type: feat
  reason: "Arquivo TypeScript"
      `;
    }
    return '';
  }),
  existsSync: vi.fn().mockReturnValue(true),
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{}')
  }
}));

vi.mock('path', () => ({
  join: vi.fn().mockImplementation((...args) => args.join('/')),
  dirname: vi.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/')),
  basename: vi.fn().mockImplementation((p) => p.split('/').pop()),
  extname: vi.fn().mockImplementation((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
  resolve: vi.fn().mockImplementation((...args) => args.join('/'))
}));

vi.mock('ts-morph', () => {
  return {
    Project: vi.fn().mockImplementation(() => ({
      getSourceFiles: vi.fn().mockReturnValue([]),
      removeSourceFile: vi.fn(),
      createSourceFile: vi.fn(),
      addSourceFileAtPath: vi.fn()
    })),
    SyntaxKind: {
      PublicKeyword: 'public',
      PrivateKeyword: 'private'
    }
  };
});

describe('ChangeDetector', () => {
  let changeDetector: ChangeDetector;
  
  beforeEach(() => {
    changeDetector = new ChangeDetector();
  });
  
  it('deve detectar mudanças entre duas referências', async () => {
    const changes = await changeDetector.detectChanges('main', 'HEAD');
    
    expect(changes).toBeInstanceOf(Array);
    expect(changes.length).toBeGreaterThan(0);
    
    // Verificar se os tipos estão corretos
    const addedChange = changes.find(c => c.type === ChangeType.ADDED);
    expect(addedChange).toBeDefined();
    expect(addedChange?.filePath).toContain('example.ts');
    
    const modifiedChange = changes.find(c => c.type === ChangeType.MODIFIED);
    expect(modifiedChange).toBeDefined();
    expect(modifiedChange?.filePath).toContain('modified.ts');
  });
});

describe('RulesEngine', () => {
  let rulesEngine: RulesEngine;
  
  beforeEach(() => {
    rulesEngine = new RulesEngine();
  });
  
  it('deve aplicar regras às mudanças', () => {
    // Criar uma mudança semântica de teste
    const change: SemanticChange = {
      filePath: 'src/example.ts',
      type: ChangeType.ADDED,
      metadata: {
        linesAdded: 10,
        linesRemoved: 0,
        fileType: 'script'
      },
      semanticChanges: [
        {
          type: 'METHOD_ADDED' as any,
          description: 'Nova função adicionada: exemplo',
          severity: 'low',
          affectedSymbol: 'exemplo'
        }
      ],
      affectedSymbols: ['exemplo'],
      hunks: [],
      relatedFiles: [],
      dependencies: []
    };
    
    const classified = rulesEngine.applyRules([change]);
    
    expect(classified).toBeInstanceOf(Array);
    expect(classified.length).toBe(1);
    expect(classified[0].commitType).toBeDefined();
  });
});

describe('ScoringSystem', () => {
  let scoringSystem: ScoringSystem;
  
  beforeEach(() => {
    scoringSystem = new ScoringSystem();
  });
  
  it('deve pontuar as mudanças corretamente', () => {
    const change = {
      filePath: 'src/example.ts',
      type: ChangeType.ADDED,
      metadata: {
        linesAdded: 10,
        linesRemoved: 0,
        fileType: 'script'
      },
      semanticChanges: [
        {
          type: 'METHOD_ADDED' as any,
          description: 'Nova função adicionada: exemplo',
          severity: 'low',
          affectedSymbol: 'exemplo'
        }
      ],
      affectedSymbols: ['exemplo'],
      commitType: 'feat' as const,
      commitScope: 'core',
      breaking: false,
      appliedRules: ['test-rule'],
      description: 'Adiciona novo método'
    };
    
    const scored = scoringSystem.scoreChanges([change]);
    
    expect(scored).toBeInstanceOf(Array);
    expect(scored.length).toBe(1);
    expect(scored[0].score).toBeGreaterThanOrEqual(0);
    expect(scored[0].score).toBeLessThanOrEqual(10);
    expect(scored[0].scoreFactors).toBeInstanceOf(Array);
  });
});
