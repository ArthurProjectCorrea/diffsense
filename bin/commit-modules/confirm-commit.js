/**
 * Módulo para confirmar se o usuário deseja prosseguir com o commit
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Exibe um alerta sobre o processo de commit
 */
function showCommitAlert() {
  const message = [
    '  ATENÇÃO ',
    '',
    'Cada tipo de alteração será commitado separadamente.',
    'Você fornecerá uma descrição para cada tipo de alteração.',
    'Os arquivos serão agrupados por tipo de alteração nos commits.',
  ].join('\n');
  console.log(
    boxen(chalk.yellow(message), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      align: 'center'
    })
  );
}

/**
 * Solicita confirmação do usuário para iniciar o processo de commit
 * @returns {Promise<boolean>} - true se o usuário confirmou, false caso contrário
 */
export async function confirmCommit() {
  // Exibir informações sobre o processo
  showCommitAlert();
  
  // Solicitar confirmação
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
