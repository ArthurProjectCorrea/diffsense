/**
 * Classifica arquivos modificados em escopos baseados em package.json.
 * @param {string[]} filePaths - caminhos relativos dos arquivos.
 * @param {{ name: string, dir: string }[]} scopes - escopos com nome e diretório relativo.
 * @returns {{ [scopeName: string]: string[] }} Mapeamento de escopo para lista de arquivos (caminho relativo dentro do escopo).
 */
export function classifyFilesByScope(filePaths, scopes) {
  // Ordenar escopos por profundidade (diretório mais longo primeiro)
  const ordered = [...scopes].sort((a, b) => b.dir.length - a.dir.length);
  // Identificar escopo raiz (dir vazio)
  const root = ordered.find(s => s.dir === '');
  const grouping = {};
  // Inicializar agrupamento para cada escopo
  scopes.forEach(s => { grouping[s.name] = []; });
  for (const fp of filePaths) {
    // Encontrar primeiro escopo cujo dir é prefixo do caminho
    let match = ordered.find(s => {
      if (!s.dir) return false;
      const prefix = s.dir.endsWith('/') ? s.dir : s.dir + '/';
      return fp === s.dir || fp.startsWith(prefix);
    });
    // Se não encontrou, usar escopo raiz
    if (!match) match = root || { name: '__unscoped', dir: '' };
    // Calcular caminho relativo dentro do escopo
    const base = match.dir ? (match.dir.endsWith('/') ? match.dir : match.dir + '/') : '';
  // Usar caminho completo para commit
  grouping[match.name].push(fp);
  }
  return grouping;
}
