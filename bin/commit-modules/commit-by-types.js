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
import { findPackageScopes } from '../../src/utils/scope-finder.js';
import { classifyFilesByScope } from '../../src/utils/scope-classifier.js';
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

// Descrições predefinidas para breaking changes no modo autoComplete
const AUTO_BREAKING_CHANGE_DESCRIPTIONS = {
  'feat': 'altera API de forma incompatível com versões anteriores',
  'fix': 'corrige bug de forma incompatível com versões anteriores',
  'refactor': 'altera a estrutura do código de forma incompatível',
  'docs': 'atualiza documentação com mudanças incompatíveis',
  'test': 'altera testes para refletir mudanças incompatíveis',
  'chore': 'atualiza configurações com mudanças incompatíveis'
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
 * Solicita descrição do breaking change para um tipo de alteração
 * @param {string} type - Tipo de alteração (feat, fix, etc)
 * @param {number} fileCount - Quantidade de arquivos deste tipo
 * @returns {Promise<string>} - Descrição do breaking change fornecida pelo usuário
 */
async function promptBreakingMessage(type, fileCount) {
  const typeDescription = `${type} (${fileCount} arquivos com breaking change)`;
  const { breakingChange } = await inquirer.prompt([
    {
      type: 'input',
      name: 'breakingChange',
      message: `Descreva o breaking change ${chalk.red(typeDescription)} (incompatível):`,
      validate: input => input ? true : 'Descrição do breaking change é obrigatória'
    }
  ]);
  return breakingChange;
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
 * Realiza commit para um grupo específico de arquivos com breaking changes
 * @param {string} type - Tipo de alteração com ! (feat!, fix!, etc)
 * @param {Array} files - Lista de arquivos para commit
 * @param {string} message - Mensagem de commit
 * @param {string} breakingChangeDesc - Descrição específica do breaking change
 * @returns {Promise<boolean>} - true se o commit foi realizado com sucesso
 */
async function commitBreakingChange(type, files, message, breakingChangeDesc) {
  const commitMessage = `${type}: ${message}\n\nBREAKING CHANGE: ${breakingChangeDesc}`;
  const spinner = ora(`Realizando commit com breaking change ${chalk.red(type)}...`).start();
  
  try {
    // Preparar o comando de commit
    const fileList = files.map(file => `"${file.filePath}"`).join(' ');
    const commitCommand = `git commit -m "${commitMessage}" --only ${fileList}`;
    
    // Executar o commit
    await execAsync(commitCommand);
    
    spinner.succeed(`Commit com breaking change realizado: ${chalk.red(type)}`);
    
    // Exibir resumo do commit
    console.log(boxen(
      `Commit ${chalk.red(type)} com Breaking Change realizado com sucesso!` + 
      `\n${chalk.dim(message)}` + 
      `\n\n${chalk.red('BREAKING CHANGE:')} ${chalk.dim(breakingChangeDesc)}` + 
      `\n\nArquivos (${files.length}):` + 
      `\n${files.map(f => `- ${f.filePath}`).join('\n')}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red',
      }
    ));
    
    return true;
  } catch (error) {
    spinner.fail(`Erro ao realizar commit com breaking change: ${error.message}`);
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
  // Encontrar escopos no projeto
  const scopes = await findPackageScopes(process.cwd());
  // Mapear arquivos por escopo
  const filePaths = files.map(f => f.filePath);
  const scopeGroups = classifyFilesByScope(filePaths, scopes);
  
  // Para cada escopo, agrupar por tipo e commitar
  for (const scopeName of Object.keys(scopeGroups)) {
    const pathsInScope = scopeGroups[scopeName];
    if (!pathsInScope.length) continue;
    // Filtrar objetos de arquivos que pertencem a este escopo
    const scopedFiles = files.filter(f => pathsInScope.includes(f.filePath));
    // Separar normais e breaking
    const normalFiles = scopedFiles.filter(f => !f.isBreakingChange);
    const breakingFiles = scopedFiles.filter(f => f.isBreakingChange);
    // Agrupar por tipo
    const normalByType = groupFilesByType(normalFiles);
    const breakingByType = groupFilesByType(breakingFiles);
    
    // Realizar commits normais
    for (const type of Object.keys(normalByType)) {
      const group = normalByType[type];
      if (group.length === 0) continue;
      const commitScope = `${type}(${scopeName})`;
      let message = autoComplete ? AUTO_DESCRIPTIONS[type] : await promptCommitMessage(type, group.length);
      await commitFiles(commitScope, group, message);
    }
    // Realizar commits breaking
    for (const type of Object.keys(breakingByType)) {
      const group = breakingByType[type];
      if (group.length === 0) continue;
      const commitScope = `${type}!(${scopeName})`;
      let message = autoComplete ? AUTO_DESCRIPTIONS[type] : await promptCommitMessage(type, group.length);
      const breakingDesc = autoComplete ? AUTO_BREAKING_CHANGE_DESCRIPTIONS[type] : await promptBreakingMessage(type, group.length);
      await commitBreakingChange(commitScope, group, message, breakingDesc);
    }
  }
  
  if (normalCommitTypes.length === 0 && breakingCommitTypes.length === 0) {
    console.log(chalk.yellow('Nenhum tipo de alteração identificado para commit.'));
    return;
  }
  
  console.log(chalk.cyan(`\n📦 Tipos de alteração normais: ${normalCommitTypes.join(', ') || 'Nenhum'}`));
  console.log(chalk.red(`\n📦 Tipos de alteração com breaking changes: ${breakingCommitTypes.join(', ') || 'Nenhum'}`));
  
  // Contador de commits realizados
  let commitCount = 0;
  
  // Processar primeiro os tipos de alteração normais
  for (const type of normalCommitTypes) {
    const typedFiles = normalFilesByType[type];
    
    if (!typedFiles || typedFiles.length === 0) {
      continue;
    }
    
    console.log(chalk.cyan(`\n🔖 Processando alterações normais do tipo: ${type} - ${getChangeTypeDescription(type)}`));
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
    
    // Realizar o commit para arquivos normais
    const success = await commitFiles(type, typedFiles, commitMessage);
    
    if (success) {
      commitCount++;
    }
  }
  
  // Processar os tipos de alteração com breaking changes
  for (const type of breakingCommitTypes) {
    const typedFiles = breakingFilesByType[type];
    
    if (!typedFiles || typedFiles.length === 0) {
      continue;
    }
    
    console.log(chalk.red(`\n⚠️ Processando alterações BREAKING CHANGE do tipo: ${type} - ${getChangeTypeDescription(type)}`));
    console.log(chalk.dim(`${typedFiles.length} arquivos classificados como "${type}" com breaking changes`));
    
    // Listar os arquivos com breaking changes
    typedFiles.forEach(file => {
      console.log(chalk.yellow(`- ${file.filePath}: ${file.breakingChangeReason || 'Alteração incompatível'}`));
    });
    
    // Definir a mensagem do commit para breaking change
    let commitMessage = '';
    let breakingChangeDescription = '';
    
    if (autoComplete) {
      // Usar descrição predefinida para breaking change
      commitMessage = AUTO_DESCRIPTIONS[type] || `atualiza arquivos do tipo ${type}`;
      
      // Obter razões específicas dos breaking changes encontrados
      const reasons = typedFiles
        .filter(file => file.breakingChangeReason)
        .map(file => file.breakingChangeReason);
      
      // Se tivermos razões específicas, usar a primeira como descrição
      if (reasons.length > 0) {
        breakingChangeDescription = reasons[0];
      } else {
        // Caso contrário, usar descrição genérica baseada no tipo
        breakingChangeDescription = AUTO_BREAKING_CHANGE_DESCRIPTIONS[type] || 
          'Alteração incompatível detectada automaticamente';
      }
      
      console.log(chalk.dim(`Usando descrição automática: "${commitMessage}"`));
      console.log(chalk.dim(`Descrição do breaking change: "${breakingChangeDescription}"`));
    } else {
      // Solicitar descrição do commit
      commitMessage = await promptCommitMessage(type, typedFiles.length);
      
      // Solicitar descrição específica do breaking change
      const { breakingChange } = await inquirer.prompt([
        {
          type: 'input',
          name: 'breakingChange',
          message: chalk.red('Descreva o breaking change (alteração incompatível):'),
          validate: (input) => {
            if (!input) return 'A descrição do breaking change é obrigatória';
            return true;
          }
        }
      ]);
      
      breakingChangeDescription = breakingChange;
    }
    
    // Realizar o commit para breaking changes (adicionando o marcador '!')
    const commitType = `${type}!`;
    const success = await commitBreakingChange(commitType, typedFiles, commitMessage, breakingChangeDescription);
    
    if (success) {
      commitCount++;
    }
    
    if (success) {
      commitCount++;
    }
  }
  
  // Exibir resumo final
  if (commitCount > 0) {
    console.log(boxen(
      chalk.cyan.bold(`${commitCount} commits realizados com sucesso!`)+
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

// Exportar funções de commit para uso no fluxo rápido
export { commitFiles, commitBreakingChange };
