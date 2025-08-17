#!/usr/bin/env node

/**
 * DiffSense - Compilação animada
 * 
 * Este script executa a compilação TypeScript com uma interface visual animada
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
 * Compila o projeto TypeScript com animações
 */
async function buildProject() {
  // Exibir cabeçalho
  console.log(boxen(
    chalk.cyan.bold('DiffSense Build') + '\n' +
    chalk.dim('Compilação TypeScript com interface animada'),
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
  
  // Iniciar compilação
  const buildSpinner = ora('🛠️ Compilando projeto TypeScript...').start();
  
  try {
    // Executar o comando de compilação
    const { stdout, stderr } = await execAsync('tsc', { cwd: projectRoot });
    
    // Se compilação bem-sucedida
    buildSpinner.succeed('✅ Compilação concluída com sucesso');
    
    // Calcular estatísticas
    const modifiedTsFiles = gitFiles.filter(f => f.filePath.endsWith('.ts'));
    const compilationTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Estatísticas por tipo de alteração
    const statusCounts = {
      modified: modifiedTsFiles.filter(f => f.status === 'M').length,
      added: modifiedTsFiles.filter(f => f.status === 'A' || f.status === '??').length,
      deleted: modifiedTsFiles.filter(f => f.status === 'D').length,
      renamed: modifiedTsFiles.filter(f => f.status === 'R').length
    };
    
    // Exibir resumo
    console.log(boxen(
      chalk.bold('📊 Resumo da Compilação 📊\n') +
      `\nTotal de arquivos TypeScript: ${chalk.bold(tsFiles.length)}` +
      `\nArquivos JavaScript gerados: ${chalk.green.bold(tsFiles.length)}` +
      `\nTempo de compilação: ${chalk.cyan.bold(compilationTime)} segundos` +
      `\n\nArquivos modificados: ${chalk.yellow.bold(modifiedTsFiles.length)}` +
      (statusCounts.modified > 0 ? `\n  ${chalk.yellow('↻')} Modificados: ${chalk.yellow.bold(statusCounts.modified)}` : '') +
      (statusCounts.added > 0 ? `\n  ${chalk.green('➕')} Adicionados: ${chalk.green.bold(statusCounts.added)}` : '') +
      (statusCounts.deleted > 0 ? `\n  ${chalk.red('➖')} Removidos: ${chalk.red.bold(statusCounts.deleted)}` : '') +
      (statusCounts.renamed > 0 ? `\n  ${chalk.magenta('↪')} Renomeados: ${chalk.magenta.bold(statusCounts.renamed)}` : '') +
      `\n\n${chalk.green('✅ Build concluído com sucesso!')}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));
    
  } catch (error) {
    buildSpinner.fail('❌ Compilação falhou');
    
    console.log(boxen(
      chalk.bold.red('❌ Erro na Compilação\n') +
      '\nVerifique os erros abaixo e corrija os problemas:\n' +
      `\n${chalk.red(error.stderr || error.message)}`,
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
    await buildProject();
  } catch (error) {
    console.error(chalk.red(`\n❌ Erro: ${error.message || 'Ocorreu um erro desconhecido.'}`));
    console.error(chalk.dim(error.stack));
    process.exit(1);
  }
}

// Executar o script
main();
