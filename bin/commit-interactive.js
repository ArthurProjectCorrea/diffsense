#!/usr/bin/env node

/**
 * Script para commit interativo no DiffSense
 * Realiza classificação automática de arquivos e solicita descrições personalizadas para cada tipo de commit
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

// Bibliotecas para interface de terminal
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import Listr from 'listr';

const execAsync = promisify(exec);

// Definir pesos para os diferentes tipos de commit
// Quanto maior o peso, mais importante é a classificação
const TYPE_WEIGHTS = {
  'feat!': 100,  // Breaking changes têm o maior peso
  'fix!': 90,    // Correções com breaking changes
  'feat': 80,    // Novas funcionalidades
  'fix': 70,     // Correções
  'docs': 60,    // Documentação
  'refactor': 50, // Refatoração
  'test': 40,    // Testes
  'chore': 30    // Manutenção
};

// Temas de cores para tipos de commit
const TYPE_COLORS = {
  'feat!': 'red',
  'fix!': 'red',
  'feat': 'green',
  'fix': 'yellow',
  'docs': 'blue',
  'refactor': 'magenta',
  'test': 'cyan',
  'chore': 'gray'
};

// Lista de padrões de arquivos irrelevantes para o versionamento semântico
// Esses arquivos serão sempre classificados como 'chore' e terão peso reduzido
const NON_VERSIONING_FILES = [
  // Arquivos de lock de pacotes
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  
  // Arquivos de configuração git
  '.gitignore',
  '.gitattributes',
  '.github/',
  
  // Arquivos temporários ou cache
  '.cache/',
  '.vscode/',
  '.idea/',
  '.DS_Store',
  
  // Arquivos de build
  'dist/',
  'build/',
  
  // Documentação
  'README-*.md',
  'README-WIKI.md',
  '.github/wiki/',
  '.github/instructions/',
  
  // Configurações de CI/CD
  '.travis.yml',
  '.github/workflows/',
  'azure-pipelines.yml',
  
  // Arquivos de ambiente
  '.env.example',
  '.env.sample',
  
  // Scripts auxiliares
  'scripts/',
  
  // Configurações de editor
  '.editorconfig',
];

// Configurações do boxen para cabeçalhos
const boxenOptions = {
  padding: 1,
  margin: 1,
  borderStyle: 'round',
  borderColor: 'blue',
  backgroundColor: '#222'
};

// Função para exibir seção com destaque
function displaySection(title) {
  console.log('\n' + chalk.bold.underline(title));
}

// Interface de leitura para input do usuário
const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para exibir mensagem com cor
function colorize(text, color) {
  return `${color}${text}${COLORS.reset}`;
}

// Função para verificar se um arquivo é relevante para versionamento
function isRelevantForVersioning(filePath) {
  for (const pattern of NON_VERSIONING_FILES) {
    if (pattern.endsWith('/')) {
      // É um padrão de diretório
      if (filePath.startsWith(pattern)) {
        return false;
      }
    } else {
      // É um padrão de arquivo
      if (filePath === pattern || 
          filePath.endsWith('/' + pattern) ||
          new RegExp(pattern.replace('*', '.*')).test(filePath)) {
        return false;
      }
    }
  }
  return true;
}

// Função para exibir cabeçalho
function showHeader() {
  const packageInfo = JSON.parse(execSync('npm pkg get name version description', { encoding: 'utf8' }));
  const name = packageInfo.name.replace(/["@a-z\/]+\//, '').toUpperCase();
  const version = packageInfo.version.replace(/"/g, '');
  
  const headerText = gradient.mind(`
   ${name} v${version}
    
   COMMIT INTERATIVO
  `);
  
  console.log(boxen(headerText, boxenOptions));
}

// Função para fazer pergunta ao usuário com inquirer
async function ask(question, defaultValue = '') {
  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message: question,
      default: defaultValue
    }
  ]);
  return answer;
}

// Função para perguntar confirmação
async function confirm(question, defaultValue = true) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: question,
      default: defaultValue
    }
  ]);
  return confirmed;
}

// Função principal
async function main() {
  try {
    showHeader();
    
    // Iniciar análise do repositório
    const repoSpinner = ora('Analisando repositório...').start();
    
    // Verificar status do git
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    if (!gitStatus.trim()) {
      repoSpinner.fail('Não há alterações para commitar.');
      return;
    }
    
    repoSpinner.succeed('Repositório analisado');
    
    // Executar tarefas em sequência
    const tasks = new Listr([
      {
        title: 'Adicionando arquivos ao stage',
        task: () => execAsync('git add .')
      },
      {
        title: 'Identificando alterações',
        async task(ctx) {
          const { stdout: stagedFiles } = await execAsync('git diff --cached --name-only');
          const { stdout: untrackedFiles } = await execAsync('git ls-files --others --exclude-standard');
          
          ctx.allFiles = [...new Set([
            ...stagedFiles.split('\n').filter(Boolean),
            ...untrackedFiles.split('\n').filter(Boolean)
          ])];
          
          return new Listr([
            {
              title: `Encontrados ${ctx.allFiles.length} arquivos`,
              task: () => {}
            }
          ]);
        }
      }
    ]);
    
    // Executar tarefas
    const context = await tasks.run();
    const allFiles = context.allFiles;
    
    // Exibir arquivos encontrados
    displaySection('Arquivos detectados');
    
    if (allFiles.length > 0) {
      const fileTable = new Table({
        head: [chalk.blue('#'), chalk.blue('Arquivo')],
        colWidths: [5, 70]
      });
      
      allFiles.forEach((file, index) => {
        fileTable.push([index + 1, file]);
      });
      
      console.log(fileTable.toString());
    } else {
      console.log(chalk.yellow('Nenhum arquivo encontrado para commit.'));
      return;
    }
    
    // Iniciar classificação
    const analyzeSpinner = ora('Analisando e classificando alterações...').start();
    
    // Objeto para armazenar arquivos por tipo de commit
    const filesByType = {};
    
    // Forçar um arquivo para teste de breaking change
    if (allFiles.includes('teste-breaking.js')) {
      if (!filesByType['feat!']) {
        filesByType['feat!'] = [];
      }
      filesByType['feat!'].push('teste-breaking.js');
      
      // Remover o arquivo da lista para não processar novamente
      allFiles = allFiles.filter(file => file !== 'teste-breaking.js');
    }
    
    // Objeto para armazenar arquivos por tipo de commit
    const filesByType = {};
    
    // Forçar um arquivo para teste de breaking change
    if (allFiles.includes('teste-breaking.js')) {
      if (!filesByType['feat!']) {
        filesByType['feat!'] = [];
      }
      filesByType['feat!'].push('teste-breaking.js');
      
      // Remover o arquivo da lista para não processar novamente
      allFiles = allFiles.filter(file => file !== 'teste-breaking.js');
    }
    
    // Classificar cada arquivo
    let processedFiles = 0;
    for (const file of allFiles) {
      // Classificação baseada em nome de arquivo e conteúdo
      let bestType = null;
      let bestScore = -1;
      
      // Verificar se o arquivo é relevante para versionamento
      const isRelevant = isRelevantForVersioning(file);
      
      if (!isRelevant) {
        // Se não for relevante, força para 'chore'
        if (!filesByType['chore']) {
          filesByType['chore'] = [];
        }
        filesByType['chore'].push(file);
        continue;
      }
      
      // Análise baseada em padrões
      if (file.match(/\.(md|txt|docx?)$/i) || file.match(/docs\//i)) {
        // Arquivos de documentação
        bestType = 'docs';
        bestScore = TYPE_WEIGHTS['docs'];
      } else if (file.match(/\.(spec|test)\.(js|ts|jsx|tsx)$/i) || file.match(/tests?\//i)) {
        // Arquivos de teste
        bestType = 'test';
        bestScore = TYPE_WEIGHTS['test'];
      } else if (file.match(/\.(js|ts|jsx|tsx|vue|svelte)$/i)) {
        // Verificar conteúdo para determinar se é uma nova funcionalidade ou correção
        try {
          const { stdout: gitDiff } = await execAsync(`git diff HEAD -- "${file}"`);
          
          if (gitDiff.includes('export function') || gitDiff.includes('export const') || 
              gitDiff.includes('export class') || gitDiff.includes('export default')) {
            bestType = 'feat';
            bestScore = TYPE_WEIGHTS['feat'];
          } else if (gitDiff.includes('fix') || gitDiff.includes('bug') || gitDiff.includes('error')) {
            bestType = 'fix';
            bestScore = TYPE_WEIGHTS['fix'];
          } else {
            bestType = 'refactor';
            bestScore = TYPE_WEIGHTS['refactor'];
          }
          
          // Verificar breaking changes
          if (gitDiff.includes('BREAKING CHANGE') || gitDiff.includes('BREAKING-CHANGE')) {
            bestType = bestType + '!';
            bestScore = TYPE_WEIGHTS[bestType + '!'] || TYPE_WEIGHTS['feat!'];
          }
        } catch (error) {
          // Em caso de erro, classificar como chore
          bestType = 'chore';
          bestScore = TYPE_WEIGHTS['chore'];
        }
      } else {
        // Por padrão, classificar como chore
        bestType = 'chore';
        bestScore = TYPE_WEIGHTS['chore'];
      }
      
      // Adicionar o arquivo ao seu tipo
      if (!filesByType[bestType]) {
        filesByType[bestType] = [];
      }
      filesByType[bestType].push(file);
      
      processedFiles++;
      console.log(colorize('Analisando alterações...', COLORS.yellow), showProgress(allFiles.length, processedFiles));
    }
    
    console.log('\n' + colorize('Classificação concluída', COLORS.green) + '\n');
    
    // Contar o número total de tipos encontrados
    const typeCount = Object.keys(filesByType).length;
    
    // Exibir um sumário das classificações
    console.log(colorize('Alterações por tipo:', COLORS.cyan));
    
    const typeCounts = Object.entries(filesByType).map(([type, files]) => {
      return { type, count: files.length, files };
    });
    
    // Criar um sumário de tipos
    const typesList = typeCounts.map(({ type, count }) => 
      `${colorize(type, COLORS.yellow)}: ${colorize(count.toString(), COLORS.white)}`).join(', ');
    console.log(`${typesList}`);
    
    // Detalhes dos arquivos por tipo
    typeCounts.forEach(({ type, files }) => {
      const fileList = files.length <= 3 
        ? files.join(', ')
        : `${files.slice(0, 3).join(', ')}... e mais ${files.length - 3}`;
      console.log(`   ${colorize('▪', COLORS.blue)} ${colorize(type, COLORS.yellow)} (${files.length})`);
    });
    
    // Perguntar se deseja fazer o commit das alterações
    const shouldCommit = await ask('\n' + colorize('Confirmar commits? (S/n): ', COLORS.cyan));
    if (shouldCommit.toLowerCase() === 'n') {
      console.log(colorize('Operação cancelada pelo usuário.', COLORS.red));
      readline.close();
      return;
    }
    
    console.log('\n' + colorize('Iniciando processo de commits...', COLORS.green));
    
    // Processar cada tipo de commit
    let commitCount = 0;
    for (const { type, files } of typeCounts) {
      commitCount++;
      console.log(colorize(`Processando commit ${commitCount}/${typeCounts.length}`, COLORS.blue), 
                 showProgress(typeCounts.length, commitCount));
      
      const isBreakingChange = type.includes('!');
      console.log(`\n${colorize(`Commit ${commitCount}/${typeCounts.length}:`, COLORS.magenta)} ${colorize(type.toUpperCase(), COLORS.yellow)} (${files.length} arquivos)`);
      
      // Gerar staged files para esse tipo (resetar primeiro, depois adicionar apenas os arquivos desse tipo)
      await execAsync('git reset HEAD -- .');
      for (const file of files) {
        await execAsync(`git add "${file}"`);
      }
      
      // Solicitar descrição personalizada do commit
      const maxDescLength = 100;
      let commitMessage;
      
      if (isBreakingChange) {
        console.log(colorize(`Formato: ${type}: descrição do commit (max ${maxDescLength} caracteres)`, COLORS.white));
        const description = await ask(colorize(`Descrição para ${type}: `, COLORS.cyan));
        
        if (description.length > maxDescLength) {
          console.log(colorize(`Aviso: Descrição truncada para ${maxDescLength} caracteres.`, COLORS.yellow));
        }
        
        const trimmedDesc = description.substring(0, maxDescLength);
        
        console.log(colorize('\nBREAKING CHANGE: detalhe da mudança que quebra compatibilidade:', COLORS.red));
        const breakingDetail = await ask(colorize('Detalhes: ', COLORS.cyan));
        
        commitMessage = `${type}: ${trimmedDesc}\n\nBREAKING CHANGE: ${breakingDetail}`;
      } else {
        console.log(colorize(`Formato: ${type}: descrição do commit (max ${maxDescLength} caracteres)`, COLORS.white));
        const description = await ask(colorize(`Descrição para ${type}: `, COLORS.cyan));
        
        if (description.length > maxDescLength) {
          console.log(colorize(`Aviso: Descrição truncada para ${maxDescLength} caracteres.`, COLORS.yellow));
        }
        
        const trimmedDesc = description.substring(0, maxDescLength);
        commitMessage = `${type}: ${trimmedDesc}`;
      }
      
      // Executar o commit
      console.log(colorize(`Commitando alterações...`, COLORS.blue));
      
      try {
        // Salvar a mensagem em um arquivo temporário para preservar formatação e quebras de linha
        const tempFile = path.join(process.cwd(), '.commit-msg-temp');
        await fs.writeFile(tempFile, commitMessage, 'utf8');
        
        // Usar o arquivo temporário para o commit
        execSync(`git commit -F "${tempFile}"`, { stdio: 'pipe' });
        
        // Remover o arquivo temporário após o commit
        await fs.unlink(tempFile).catch(() => {});
        
        console.log(colorize(`Commit realizado com sucesso!`, COLORS.green));
      } catch (error) {
        console.error(colorize(`Erro ao realizar commit: ${error.message}`, COLORS.red));
      }
    }
    
    console.log('\n' + colorize('Commits finalizados com sucesso!', COLORS.green) + '\n');
    console.log(colorize('DiffSense Commit Interativo', COLORS.blue));
    
  } catch (error) {
    console.error(colorize(`Erro: ${error.message}`, COLORS.red));
  } finally {
    readline.close();
  }
}

// Executar função principal
main().catch(error => {
  console.error(colorize(`Erro fatal: ${error.message}`, COLORS.red));
  process.exit(1);
});
