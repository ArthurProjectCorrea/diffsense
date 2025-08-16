import { analyzeChanges } from '../../dist/index.js';
import { ResultFormatter } from '../../dist/utils/formatter.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import chalk from 'chalk';

export const execPromise = promisify(exec);

// Função que agrupa arquivos por tipo
export const groupFilesByType = (result) => {
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
  }
  
  return filesByType;
};

// Função para analisar as alterações
export const analyzeChangesAndFiles = async (options) => {
  console.log(chalk.blue('🔍 Analisando alterações...'));
  console.log(chalk.yellow('⚠️  Nota: Todos os arquivos serão adicionados ao stage (git add .) para garantir análise completa.'));
  
  try {
    // Verificar status inicial
    const { stdout: initialStatus } = await execPromise('git status --porcelain');
    console.log(chalk.cyan(`\n📊 Status Git antes do add:\n${initialStatus || '(Área de trabalho limpa)'}`));
    
    // Executar git add para garantir que todos os arquivos são considerados
    const { stdout: addOutput, stderr: addError } = await execPromise('git add .');
    if (addError) {
      console.warn(chalk.yellow(`⚠️ Aviso ao adicionar arquivos: ${addError}`));
    }
    
    // Verificar status após git add
    const { stdout: afterAddStatus } = await execPromise('git status --porcelain');
    console.log(chalk.cyan(`\n📊 Status Git após add:\n${afterAddStatus || '(Área de trabalho limpa)'}`));
  } catch (gitError) {
    console.error(chalk.red(`❌ Erro ao executar git add: ${gitError.message}`));
  }
  
  const result = await analyzeChanges(options.base, options.head);
  
  // Exibir resultado da análise primeiro (padrão do analyzer.js)
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
};
