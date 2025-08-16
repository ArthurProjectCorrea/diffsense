// Funções para agrupamento e classificação dos arquivos por tipo
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Função para agrupar arquivos por tipo
export async function agruparArquivosPorTipo(result) {
  const filesByType = {};
  
  if (result && result.files) {
    // Ordenar as alterações para garantir consistência
    const sortedChanges = [...result.files].sort((a, b) => {
      // Primeiro ordenar por tipo
      if (a.primaryType < b.primaryType) return -1;
      if (a.primaryType > b.primaryType) return 1;
      // Em seguida por nome de arquivo
      return (a.filePath || '').localeCompare(b.filePath || '');
    });
    
    // Agrupar por tipo
    sortedChanges.forEach(change => {
      if (change.primaryType && change.filePath) {
        const type = change.primaryType.trim();
        if (!filesByType[type]) {
          filesByType[type] = new Set();
        }
        // Usar Set para evitar duplicatas
        filesByType[type].add(change.filePath);
      } else if (change.filePath) {
        // Se não tem tipo mas tem arquivo, classificar como feat
        if (!filesByType['feat']) {
          filesByType['feat'] = new Set();
        }
        filesByType['feat'].add(change.filePath);
      }
    });
  } else {
    // Se não conseguirmos extrair do resultado, tentar obter diretamente do git
    try {
      const { stdout } = await execPromise('git diff --name-only --cached');
      const modifiedFiles = stdout.trim().split('\n').filter(Boolean);
      
      if (modifiedFiles.length > 0) {
        if (!filesByType['feat']) {
          filesByType['feat'] = new Set();
        }
        modifiedFiles.forEach(file => filesByType['feat'].add(file));
      }
    } catch (gitError) {
      console.error('❌ Erro ao tentar obter arquivos modificados:', gitError.message);
    }
  }
  
  return filesByType;
}

// Função para exibir resumo das alterações classificadas
export function exibirResumoAlteracoes(filesByType) {
  const typesWithFiles = Object.keys(filesByType);
  
  if (typesWithFiles.length === 0) {
    console.log('⚠️ Nenhuma alteração classificada encontrada para commit.');
    return false;
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO DE ALTERAÇÕES CLASSIFICADAS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Encontrados arquivos para commit em ${typesWithFiles.length} categorias diferentes:`);
  console.log('');
  
  // Mostrar todos os arquivos classificados por tipo
  for (const type of typesWithFiles.sort()) {
    const files = Array.from(filesByType[type]);
    console.log(`📁 ${type.toUpperCase()} (${files.length} arquivo(s)):`);
    console.log(files.map(file => `   - ${file}`).join('\n'));
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return true;
}
