import { Project } from 'ts-morph';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

/**
 * Detecta breaking change usando AST via ts-morph
 * Retorna null se não detectado, ou objeto com flags
 */
export function detectASTBreakingChange(filePath: string) {
  const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
  const idx = filePath.lastIndexOf('.');
  const ext = idx !== -1 ? filePath.substring(idx).toLowerCase() : '';
  if (!codeExts.includes(ext)) return null;
  try {
    // Conteúdo antigo
    const oldContent = execSync(`git show HEAD^:"${filePath}"`, { encoding: 'utf8' });
    // Conteúdo novo
    const newContent = fs.readFileSync(filePath, 'utf8');
    // Criar projeto em memória
    const proj = new Project({ useInMemoryFileSystem: true });
    const oldFile = proj.createSourceFile('old.ts', oldContent, { overwrite: true });
    const newFile = proj.createSourceFile('new.ts', newContent, { overwrite: true });
    // Exported symbols
    const oldExports = Array.from(oldFile.getExportedDeclarations().keys());
    const newExports = Array.from(newFile.getExportedDeclarations().keys());
    // Detectar remoções
    const removed = oldExports.filter(name => !newExports.includes(name));
    if (removed.length > 0) {
      return {
        isBreakingChange: true,
        breakingChangeReason: `Remoção de exportação: ${removed.join(', ')}`
      };
    }
    return null;
  } catch {
    return null;
  }
}
