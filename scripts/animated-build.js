#!/usr/bin/env node

import ora from 'ora';
import chalk from 'chalk';
import gradient from 'gradient-string';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import boxen from 'boxen';
import { fileURLToPath } from 'url';

// Converter exec para Promises
const execAsync = promisify(exec);

// Obter diretório do script atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Função para simular um atraso
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para obter todos os arquivos TypeScript
async function getTsFiles(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('node_modules') && !file.name.startsWith('dist')) {
      await getTsFiles(fullPath, fileList);
    } else if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
      fileList.push(fullPath);
    }
  }
  
  return fileList;
}

// Função para obter o status Git dos arquivos
async function getGitStatus() {
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
    
    return modifiedFiles;
  } catch (error) {
    console.error('Erro ao obter status do Git:', error);
    return [];
  }
}

// Função para verificar se um arquivo foi modificado
function isFileModified(file, modifiedFiles) {
  return modifiedFiles.some(mf => file.includes(mf.filePath));
}

// Função para construir o indicador de status
function getStatusIndicator(file, modifiedFiles) {
  const modifiedFile = modifiedFiles.find(mf => file.includes(mf.filePath));
  
  if (modifiedFile) {
    switch (modifiedFile.status) {
      case 'M':
        return chalk.bold.yellow('↻'); // Modificado
      case 'A':
        return chalk.bold.green('➕'); // Adicionado
      case 'D':
        return chalk.bold.red('➖'); // Deletado
      case '??':
        return chalk.bold.blue('❔'); // Não rastreado
      case 'R':
        return chalk.bold.magenta('↪'); // Renomeado
      default:
        return chalk.bold.yellow('↻'); // Qualquer outro status
    }
  }
  return chalk.green('✓'); // Não modificado
}

// Variável para medir o tempo de compilação
let startTime;

// Função para exibir o título com animação
async function displayAnimatedTitle() {
  const title = '🚀 DiffSense Build com Animação 🚀';
  const frames = [
    gradient.morning(title),
    gradient.cristal(title),
    gradient.teen(title),
    gradient.mind(title),
    gradient.pastel(title)
  ];
  
  // Exibir cada frame com um pequeno atraso
  for (let i = 0; i < frames.length; i++) {
    if (i > 0) process.stdout.write('\r\x1b[K');
    process.stdout.write(frames[i]);
    await sleep(100);
  }
  
  console.log('\n');
  
  return frames[frames.length - 1];
}

// Função principal
async function animatedBuild() {
  // Registrar hora de início
  startTime = Date.now();
  
  // Exibir título animado
  const finalTitle = await displayAnimatedTitle();
  
  console.log(boxen(
    finalTitle,
    { 
      padding: 1, 
      margin: 1, 
      borderStyle: 'round', 
      borderColor: 'cyan' 
    }
  ));

  // Obter arquivos modificados via Git
  const gitFiles = await getGitStatus();
  
  // Spinners para as diferentes fases
  const initSpinner = ora('Inicializando compilação TypeScript...').start();
  await sleep(1000);
  initSpinner.succeed('Inicialização concluída');
  
  // Obter todos os arquivos TypeScript
  const scanningSpinner = ora('Escaneando arquivos TypeScript...').start();
  const tsFiles = await getTsFiles(projectRoot);
  scanningSpinner.succeed(`Encontrados ${tsFiles.length} arquivos TypeScript`);
  
  // Animação de preparação
  const prepSpinner = ora('Preparando compilador TypeScript...').start();
  await sleep(800);
  prepSpinner.succeed('Compilador TypeScript pronto');

  // Iniciar compilação real
  const buildSpinner = ora('Compilando arquivos...').start();
  
  // Executar build em segundo plano
  const buildProcess = exec('tsc', { cwd: projectRoot });
  
  // Animação de compilação de arquivos
  let index = 0;
  const fileInterval = setInterval(() => {
    if (index < tsFiles.length) {
      const file = tsFiles[index];
      const relativePath = path.relative(projectRoot, file);
      const statusIndicator = getStatusIndicator(file, gitFiles);
      
      buildSpinner.text = `Compilando [${index + 1}/${tsFiles.length}]: ${statusIndicator} ${chalk.dim(relativePath)}`;
      
      // Se o arquivo foi modificado, destaque-o
      if (isFileModified(file, gitFiles)) {
        const modifiedFile = gitFiles.find(mf => file.includes(mf.filePath));
        let statusText = '(modificado)';
        let statusColor = chalk.yellow;
        
        if (modifiedFile) {
          switch (modifiedFile.status) {
            case 'A':
              statusText = '(novo arquivo)';
              statusColor = chalk.green;
              break;
            case 'D':
              statusText = '(arquivo removido)';
              statusColor = chalk.red;
              break;
            case '??':
              statusText = '(não rastreado)';
              statusColor = chalk.blue;
              break;
            case 'R':
              statusText = '(renomeado)';
              statusColor = chalk.magenta;
              break;
          }
        }
        
        console.log(`  ${statusColor('→')} ${statusColor(relativePath)} ${chalk.dim(statusText)}`);
      }
      
      index++;
    } else {
      clearInterval(fileInterval);
      buildSpinner.text = 'Finalizando compilação...';
    }
  }, 100);
  
  // Esperar a compilação terminar
  buildProcess.on('exit', async (code) => {
    clearInterval(fileInterval);
    
    if (code === 0) {
      buildSpinner.succeed('Compilação concluída com sucesso');
      
      // Calcular arquivos modificados e compilados
      const modifiedTsFiles = gitFiles.filter(f => f.filePath.endsWith('.ts'));
      const modifiedCount = modifiedTsFiles.length;
      
      // Contar por tipo de modificação
      const statusCounts = {
        modified: modifiedTsFiles.filter(f => f.status === 'M').length,
        added: modifiedTsFiles.filter(f => f.status === 'A' || f.status === '??').length,
        deleted: modifiedTsFiles.filter(f => f.status === 'D').length,
        renamed: modifiedTsFiles.filter(f => f.status === 'R').length
      };
      
      // Tempo de compilação
      const compilationTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(boxen(
        chalk.bold(gradient.fruit('\n📊 Resumo da Compilação 📊\n')) +
        `\nTotal de arquivos TypeScript: ${chalk.bold(tsFiles.length)}` +
        `\nArquivos JavaScript gerados: ${chalk.green.bold(tsFiles.length)}` +
        `\nTempo de compilação: ${chalk.cyan.bold(compilationTime)} segundos` +
        `\n\nArquivos modificados: ${chalk.yellow.bold(modifiedCount)}` +
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
    } else {
      buildSpinner.fail(`Compilação falhou com código ${code}`);
      console.log(boxen(
        chalk.bold(gradient.passion('\n❌ Erros na Compilação ❌\n')) +
        `\nVerifique os erros acima e corrija os problemas nos arquivos.`,
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'red'
        }
      ));
    }
  });
  
  // Capturar e exibir erros
  let errorOutput = '';
  buildProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log(chalk.red(data.toString().trim()));
  });
}

// Executar
animatedBuild().catch(error => {
  console.error('Erro durante a compilação:', error);
  process.exit(1);
});
