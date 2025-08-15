// Módulo para gerenciamento de commits
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Configuração do simple-git com timeout maior
const git = simpleGit({ maxConcurrentProcesses: 1 });

/**
 * Verifica se o arquivo existe no sistema de arquivos
 * @param {string} filePath - Caminho do arquivo
 * @returns {boolean} - true se o arquivo existe, false caso contrário
 */
function fileExists(filePath) {
  try {
    return fsSync.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

/**
 * Realiza o commit de um conjunto específico de arquivos
 * @param {Object} params - Parâmetros para o commit
 * @param {string} params.type - Tipo de alteração (feat, fix, etc)
 * @param {string} params.message - Mensagem de commit
 * @param {Array} params.files - Lista de arquivos para commit
 * @param {boolean} params.debug - Modo de depuração
 * @returns {Promise<boolean>} - true se o commit foi realizado com sucesso
 */
export async function commitFiles({ type, message, files, debug }) {
  // Primeiro, resetamos o stage para garantir que apenas os arquivos específicos sejam commitados
  await git.reset();
  
  const commitMessage = `${type}: ${message}`;
  const stageSpinner = ora(`Preparando arquivos do tipo ${chalk.cyan(type)}...`).start();
  
  // Filtramos os arquivos para pegar apenas os que existem ou são marcados como deletados
  const validFiles = [];
  
  for (const file of files) {
    // Determinar se o arquivo foi deletado com base no status
    const isDeleted = file.status === 'D' || file.status === 'deleted' || 
                      (file.status === 'Del');
    
    // Para arquivos não deletados, verificar se existem
    if (!isDeleted && !fileExists(file.filePath)) {
      if (debug) {
        console.log(`⚠️ Arquivo não encontrado: ${file.filePath}. Pulando...`);
      }
      continue;
    }
    
    validFiles.push(file);
  }
  
  if (validFiles.length === 0) {
    stageSpinner.fail(`Nenhum arquivo válido encontrado para o tipo ${type}`);
    return false;
  }
  
  // Adicionamos cada arquivo ao staging individualmente
  for (const file of validFiles) {
    try {
      const isDeleted = file.status === 'D' || file.status === 'deleted' || 
                      (file.status === 'Del');
      
      if (isDeleted) {
        // Para arquivos deletados, usamos git rm
        await git.raw(['rm', '--cached', '--force', file.filePath]).catch(() => {
          // Se falhar, provavelmente o arquivo já foi removido, então ignoramos
          if (debug) {
            console.log(`Arquivo já removido ou não encontrado: ${file.filePath}`);
          }
        });
      } else {
        // Para arquivos novos ou modificados
        await git.add(file.filePath);
      }
      
      if (debug) {
        console.log(`Adicionado ao stage: ${file.filePath}`);
      }
    } catch (error) {
      if (debug) {
        console.error(`Erro ao adicionar ${file.filePath}:`, error.message);
      }
    }
  }
  
  // Verificamos o que realmente foi adicionado ao stage
  const stagedFiles = await git.diff(['--name-only', '--cached'])
    .then(result => result.split('\n').filter(Boolean))
    .catch(() => []);
  
  if (debug) {
    console.log(`Arquivos em stage após adicionar: ${stagedFiles.join(', ')}`);
  }
  
  if (stagedFiles.length === 0) {
    stageSpinner.fail(`Nenhum arquivo em stage para o tipo ${type}`);
    return false;
  }
  
  stageSpinner.succeed(`${stagedFiles.length} arquivos preparados para commit do tipo ${chalk.cyan(type)}`);
  
  // Realizamos o commit
  const commitSpinner = ora(`Realizando commit ${chalk.cyan(commitMessage)}...`).start();
  
  try {
    await git.commit(commitMessage);
    
    commitSpinner.succeed(`Commit realizado: ${chalk.green(commitMessage)}`);
    
    // Exibir resumo do commit
    console.log(boxen(
      `Commit ${chalk.green(type)} realizado com sucesso!` + 
      `\n${chalk.dim(commitMessage)}` + 
      `\n\nArquivos (${stagedFiles.length}):` + 
      `\n${stagedFiles.map(f => `- ${f}`).join('\n')}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    ));
    
    return true;
  } catch (error) {
    commitSpinner.fail(`Erro ao realizar commit: ${error.message}`);
    
    if (debug) {
      console.error('Detalhes do erro:', error);
    }
    
    return false;
  }
}
