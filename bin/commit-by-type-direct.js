#!/usr/bin/env node

/**
 * Script para agrupar e commitar alterações por tipo no DiffSense
 * Versão com interface melhorada para terminal
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import path from 'path';

const execAsync = promisify(exec);

// Verificar se a opção --show-only foi passada
const showOnly = process.argv.includes('--show-only');

// Interface para interação com o usuário
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Pergunta ao usuário com promessa de resposta
 */
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Executa um comando git silenciosamente e retorna a saída
 */
async function runCommand(command, silent = true) {
  try {
    if (!silent) {
      console.log(`> ${command}`);
    }
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('warning:') && !silent) {
      console.error(`⚠️ ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    if (!silent) {
      console.error(`❌ Erro: ${error.message}`);
    }
    return '';
  }
}

/**
 * Mostra uma barra de progresso no terminal
 */
function showProgress(message, percent) {
  const width = 30;
  const completed = Math.floor(width * (percent / 100));
  const remaining = width - completed;
  const bar = '█'.repeat(completed) + '░'.repeat(remaining);
  process.stdout.write(`\r${message} [${bar}] ${percent}%`);
  if (percent === 100) {
    process.stdout.write('\n');
  }
}

/**
 * Função principal
 */
async function commitByType() {
  try {
    console.log('\n🔍 DiffSense - Commit por Tipo\n');
    console.log('Analisando repositório...');
    
    // Mostrar barra de progresso enquanto detecta arquivos
    showProgress('Procurando alterações', 30);
    
    // Obter arquivos modificados
    const modifiedFiles = await runCommand('git ls-files -m');
    
    showProgress('Procurando alterações', 60);
    
    // Obter arquivos não rastreados
    const untrackedFiles = await runCommand('git ls-files --others --exclude-standard');
    
    showProgress('Procurando alterações', 100);
    
    // Combinar todas as alterações
    const allChanges = [...modifiedFiles.split('\n'), ...untrackedFiles.split('\n')];
    const files = allChanges.filter(Boolean);
    
    if (files.length === 0) {
      console.log('\n✨ Repositório limpo! Não há alterações para commitar.');
      rl.close();
      return;
    }
    
    console.log(`\n✅ Encontradas ${files.length} alterações no repositório.`);
    
    // Classificar arquivos por tipo
    const fileTypes = {};
    let processedFiles = 0;
    
    // Iniciar barra de progresso para classificação
    showProgress('Classificando alterações', 0);
    
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
               ext === '.toml' || ext === '.ini' || fileName.startsWith('.')) {
        type = 'chore';
      }
      else if (ext === '.css' || ext === '.scss' || ext === '.less' || 
               ext === '.style') {
        type = 'style';
      }
      
      if (!fileTypes[type]) {
        fileTypes[type] = [];
      }
      fileTypes[type].push(filePath);
      
      // Atualizar barra de progresso
      processedFiles++;
      showProgress('Classificando alterações', Math.floor((processedFiles / files.length) * 100));
    }
    
    // Resumo conciso das alterações
    console.log('\n📊 Alterações classificadas por tipo:');
    const types = Object.keys(fileTypes);
    const typeStats = types.map(type => `${type}: ${fileTypes[type].length}`).join(', ');
    console.log(`   ${typeStats}`);
    
    // Mostrar detalhes apenas se houver poucos tipos ou se estiver no modo --show-only
    if (types.length <= 3 || showOnly) {
      types.forEach(type => {
        const fileCount = fileTypes[type].length;
        if (fileCount <= 3 || showOnly) {
          console.log(`   • ${type} (${fileCount}): ${fileTypes[type].map(f => path.basename(f)).join(', ')}`);
        } else {
          console.log(`   • ${type} (${fileCount}): ${fileTypes[type].slice(0, 2).map(f => path.basename(f)).join(', ')}... e outros ${fileCount - 2}`);
        }
      });
    }
    
    // Se estiver no modo --show-only, apenas mostrar os dados e finalizar
    if (showOnly) {
      console.log('\n📋 Modo de visualização apenas. Nenhum commit será realizado.');
      rl.close();
      return;
    }
    
    // Verificar se o usuário deseja fazer os commits
    const confirmCommit = await question('\nDeseja fazer o commit das alterações? (S/n): ');
    
    if (!confirmCommit || confirmCommit.toLowerCase() === 's') {
      console.log('\n🚀 Iniciando processo de commits...');
      
      // Preparar mensagens de commit para cada tipo
      const commitMessages = {};
      for (const type of types) {
        const suggestedMessage = `${type}: alterações em arquivos de ${type}`;
        commitMessages[type] = suggestedMessage;
      }
      
      // Realizar commits por tipo, um após o outro
      let commitCount = 0;
      
      for (const type of types) {
        const files = fileTypes[type] || [];
        
        if (files.length === 0) continue;
        
        const message = commitMessages[type];
        const totalCommits = types.filter(t => fileTypes[t].length > 0).length;
        
        // Mostrar progresso
        commitCount++;
        showProgress(`Processando commits (${commitCount}/${totalCommits})`, 
                     Math.floor((commitCount / totalCommits) * 100));
        
        console.log(`\n\n📦 Commit ${commitCount}/${totalCommits}: ${type.toUpperCase()} (${files.length} arquivos)`);
        console.log(`   Mensagem: "${message}"`);
        
        try {
          // Limpar staging area
          await runCommand('git reset', true);
          
          // Adicionar arquivos e fazer o commit em um único passo
          let addedFiles = 0;
          for (const file of files) {
            try {
              await runCommand(`git add "${file}"`, true);
              addedFiles++;
            } catch (e) {
              // Ignorar erros de arquivos individuais
            }
          }
          
          if (addedFiles === 0) {
            console.log('   ⚠️ Nenhum arquivo adicionado, pulando commit.');
            continue;
          }
          
          // Fazer o commit
          await runCommand(`git commit -m "${message}"`, false);
          console.log(`   ✅ Commit realizado com sucesso!`);
        } catch (error) {
          console.log(`   ❌ Erro ao realizar commit: ${error.message}`);
        }
      }
      
      console.log('\n✨ Processo de commits concluído com sucesso!');
    } else {
      console.log('\n❌ Operação cancelada pelo usuário.');
    }
    console.log('\n👋 Obrigado por usar o DiffSense Commit por Tipo!');
    rl.close();
  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error);
    rl.close();
  }
}

// Exibir cabeçalho
console.log('\n╭───────────────────────────────────────╮');
console.log('│       DiffSense - Commit por Tipo      │');
console.log('╰───────────────────────────────────────╯');

// Executar a função principal
commitByType();
