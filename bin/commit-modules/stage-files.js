/**
 * Módulo para adicionar todos os arquivos ao stage do Git
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Adiciona todos os arquivos modificados ao stage do Git
 * @returns {Promise<void>}
 */
export async function stageAllFiles() {
  const spinner = ora('Adicionando arquivos ao stage (git add .)...').start();
  
  try {
    await execAsync('git add .');
    spinner.succeed(chalk.green('Arquivos adicionados ao stage com sucesso'));
    
    // Verificar se existem arquivos para commit
    const { stdout } = await execAsync('git status --porcelain');
    
    if (!stdout.trim()) {
      spinner.fail('Nenhuma alteração detectada para commit');
      console.log(chalk.yellow('Não há alterações para commit. Verifique se você salvou suas alterações.'));
      process.exit(0);
    }
    
    return;
  } catch (error) {
    spinner.fail(`Erro ao adicionar arquivos ao stage: ${error.message}`);
    console.error(chalk.red('Detalhes do erro:'), error);
    throw new Error('Falha ao preparar arquivos para análise');
  }
}
