// Módulo para interface de usuário do processo de commit
import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';

/**
 * Solicita confirmação do usuário para iniciar o processo de commit
 * @returns {Promise<boolean>} - true se o usuário confirmou, false caso contrário
 */
export async function confirmCommit() {
  const { shouldCommit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldCommit',
      message: 'Deseja iniciar o commit dos arquivos?',
      default: true
    }
  ]);
  
  return shouldCommit;
}

/**
 * Exibe alerta sobre o processo de commit
 */
export function showCommitAlert() {
  console.log(boxen(
    chalk.yellow('⚠️ ATENÇÃO ⚠️\n\n') +
    'Cada tipo de alteração será commitado separadamente.\n' +
    'Você fornecerá uma descrição para cada tipo de alteração.\n' +
    'Arquivos serão adicionados ao Git de acordo com sua classificação.',
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    }
  ));
}

/**
 * Solicita mensagem de commit para um tipo de alteração
 * @param {string} type - Tipo de alteração (feat, fix, etc)
 * @param {number} fileCount - Quantidade de arquivos deste tipo
 * @returns {Promise<string>} - Mensagem de commit fornecida pelo usuário
 */
export async function promptCommitMessage(type, fileCount) {
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
 * Exibe mensagem de sucesso ao final do processo
 * @param {number} commitCount - Quantidade de commits realizados
 */
export function showSuccessMessage(commitCount) {
  if (commitCount > 0) {
    console.log(boxen(
      gradient.pastel(`${commitCount} commits realizados com sucesso!`) + 
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
