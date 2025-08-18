const fs = require('fs');
const cp = require('child_process');
const { Project } = require('ts-morph');

/**
 * Detecta breaking change usando AST via ts-morph
 * Retorna {isBreakingChange, breakingChangeReason} ou null
 */
function detectASTBreakingChange(filePath) {
  const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
  const idx = filePath.lastIndexOf('.');
  const ext = idx !== -1 ? filePath.substring(idx).toLowerCase() : '';
  if (!codeExts.includes(ext)) return null;
  try {
    // Conteúdo antigo
    const oldContent = cp.execSync(`git show HEAD^:"${filePath}"`, { encoding: 'utf8' });
    // Conteúdo novo
    const newContent = fs.readFileSync(filePath, 'utf8');
    // Criar projeto em memória
    const proj = new Project({ useInMemoryFileSystem: true });
    const oldFile = proj.createSourceFile('old.ts', oldContent, { overwrite: true });
    const newFile = proj.createSourceFile('new.ts', newContent, { overwrite: true });
    // Extrair assinaturas completas de símbolos exportados
    const getSigs = (sf) => {
      const sigs = [];
      sf.getExportedDeclarations().forEach((decls, name) => {
        decls.forEach(decl => sigs.push(name + ':' + decl.getText()));
      });
      return sigs;
    };
    const oldSigs = getSigs(oldFile);
    const newSigs = getSigs(newFile);
    // Symbols removed entirely
    const removed = oldSigs.filter(s => !newSigs.includes(s));
    // Names changed signature: same name but different sig
    const oldNames = oldFile.getExportedDeclarations().keys();
    const changed = [];
    Array.from(oldNames).forEach(name => {
      const oldDecls = oldFile.getExportedDeclarations().get(name) || [];
      const newDecls = newFile.getExportedDeclarations().get(name) || [];
      if (oldDecls.length && newDecls.length) {
        const oldText = oldDecls[0].getText();
        const newText = newDecls[0].getText();
        if (oldText !== newText) changed.push(name);
      }
    });
    const reasons = [];
    if (removed.length) reasons.push('Removidos: ' + removed.map(s=>s.split(':')[0]).join(', '));
    if (changed.length) reasons.push('Assinaturas alteradas: ' + changed.join(', '));
    if (reasons.length) {
      return { isBreakingChange: true, breakingChangeReason: reasons.join('; ') };
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = { detectASTBreakingChange };
