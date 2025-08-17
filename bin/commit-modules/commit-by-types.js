/**
 * Módulo para realizar commits por tipo de alteração
 */
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';
import chalk from 'chalk';
import boxen from 'boxen';
import { groupFilesByType } from './analyze-changes.js';
import { getChangeTypeDescription } from '../../dist/index.js';

const execAsync = promisify(exec);

// Descrições predefinidas para commits automáticos
const AUTO_DESCRIPTIONS = {
  'feat': 'adiciona nova funcionalidade',
  'fix': 'corrige problemas',
  'docs': 'atualiza documentação',
  'refactor': 'melhora a estrutura do código',
  'test': 'adiciona ou atualiza testes',
  'chore': 'atualiza configurações e dependências'
};

/**
 * Solicita mensagem de commit para um tipo de alteração
 * @param {string} type - Tipo de alteração (feat, fix, etc)
 * @param {number} fileCount - Quantidade de arquivos deste tipo
 * @returns {Promise<string>} - Mensagem de commit fornecida pelo usuário
 */
async function promptCommitMessage(type, fileCount) {
  const typeDescription = `${type} (${fileCount} arquivos)`;
  
  const { commitMessage } = await inquirer.prompt([
    {
      type: 'input',
      name: 'commitMessage',
      message: `Informe a descrição das modificações ${chalk.cyan(typeDescription)} (max 100 caracteres):`,
      validate: (input) => {
        if (!input) return 'A descrição é obrigatória';
        if (input.length > 100) return 'A descrição deve ter no máximo 100 caracteres';
        return true;
      }
    }
  ]);
  
  return commitMessage;
}

/**
 * Realiza commit para um grupo específico de arquivos
 * @param {string} type - Tipo de alteração (feat, fix, etc)
 * @param {Array} files - Lista de arquivos para commit
 * @param {string} message - Mensagem de commit
 * @returns {Promise<boolean>} - true se o commit foi realizado com sucesso
 */
async function commitFiles(type, files, message) {
  const commitMessage = `${type}: ${message}`;
  const spinner = ora(`Realizando commit ${chalk.cyan(commitMessage)}...`).start();
  
  try {
    // Preparar o comando de commit
    const fileList = files.map(file => `"${file.filePath}"`).join(' ');
    const commitCommand = `git commit -m "${commitMessage}" --only ${fileList}`;
    
    // Executar o commit
    await execAsync(commitCommand);
    
    spinner.succeed(`Commit realizado: ${chalk.green(commitMessage)}`);
    
    // Exibir resumo do commit
    console.log(boxen(
      `Commit ${chalk.green(type)} realizado com sucesso!` + 
      `\n${chalk.dim(commitMessage)}` + 
      `\n\nArquivos (${files.length}):` + 
      `\n${files.map(f => `- ${f.filePath}`).join('\n')}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    ));
    
    return true;
  } catch (error) {
    spinner.fail(`Erro ao realizar commit: ${error.message}`);
    console.error(chalk.red('Detalhes do erro:'), error);
    return false;
  }
}

/**
 * Realiza commits para cada tipo de alteração
 * @param {Object} analysisResult - Resultado da análise de alterações
 * @param {boolean} autoComplete - Se true, usa descrições predefinidas
 * @returns {Promise<void>}
 */
export async function commitByTypes(analysisResult, autoComplete) {
  const { files } = analysisResult;
  
  // Agrupar arquivos por tipo primário
  const filesByType = groupFilesByType(files);
  const commitTypes = Object.keys(filesByType);
  
  if (commitTypes.length === 0) {
    console.log(chalk.yellow('Nenhum tipo de alteração identificado para commit.'));
    return;
  }
  
  console.log(chalk.cyan(`\n📦 Tipos de alteração encontrados: ${commitTypes.join(', ')}`));
  
  // Contador de commits realizados
  let commitCount = 0;
  
  // Processar cada tipo de alteração
  for (const type of commitTypes) {
    const typedFiles = filesByType[type];
    
    if (!typedFiles || typedFiles.length === 0) {
      continue;
    }
    
    console.log(chalk.cyan(`\n🔖 Processando alterações do tipo: ${type} - ${getChangeTypeDescription(type)}`));
    console.log(chalk.dim(`${typedFiles.length} arquivos classificados como "${type}"`));
    
    // Definir a mensagem do commit
    let commitMessage = '';
    
    if (autoComplete) {
      // Usar descrição predefinida
      commitMessage = AUTO_DESCRIPTIONS[type] || `atualiza arquivos do tipo ${type}`;
      console.log(chalk.dim(`Usando descrição automática: "${commitMessage}"`));
    } else {
      // Solicitar descrição do usuário
      commitMessage = await promptCommitMessage(type, typedFiles.length);
    }
    
    // Realizar o commit
    const success = await commitFiles(type, typedFiles, commitMessage);
    
    if (success) {
      commitCount++;
    }
  }
  
  // Exibir resumo final
  if (commitCount > 0) {
    console.log(boxen(
      chalk.cyan.bold(`${commitCount} commits realizados com sucesso!`) + 
      '\n\n' + chalk.dim('Você pode usar "git push" para enviar as alterações para o repositório remoto.'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    ));
  } else {
    console.log(chalk.yellow('\nNenhum commit foi realizado.'));
  }
}
