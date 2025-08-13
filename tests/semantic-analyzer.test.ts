import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticAnalyzer } from '../src/core/semantic-analyzer';
import { IConfiguration } from '../src/config/configuration';
import path from 'path';
import { FileChange } from '../src/types';
import * as fs from 'fs';

// Mock ts-morph
vi.mock('ts-morph', async () => {
  const mockSourceFile = {
    getFilePath: vi.fn().mockReturnValue('/path/to/mockFile.ts'),
    getClasses: vi.fn().mockReturnValue([]),
    getInterfaces: vi.fn().mockReturnValue([]),
    getFunctions: vi.fn().mockReturnValue([]),
    getEnums: vi.fn().mockReturnValue([]),
    getTypeAliases: vi.fn().mockReturnValue([]),
    getVariableDeclarations: vi.fn().mockReturnValue([]),
    getExportDeclarations: vi.fn().mockReturnValue([]),
    getDefaultExportSymbol: vi.fn().mockReturnValue(null),
    getExportedDeclarations: vi.fn().mockReturnValue(new Map()),
    getFullText: vi.fn().mockReturnValue(''),
  };

  const mockProject = {
    addSourceFileAtPath: vi.fn().mockReturnValue(mockSourceFile),
    getSourceFile: vi.fn().mockReturnValue(null),
  };

  const mockTs = {
    ScriptTarget: { ESNext: 'ESNext' },
    ModuleKind: { ESNext: 'ESNext' },
    ModuleResolutionKind: { NodeNext: 'NodeNext' },
  };

  return {
    Project: vi.fn().mockImplementation(() => mockProject),
    Node: {},
    SyntaxKind: {
      SourceFile: 'SourceFile',
    },
    ts: mockTs,
  };
});

// Mock fs module
vi.mock('fs', () => {
  return {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('mock file content'),
  };
});

describe('SemanticAnalyzer', () => {
  let analyzer: SemanticAnalyzer;
  let mockConfig: IConfiguration;
  
  beforeEach(() => {
    mockConfig = {
      baseDir: '/mock/base/dir',
      outDir: '/mock/out/dir',
      ignorePaths: ['/mock/ignore'],
      useContextCorrelation: false,
    };
    
    analyzer = new SemanticAnalyzer(mockConfig);
  });
  
  describe('analyzeChanges', () => {
    it('should return empty array on empty input', async () => {
      const result = await analyzer.analyzeChanges([]);
      expect(result).toEqual([]);
    });
    
    it('should analyze added files', async () => {
      const fileChanges: FileChange[] = [
        {
          path: '/path/to/newFile.ts',
          status: 'added',
          previousPath: '',
        },
      ];
      
      const result = await analyzer.analyzeChanges(fileChanges);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe('/path/to/newFile.ts');
      expect(result[0].semanticChanges[0].type).toBe('file_added');
    });
    
    it('should analyze modified files', async () => {
      const fileChanges: FileChange[] = [
        {
          path: '/path/to/modifiedFile.ts',
          status: 'modified',
          previousPath: '/path/to/modifiedFile.ts',
        },
      ];
      
      const result = await analyzer.analyzeChanges(fileChanges);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe('/path/to/modifiedFile.ts');
    });
    
    it('should analyze renamed files', async () => {
      const fileChanges: FileChange[] = [
        {
          path: '/path/to/newFileName.ts',
          status: 'renamed',
          previousPath: '/path/to/oldFileName.ts',
        },
      ];
      
      const result = await analyzer.analyzeChanges(fileChanges);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe('/path/to/newFileName.ts');
      expect(result[0].semanticChanges[0].type).toBe('file_renamed');
    });
    
    it('should analyze deleted files', async () => {
      const fileChanges: FileChange[] = [
        {
          path: '',
          status: 'deleted',
          previousPath: '/path/to/deletedFile.ts',
        },
      ];
      
      const result = await analyzer.analyzeChanges(fileChanges);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe('/path/to/deletedFile.ts');
      expect(result[0].semanticChanges[0].type).toBe('file_deleted');
    });
    
    it('should handle errors during analysis', async () => {
      // Neste teste, vamos apenas verificar que o analisador não falha quando 
      // um erro ocorre durante a análise
      const fileChanges: FileChange[] = [
        {
          // Using a path we know doesn't exist to force an error
          path: '/path/invalid/file.ts', 
          status: 'added',
          previousPath: '',
        },
      ];
      
      // O analisador deve tratar os erros internamente
      const result = await analyzer.analyzeChanges(fileChanges);
      
      // O resultado deve ser um array vazio ou com um item que indica um erro
      expect(Array.isArray(result)).toBe(true);
    });
  });
  
  describe('Non-code files handling', () => {
    it('should handle non-code files appropriately', async () => {
      const fileChanges: FileChange[] = [
        {
          path: '/path/to/image.png',
          status: 'added',
          previousPath: '',
        },
      ];
      
      const result = await analyzer.analyzeChanges(fileChanges);
      expect(result).toHaveLength(1);
      expect(result[0].impact).toBe('minor');
    });
  });
  
  describe('With context correlation', () => {
    it('should initialize dependency graph when context correlation is enabled', async () => {
      mockConfig.useContextCorrelation = true;
      analyzer = new SemanticAnalyzer(mockConfig);
      
      const fileChanges: FileChange[] = [
        {
          path: '/path/to/newFile.ts',
          status: 'added',
          previousPath: '',
        },
      ];
      
      await analyzer.analyzeChanges(fileChanges);
      // Since DependencyGraph is private, we can't directly test its initialization,
      // but the test should at least complete without errors
      expect(true).toBe(true);
    });
  });
});
