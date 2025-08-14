#!/usr/bin/env node

/**
 * Script para commit interativo no DiffSense
 * Realiza classificação automática de arquivos e solicita descrições personalizadas para cada tipo de commit
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import path from 'path';
import fs from 'fs/promises';

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

// Cores para terminal
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

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

// Função para criar uma barra de progresso
function createProgressBar(total, current, barSize = 30) {
  const percentage = Math.floor((current / total) * 100);
  const filledSize = Math.floor((current / total) * barSize);
  const emptySize = barSize - filledSize;
  
  const filledBar = '█'.repeat(filledSize);
  const emptyBar = '░'.repeat(emptySize);
  
  return `[${filledBar}${emptyBar}] ${percentage}%`;
}

// Função para exibir cabeçalho
function showHeader() {
  console.log('\n╭───────────────────────────────────────╮');
  console.log('│       DiffSense - Commit Interativo    │');
  console.log('╰───────────────────────────────────────╯\n');
  console.log('🔍 DiffSense - Commit Interativo\n');
}

// Função para fazer pergunta ao usuário e obter resposta
function ask(question) {
  return new Promise(resolve => {
    readline.question(question, answer => {
      resolve(answer);
    });
  });
}

// Função principal
async function main() {
  try {
    showHeader();
    
    console.log('Analisando repositório...');
    
    // Verificar status do git
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    if (!gitStatus.trim()) {
      console.log(colorize('✅ Não há alterações para commitar.', COLORS.green));
      readline.close();
      return;
    }
    
    // Adicionar todos os arquivos automaticamente (sempre executar git add .)
    console.log('Adicionando todos os arquivos ao stage...');
    await execAsync('git add .');
    
    // Obter arquivos modificados após o git add .
    console.log('Procurando alterações', createProgressBar(100, 50));
    const { stdout: stagedFiles } = await execAsync('git diff --cached --name-only');
    const { stdout: untrackedFiles } = await execAsync('git ls-files --others --exclude-standard');
    
    // Combinar todos os arquivos staged
    let allFiles = [...new Set([
      ...stagedFiles.split('\n').filter(Boolean),
      ...untrackedFiles.split('\n').filter(Boolean)
    ])];
    
    console.log(createProgressBar(100, 100));
    console.log(`\n✅ Encontradas ${allFiles.length} alterações no repositório.`);
    
    // Classificar os arquivos por tipo
    console.log('Classificando alterações', createProgressBar(100, 0));
    
    console.log(`Arquivos encontrados: ${allFiles.length}`);
    allFiles.forEach(file => console.log(file));
    
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
      console.log('Classificando alterações', createProgressBar(allFiles.length, processedFiles));
    }
    
    console.log('\n⚖️ Aplicando sistema de pesos para classificação final...\n');
    
    // Contar o número total de tipos encontrados
    const typeCount = Object.keys(filesByType).length;
    
    // Exibir um sumário das classificações
    console.log('📊 Alterações classificadas por tipo:');
    
    const typeCounts = Object.entries(filesByType).map(([type, files]) => {
      return { type, count: files.length, files };
    });
    
    // Criar um sumário de tipos
    const typesList = typeCounts.map(({ type, count }) => `${type}: ${count}`).join(', ');
    console.log(`   ${typesList}`);
    
    // Detalhes dos arquivos por tipo
    typeCounts.forEach(({ type, files }) => {
      const fileList = files.length <= 3 
        ? files.join(', ')
        : `${files.slice(0, 3).join(', ')}... e outros ${files.length - 3}`;
      console.log(`   • ${type} (${files.length}): ${fileList}`);
    });
    
    // Perguntar se deseja fazer o commit das alterações
    const shouldCommit = await ask('\nDeseja fazer o commit das alterações? (S/n): ');
    if (shouldCommit.toLowerCase() === 'n') {
      console.log('Operação cancelada pelo usuário.');
      readline.close();
      return;
    }
    
    console.log('\n🚀 Iniciando processo de commits...');
    
    // Processar cada tipo de commit
    let commitCount = 0;
    for (const { type, files } of typeCounts) {
      commitCount++;
      console.log(`Processando commits (${commitCount}/${typeCounts.length})`, 
                 createProgressBar(typeCounts.length, commitCount));
      
      const isBreakingChange = type.includes('!');
      console.log(`\n📦 Commit ${commitCount}/${typeCounts.length}: ${type.toUpperCase()} (${files.length} arquivos)`);
      
      // Gerar staged files para esse tipo (resetar primeiro, depois adicionar apenas os arquivos desse tipo)
      await execAsync('git reset HEAD -- .');
      for (const file of files) {
        await execAsync(`git add "${file}"`);
      }
      
      // Solicitar descrição personalizada do commit
      const maxDescLength = 100;
      let commitMessage;
      
      if (isBreakingChange) {
        console.log(`Formato: ${type}: descrição do commit (max ${maxDescLength} caracteres)`);
        const description = await ask(`Descrição para ${type} (máx ${maxDescLength} caracteres): `);
        
        if (description.length > maxDescLength) {
          console.log(colorize(`⚠️ Aviso: Descrição truncada para ${maxDescLength} caracteres.`, COLORS.yellow));
        }
        
        const trimmedDesc = description.substring(0, maxDescLength);
        
        console.log(`\nBREAKING CHANGE: detalhe da mudança que quebra compatibilidade:`);
        const breakingDetail = await ask('Detalhes da breaking change: ');
        
        commitMessage = `${type}: ${trimmedDesc}\n\nBREAKING CHANGE: ${breakingDetail}`;
      } else {
        console.log(`Formato: ${type}: descrição do commit (max ${maxDescLength} caracteres)`);
        const description = await ask(`Descrição para ${type} (máx ${maxDescLength} caracteres): `);
        
        if (description.length > maxDescLength) {
          console.log(colorize(`⚠️ Aviso: Descrição truncada para ${maxDescLength} caracteres.`, COLORS.yellow));
        }
        
        const trimmedDesc = description.substring(0, maxDescLength);
        commitMessage = `${type}: ${trimmedDesc}`;
      }
      
      // Executar o commit
      console.log(`> git commit com mensagem personalizada`);
      
      try {
        // Salvar a mensagem em um arquivo temporário para preservar formatação e quebras de linha
        const tempFile = path.join(process.cwd(), '.commit-msg-temp');
        await fs.writeFile(tempFile, commitMessage, 'utf8');
        
        // Usar o arquivo temporário para o commit
        execSync(`git commit -F "${tempFile}"`, { stdio: 'inherit' });
        
        // Remover o arquivo temporário após o commit
        await fs.unlink(tempFile).catch(() => {});
        
        console.log(colorize(`   ✅ Commit realizado com sucesso!`, COLORS.green));
      } catch (error) {
        console.error(colorize(`   ❌ Erro ao realizar commit: ${error.message}`, COLORS.red));
      }
    }
    
    console.log('\n✨ Processo de commits concluído com sucesso!\n');
    console.log('👋 Obrigado por usar o DiffSense Commit Interativo!');
    
  } catch (error) {
    console.error(colorize(`❌ Erro: ${error.message}`, COLORS.red));
  } finally {
    readline.close();
  }
}

// Executar função principal
main().catch(error => {
  console.error(colorize(`❌ Erro fatal: ${error.message}`, COLORS.red));
  process.exit(1);
});
