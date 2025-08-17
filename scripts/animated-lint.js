#!/usr/bin/env node

/**
 * DiffSense - Lint animado
 * 
 * Este script executa o linting do código com uma interface visual animada
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
 * Processa o resultado do ESLint para formatação
 * @param {string} output Saída bruta do ESLint
 * @returns {Object} Resultado processado com estatísticas
 */
function processLintResults(output) {
  const lines = output.split('\n');
  let errors = 0;
  let warnings = 0;
  
  for (const line of lines) {
    if (line.includes('✖')) {
      const match = line.match(/(\d+)\s+errors/);
      if (match) {
        errors = parseInt(match[1], 10);
      }
      
      const warningMatch = line.match(/(\d+)\s+warnings/);
      if (warningMatch) {
        warnings = parseInt(warningMatch[1], 10);
      }
    }
  }
  
  return {
    errors,
    warnings,
    hasIssues: errors > 0 || warnings > 0,
    output: output
  };
}

/**
 * Executa o linting do código com animações
 */
async function lintCode() {
  // Exibir cabeçalho
  console.log(boxen(
    chalk.cyan.bold('DiffSense Lint') + '\n' +
    chalk.dim('Verificação de qualidade de código com interface animada'),
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
  
  // Iniciar linting
  const lintSpinner = ora('🔍 Verificando qualidade do código...').start();
  
  try {
    // Executar o comando de lint
    const { stdout, stderr } = await execAsync('pnpm exec eslint . --ext .ts --max-warnings 100', { cwd: projectRoot });
    
    // Se linting bem-sucedido
    lintSpinner.succeed('✅ Verificação de qualidade concluída com sucesso');
    
    // Calcular estatísticas
    const modifiedTsFiles = gitFiles.filter(f => f.filePath.endsWith('.ts'));
    const lintTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Exibir resumo
    console.log(boxen(
      chalk.bold('🧹 Resumo do Lint 🧹\n') +
      `\nTotal de arquivos TypeScript: ${chalk.bold(tsFiles.length)}` +
      `\nArquivos verificados: ${chalk.green.bold(tsFiles.length)}` +
      `\nTempo de verificação: ${chalk.cyan.bold(lintTime)} segundos` +
      `\n\nArquivos modificados: ${chalk.yellow.bold(modifiedTsFiles.length)}` +
      `\n\n${chalk.green('✅ Código está em conformidade com os padrões!')}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));
    
  } catch (error) {
    lintSpinner.fail('❌ Verificação de qualidade falhou');
    
    // Processar resultados do lint
    const lintResults = processLintResults(error.stdout || error.stderr || error.message);
    
    console.log(boxen(
      chalk.bold.red(`❌ Problemas de Qualidade Encontrados\n`) +
      `\nErros: ${chalk.red.bold(lintResults.errors)}` +
      `\nAvisos: ${chalk.yellow.bold(lintResults.warnings)}` +
      '\n\nDetalhes dos problemas:\n' +
      `\n${lintResults.output}`,
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
    await lintCode();
  } catch (error) {
    console.error(chalk.red(`\n❌ Erro: ${error.message || 'Ocorreu um erro desconhecido.'}`));
    console.error(chalk.dim(error.stack));
    process.exit(1);
  }
}

// Executar o script
main();
