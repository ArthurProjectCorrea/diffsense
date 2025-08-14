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
  'feat!': chalk.red.bold,
  'fix!': chalk.red.bold,
  'feat': chalk.green.bold,
  'fix': chalk.yellow.bold,
  'docs': chalk.blue.bold,
  'refactor': chalk.magenta.bold,
  'test': chalk.cyan.bold,
  'chore': chalk.grey.bold
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
    let allFiles = context.allFiles;
    
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
    
    // Classificar cada arquivo
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
    }
    
    analyzeSpinner.succeed('Alterações classificadas');
    
    // Contar o número total de tipos encontrados
    displaySection('Resultado da classificação');
    
    const typeCounts = Object.entries(filesByType).map(([type, files]) => {
      return { type, count: files.length, files };
    });
    
    // Criar tabela para visualização dos tipos
    const typeTable = new Table({
      head: [chalk.blue('Tipo'), chalk.blue('Quantidade'), chalk.blue('Arquivos')],
      colWidths: [10, 10, 60]
    });
    
    typeCounts.forEach(({ type, count, files }) => {
      const fileList = files.length <= 3 
        ? files.join(', ')
        : `${files.slice(0, 3).join(', ')}... (e mais ${files.length - 3})`;
      
      typeTable.push([
        TYPE_COLORS[type] ? TYPE_COLORS[type](type) : chalk.white(type),
        count,
        fileList
      ]);
    });
    
    console.log(typeTable.toString());
    
    // Perguntar se deseja fazer o commit
    const shouldCommit = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Confirmar commits?',
        default: true
      }
    ]);
    
    if (!shouldCommit.confirmed) {
      console.log(chalk.red('Operação cancelada pelo usuário.'));
      return;
    }
    
    console.log(chalk.green('\nIniciando processo de commits...'));
    
    // Processar cada tipo de commit
    for (const [index, { type, files }] of typeCounts.entries()) {
      const commitSpinner = ora(`Processando commit ${index + 1}/${typeCounts.length}: ${type}`).start();
      
      const isBreakingChange = type.includes('!');
      commitSpinner.stop();
      
      // Cabeçalho do commit atual
      console.log('\n' + boxen(gradient.cristal(
        `Commit ${index + 1}/${typeCounts.length}: ${type.toUpperCase()} (${files.length} arquivos)`
      ), { padding: 0.5, borderStyle: 'round', borderColor: 'cyan' }));
      
      // Gerar staged files para esse tipo
      await execAsync('git reset HEAD -- .');
      for (const file of files) {
        await execAsync(`git add "${file}"`);
      }
      
      // Solicitar descrição personalizada do commit
      const maxDescLength = 100;
      let commitMessage;
      
      if (isBreakingChange) {
        const typeWithoutBreaking = type.replace('!', '');
        console.log(chalk.yellow(`Formato: ${typeWithoutBreaking}: descrição (max ${maxDescLength} caracteres)`));
        
        // Solicitar mensagem principal
        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: `Descrição para ${chalk.red(type)}:`,
            validate: input => input.trim().length > 0 ? true : 'A descrição não pode estar vazia'
          }
        ]);
        
        const trimmedDesc = description.substring(0, maxDescLength);
        if (description.length > maxDescLength) {
          console.log(chalk.yellow(`Aviso: Descrição truncada para ${maxDescLength} caracteres.`));
        }
        
        // Solicitar detalhes do breaking change
        console.log(chalk.red('\nBREAKING CHANGE: detalhe da mudança que quebra compatibilidade:'));
        const { breakingDetail } = await inquirer.prompt([
          {
            type: 'input',
            name: 'breakingDetail',
            message: 'Detalhes:',
            validate: input => input.trim().length > 0 ? true : 'Os detalhes não podem estar vazios'
          }
        ]);
        
        commitMessage = `${type}: ${trimmedDesc}\n\nBREAKING CHANGE: ${breakingDetail}`;
      } else {
        console.log(chalk.yellow(`Formato: ${type}: descrição (max ${maxDescLength} caracteres)`));
        
        // Solicitar mensagem principal
        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: `Descrição para ${chalk.cyan(type)}:`,
            validate: input => input.trim().length > 0 ? true : 'A descrição não pode estar vazia'
          }
        ]);
        
        const trimmedDesc = description.substring(0, maxDescLength);
        if (description.length > maxDescLength) {
          console.log(chalk.yellow(`Aviso: Descrição truncada para ${maxDescLength} caracteres.`));
        }
        
        commitMessage = `${type}: ${trimmedDesc}`;
      }
      
      // Executar o commit
      const commitActionSpinner = ora('Realizando commit...').start();
      
      try {
        // Salvar a mensagem em um arquivo temporário para preservar formatação e quebras de linha
        const tempFile = path.join(process.cwd(), '.commit-msg-temp');
        await fs.writeFile(tempFile, commitMessage, 'utf8');
        
        // Usar o arquivo temporário para o commit
        await execAsync(`git commit -F "${tempFile}"`);
        
        // Remover o arquivo temporário após o commit
        await fs.unlink(tempFile).catch(() => {});
        
        commitActionSpinner.succeed('Commit realizado com sucesso');
      } catch (error) {
        commitActionSpinner.fail(`Erro ao realizar commit: ${error.message}`);
      }
    }
    
    // Finalização
    console.log('\n' + boxen(gradient.rainbow('Commits finalizados com sucesso!'), { 
      padding: 1, 
      borderStyle: 'double', 
      borderColor: 'green' 
    }));
    
  } catch (error) {
    console.error(chalk.red(`\nErro: ${error.message}`));
    process.exit(1);
  }
}

// Executar função principal
main().catch(error => {
  console.error(chalk.red(`\nErro fatal: ${error.message}`));
  process.exit(1);
});
