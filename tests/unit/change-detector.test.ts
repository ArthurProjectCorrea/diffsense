import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetector } from '../../src/core/change-detector';
import { ChangeType } from '../../src/types';

// Mock para simpleGit
vi.mock('simple-git', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      diff: vi.fn().mockResolvedValue('A\tsrc/example.ts\nM\tsrc/modified.ts\nD\tsrc/deleted.ts'),
      show: vi.fn().mockImplementation((params) => {
        if (typeof params === 'object' && params[1].includes('example.ts')) {
          return Promise.resolve('export const example = "test";');
        }
        if (typeof params === 'object' && params[1].includes('modified.ts')) {
          return Promise.resolve('export const modified = "updated";');
        }
        return Promise.resolve('');
      })
    }))
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
    expect(changes.length).toBe(3);
    
    // Verificar se os tipos estão corretos
    const addedChange = changes.find(c => c.type === ChangeType.ADDED);
    expect(addedChange).toBeDefined();
    expect(addedChange?.filePath).toContain('example.ts');
    
    const modifiedChange = changes.find(c => c.type === ChangeType.MODIFIED);
    expect(modifiedChange).toBeDefined();
    expect(modifiedChange?.filePath).toContain('modified.ts');
    
    const deletedChange = changes.find(c => c.type === ChangeType.DELETED);
    expect(deletedChange).toBeDefined();
    expect(deletedChange?.filePath).toContain('deleted.ts');
  });
});
