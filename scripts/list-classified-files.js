#!/usr/bin/env node

/**
 * Script para listar arquivos modificados e suas classificações
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Executa um comando git e retorna a saída
 */
async function runCommand(command) {
  try {
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    return '';
  }
}

/**
 * Função principal
 */
async function listClassifiedFiles() {
  try {
    console.log('\n📋 DiffSense - Classificação de arquivos modificados\n');
    
    // Obter todos os arquivos modificados
    const modifiedFiles = await runCommand('git ls-files -m');
    const untrackedFiles = await runCommand('git ls-files --others --exclude-standard');
    const stagedFiles = await runCommand('git diff --cached --name-only');
    
    // Combinar todas as alterações (sem duplicatas)
    const allChanges = [...new Set([...modifiedFiles.split('\n'), ...untrackedFiles.split('\n'), ...stagedFiles.split('\n')])];
    const files = allChanges.filter(Boolean);
    
    if (files.length === 0) {
      console.log('✨ Repositório limpo! Não há alterações para classificar.');
      return;
    }
    
    console.log(`Encontradas ${files.length} alterações no repositório.\n`);
    
    // Classificar arquivos por tipo
    const fileTypes = {
      feat: [],
      fix: [],
      docs: [],
      refactor: [],
      test: [],
      chore: []
    };
    
    // Classificar cada arquivo
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath).toLowerCase();
      
      let type = 'feat'; // padrão
      
      // Detectar tipos de arquivo com base no nome e caminho
      if (filePath.includes('/test') || filePath.includes('\\test') || 
          filePath.includes('/__test__') || filePath.includes('\\_test__') ||
          fileName.includes('test') || fileName.includes('spec') || 
          filePath.includes('/tests/') || filePath.includes('\\tests\\')) {
        type = 'test';
      } 
      else if (ext === '.md' || ext === '.txt' || fileName.includes('readme') || 
               fileName.includes('license') || fileName.includes('changelog')) {
        type = 'docs';
      }
      else if (ext === '.json' || ext === '.yaml' || ext === '.yml' || 
               ext === '.toml' || ext === '.ini' || fileName.startsWith('.') ||
               ext === '.css' || ext === '.scss' || ext === '.less' || 
               ext === '.style') {
        type = 'refactor';
      }
      else if (filePath.includes('/.github/') || filePath.includes('\\.github\\') ||
               filePath.includes('/scripts/') || filePath.includes('\\scripts\\') ||
               filePath.includes('/config/') || filePath.includes('\\config\\') ||
               fileName.includes('.eslintrc') || fileName.includes('.prettierrc') ||
               fileName.includes('tsconfig.json') || fileName.includes('package.json') ||
               fileName.includes('package-lock.json') || fileName.includes('yarn.lock')) {
        type = 'chore';
      }
      
      if (!fileTypes[type]) {
        fileTypes[type] = [];
      }
      fileTypes[type].push(filePath);
    }
    
    // Mostrar arquivos por tipo
    const types = Object.keys(fileTypes);
    console.log('📊 Detalhes da classificação:');
    
    types.forEach(type => {
      const filesOfType = fileTypes[type] || [];
      if (filesOfType.length > 0) {
        console.log(`\n📁 ${type.toUpperCase()} (${filesOfType.length} arquivos):`);
        filesOfType.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    });
    
    console.log('\nObservação: Verifique se a classificação dos arquivos está correta.');
    
  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error);
  }
}

// Executar a função principal
listClassifiedFiles();
