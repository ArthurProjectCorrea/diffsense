#!/usr/bin/env node

/**
 * Script para agrupar e commitar alterações por tipo no DiffSense
 * Versão simplificada que usa comandos de terminal diretamente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import path from 'path';

const execAsync = promisify(exec);

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
 * Executa um comando git e retorna a saída
 */
async function runCommand(command) {
  try {
    console.log(`> Executando: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('warning:')) {
      console.error(`Erro: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Erro ao executar comando: ${error.message}`);
    return '';
  }
}

/**
 * Função principal
 */
async function commitByType() {
  try {
    // Verificar status do git
    const statusOutput = await runCommand('git status --porcelain');
    const files = statusOutput.split('\n').filter(Boolean).map(line => line.substring(3));
    
    if (files.length === 0) {
      console.log('Não há alterações para commitar.');
      rl.close();
      return;
    }
    
    console.log(`\n🔍 Encontradas ${files.length} alterações no diretório de trabalho.\n`);
    
    // Classificar arquivos por tipo
    const fileTypes = {};
    
    console.log('\n📁 Classificando arquivos por tipo...');
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
    }
    
    // Exibir os arquivos agrupados por tipo
    console.log('\n📊 Alterações agrupadas por tipo:');
    const types = Object.keys(fileTypes);
    types.forEach(type => {
      console.log(`- ${type}: ${fileTypes[type].length} arquivos`);
      if (fileTypes[type].length <= 5) {
        // Mostrar arquivos se forem poucos
        console.log(`  ${fileTypes[type].map(f => path.basename(f)).join(', ')}`);
      }
    });
    
    // Verificar se usuário quer committar por tipo
    const commitByTypeAnswer = await question('Deseja commitar alterações separadas por tipo? (S/n): ');
    const commitByTypeConfirmed = !commitByTypeAnswer || commitByTypeAnswer.toLowerCase() === 's';
    
    if (!commitByTypeConfirmed) {
      const commitMsg = await question('Digite a mensagem para um único commit: ');
      if (commitMsg) {
        await runCommand(`git add .`);
        await runCommand(`git commit -m "${commitMsg}"`);
        console.log('\n✅ Commit único realizado com sucesso!');
      } else {
        console.log('\n❌ Commit cancelado - mensagem vazia.');
      }
      
      rl.close();
      return;
    }
    
    // Processo para commitar por tipo
    console.log('\n🔄 Iniciando commits por tipo...\n');
    
    // Para cada tipo, oferecer commit
    for (const type of types) {
      const files = fileTypes[type] || [];
      
      console.log(`\n📁 Tipo: ${type.toUpperCase()} (${files.length} arquivos)`);
      
      if (files.length === 0) {
        console.log(`⚠️ Nenhum arquivo encontrado para o tipo "${type}". Pulando.`);
        continue;
      }
      
      console.log(`Arquivos: ${files.map(f => path.basename(f)).join(', ')}`);
      
      // Sugerir mensagem de commit
      const suggestedMessage = `${type}: alterações em arquivos de ${type}`;
      console.log(`\nMensagem sugerida: ${suggestedMessage}`);
      
      const confirmCommit = await question(`Realizar commit para alterações de tipo "${type}"? (S/n): `);
      
      if (!confirmCommit || confirmCommit.toLowerCase() === 's') {
        // Confirmar ou editar a mensagem
        const commitMessage = await question(`Editar mensagem ou pressionar ENTER para usar sugerida: `);
        const finalMessage = commitMessage || suggestedMessage;
        
        // Limpar staging area
        await runCommand('git reset');
        
        // Adicionar apenas os arquivos deste tipo
        for (const file of files) {
          await runCommand(`git add "${file}"`);
        }
        
        // Verificar quais arquivos foram adicionados
        const stagedFiles = await runCommand('git diff --name-only --cached');
        const stagedCount = stagedFiles.split('\n').filter(Boolean).length;
        console.log(`Arquivos preparados: ${stagedCount}`);
        
        if (stagedCount === 0) {
          console.log(`⚠️ Nenhum arquivo foi adicionado para o tipo "${type}". Pulando commit.`);
          continue;
        }
        
        // Realizar o commit
        await runCommand(`git commit -m "${finalMessage}"`);
        console.log(`✅ Commit de "${type}" realizado com sucesso!`);
      } else {
        console.log(`⏩ Commit de "${type}" pulado.`);
      }
    }
    
    console.log('\n🎉 Processo de commits por tipo concluído!');
    
    rl.close();
  } catch (error) {
    console.error('Erro durante o processo:', error);
    rl.close();
  }
}

// Executar a função principal
commitByType();
