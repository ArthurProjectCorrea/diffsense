import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticAnalyzer } from '../../src/core/semantic-analyzer';
import { Change, ChangeType, ContextualizedChange } from '../../src/types';

// Mock para ts-morph
vi.mock('ts-morph', () => {
  return {
    Project: vi.fn().mockImplementation(() => ({
      getSourceFiles: vi.fn().mockReturnValue([]),
      removeSourceFile: vi.fn(),
      createSourceFile: vi.fn().mockImplementation((path, content) => {
        return {
          getClasses: vi.fn().mockReturnValue([
            {
              getName: vi.fn().mockReturnValue('TestClass'),
              getMethods: vi.fn().mockReturnValue([
                {
                  getName: vi.fn().mockReturnValue('testMethod'),
                  getParameters: vi.fn().mockReturnValue([])
                }
              ]),
              getProperties: vi.fn().mockReturnValue([])
            }
          ]),
          getInterfaces: vi.fn().mockReturnValue([]),
          getImportDeclarations: vi.fn().mockReturnValue([]),
          getExportDeclarations: vi.fn().mockReturnValue([])
        };
      }),
      addSourceFileAtPath: vi.fn()
    })),
    SyntaxKind: {
      PublicKeyword: 'public',
      PrivateKeyword: 'private'
    }
  };
});

describe('SemanticAnalyzer', () => {
  let semanticAnalyzer: SemanticAnalyzer;
  
  beforeEach(() => {
    semanticAnalyzer = new SemanticAnalyzer();
  });
  
  it('deve analisar alterações e detectar mudanças semânticas', async () => {
    // Criar uma mudança de teste
    const changes: ContextualizedChange[] = [
      {
        filePath: 'src/example.ts',
        type: ChangeType.ADDED,
        oldContent: '',
        newContent: 'export class TestClass { testMethod() {} }',
        metadata: {
          linesAdded: 1,
          linesRemoved: 0,
          fileType: 'typescript'
        },
        relatedFiles: [],
        dependencies: [],
        hunks: []
      }
    ];
    
    const analyzedChanges = await semanticAnalyzer.analyzeChanges(changes);
    
    expect(analyzedChanges).toBeInstanceOf(Array);
    expect(analyzedChanges.length).toBe(1);
    expect(analyzedChanges[0].semanticChanges).toBeInstanceOf(Array);
    expect(analyzedChanges[0].affectedSymbols).toBeInstanceOf(Array);
  });
});
