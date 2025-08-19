/**
 * Agrupa paths de arquivos modificados em escopos definidos pelos package.json
 * @param {string[]} filePaths - caminhos relativos dos arquivos modificados
 * @param {{name: string, path: string}[]} scopes - escopos com nome e caminho relativo
 * @returns {{ [scopeName: string]: string[] }} mapeamento de escopo para arquivos
 */
export function groupFilesByScope(filePaths, scopes) {
  // Inicializar agrupamento vazio para cada escopo
  const grouping = {};
  scopes.forEach(s => { grouping[s.name] = []; });
  for (const fp of filePaths) {
    // Encontrar escopo com prefixo mais longo que corresponde ao caminho
    let bestMatch = { name: scopes[0].name, path: '' };
    for (const s of scopes) {
      const prefix = s.path ? s.path + '/' : '';
      if (fp === s.path || (prefix && fp.startsWith(prefix))) {
        if (!bestMatch.path || s.path.length > bestMatch.path.length) {
          bestMatch = s;
        }
      }
    }
    // Calcular caminho relativo dentro do escopo
    const base = bestMatch.path ? bestMatch.path + '/' : '';
    const relPath = base ? fp.slice(base.length) : fp;
    grouping[bestMatch.name].push(relPath);
  }
  return grouping;
}
