#!/usr/bin/env node

/**
 * DiffSense - Verificação de tipos animada
 * 
 * Este script executa a verificação de tipos TypeScript com uma interface visual animada
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import chalk from 'chalk';
import boxen from 'boxen';

// Converter exec para Promises
const execAsync = promisify(exec);

// Obter diretório do script atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Função para simular um atraso
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtém todos os arquivos TypeScript do projeto
 * @param {string} dir Diretório raiz do projeto
 * @returns {Promise<string[]>} Lista de arquivos TypeScript
 */
async function getTsFiles(dir) {
  const spinner = ora('🔍 Procurando arquivos TypeScript...').start();
  
  try {
    const fileList = [];
    await scanDirectory(dir, fileList);
    
    spinner.succeed(`✅ Encontrados ${chalk.bold(fileList.length)} arquivos TypeScript`);
    return fileList;
  } catch (error) {
    spinner.fail('❌ Erro ao procurar arquivos TypeScript');
    console.error(chalk.red('Erro:'), error.message);
    throw new Error('Falha ao escanear arquivos do projeto');
  }
}

/**
 * Escaneia recursivamente um diretório em busca de arquivos TypeScript
 * @param {string} dir Diretório a ser escaneado
 * @param {string[]} fileList Lista acumulada de arquivos
 */
async function scanDirectory(dir, fileList) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && 
          !file.name.startsWith('node_modules') && 
          !file.name.startsWith('dist')) {
        await scanDirectory(fullPath, fileList);
      } else if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore erros de permissão ou acesso
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      throw error;
    }
  }
}

/**
 * Obtém o status Git dos arquivos
 * @returns {Promise<Array>} Lista de arquivos modificados e seus status
 */
async function getGitStatus() {
  const spinner = ora('Verificando alterações no Git...').start();
  
  try {
    const { stdout } = await execAsync('git status --porcelain=v1');
    
    const modifiedFiles = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const status = line.substring(0, 2).trim();
        const filePath = line.substring(3);
        return { status, filePath };
      });
    
    spinner.succeed(`Encontradas ${chalk.bold(modifiedFiles.length)} alterações no Git`);
    return modifiedFiles;
  } catch (error) {
    spinner.warn('Não foi possível verificar status do Git');
    return [];
  }
}

/**
 * Executa a verificação de tipos do TypeScript com animações
 */
async function checkTypes() {
  // Exibir cabeçalho
  console.log(boxen(
    chalk.cyan.bold('DiffSense Check Types') + '\n' +
    chalk.dim('Verificação de tipos TypeScript com interface animada'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    }
  ));
  
  // Registrar hora de início
  const startTime = Date.now();
  
  // Obter arquivos modificados via Git
  const gitFiles = await getGitStatus();
  
  // Obter todos os arquivos TypeScript
  const tsFiles = await getTsFiles(projectRoot);
  
  // Iniciar verificação de tipos
  const checkSpinner = ora('🔎 Verificando tipos TypeScript...').start();
  
  try {
    // Executar o comando de verificação de tipos
    const { stdout, stderr } = await execAsync('tsc --noEmit', { cwd: projectRoot });
    
    // Se verificação bem-sucedida
    checkSpinner.succeed('✅ Verificação de tipos concluída com sucesso');
    
    // Calcular estatísticas
    const modifiedTsFiles = gitFiles.filter(f => f.filePath.endsWith('.ts'));
    const checkTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Exibir resumo
    console.log(boxen(
      chalk.bold('🔍 Resumo da Verificação de Tipos 🔍\n') +
      `\nTotal de arquivos TypeScript: ${chalk.bold(tsFiles.length)}` +
      `\nArquivos verificados: ${chalk.green.bold(tsFiles.length)}` +
      `\nTempo de verificação: ${chalk.cyan.bold(checkTime)} segundos` +
      `\n\nArquivos modificados: ${chalk.yellow.bold(modifiedTsFiles.length)}` +
      `\n\n${chalk.green('✅ Nenhum erro de tipo encontrado!')}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));
    
  } catch (error) {
    checkSpinner.fail('❌ Verificação de tipos falhou');
    
    // Formatar e exibir erros de tipo
    const typeErrors = error.stderr || error.message;
    
    console.log(boxen(
      chalk.bold.red('❌ Erros de Tipo Encontrados\n') +
      '\nCorriga os seguintes erros de tipo:\n' +
      `\n${chalk.red(typeErrors)}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red'
      }
    ));
    
    process.exit(1);
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    await checkTypes();
  } catch (error) {
    console.error(chalk.red(`\n❌ Erro: ${error.message || 'Ocorreu um erro desconhecido.'}`));
    console.error(chalk.dim(error.stack));
    process.exit(1);
  }
}

// Executar o script
main();
