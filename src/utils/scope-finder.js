import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';

/**
 * Encontra todos os package.json no projeto e retorna seus nomes.
 * Respeita .gitignore.
 * @param {string} rootDir Diretório raiz (default cwd)
 * @returns {Promise<string[]>}
 */
export async function findPackageScopes(rootDir = process.cwd()) {
  const ig = ignore();
  try {
    const gitignore = await fs.readFile(path.join(rootDir, '.gitignore'), 'utf8');
    ig.add(gitignore);
  } catch {
    // sem .gitignore
  }
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full);
      if (ig.ignores(rel)) continue;
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name === 'package.json') {
        try {
          const content = await fs.readFile(full, 'utf8');
          const pkg = JSON.parse(content);
          if (pkg.name) {
            // Diretório relativo onde está o package.json
            const relDir = path.relative(rootDir, path.dirname(full)).split(path.sep).join('/');
            results.push({ name: pkg.name, dir: relDir });
          }
        } catch {
          // parse error
        }
      }
    }
  }
  await walk(rootDir);
  return results;
}
