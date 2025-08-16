// Funções para análise de alterações no Git
import { analyzeChanges } from '../../dist/index.js';
import { ResultFormatter } from '../../dist/utils/formatter.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Função para verificar status do Git e adicionar arquivos
export async function verificarStatus() {
  try {
    // Verificar status inicial
    const { stdout: initialStatus } = await execPromise('git status --porcelain');
    console.log(`\n📊 Status Git antes do add:\n${initialStatus || '(Área de trabalho limpa)'}`);
    
    // Executar git add para garantir que todos os arquivos são considerados
    const { stdout: addOutput, stderr: addError } = await execPromise('git add .');
    if (addError) {
      console.warn(`⚠️ Aviso ao adicionar arquivos: ${addError}`);
    }
    
    // Verificar status após git add
    const { stdout: afterAddStatus } = await execPromise('git status --porcelain');
    console.log(`\n📊 Status Git após add:\n${afterAddStatus || '(Área de trabalho limpa)'}`);
  } catch (gitError) {
    console.error(`❌ Erro ao executar git add: ${gitError.message}`);
  }
}

// Função para analisar alterações
export async function analisarAlteracoes(options) {
  console.log('🔍 Analisando alterações...');
  console.log('⚠️  Nota: Todos os arquivos serão adicionados ao stage (git add .) para garantir análise completa.');
  
  await verificarStatus();
  
  const result = await analyzeChanges(options.base, options.head);
  
  // Exibir resultado da análise
  if (options.json) {
    // Saída em formato JSON
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Saída formatada para o console
    const formatter = new ResultFormatter();
    const output = formatter.format(result);
    console.log(output);
  }
  
  return result;
}
