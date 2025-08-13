#!/usr/bin/env node

/**
 * Script para agrupar e commitar alterações por tipo no DiffSense
 * Permite realizar commits separados para cada tipo de alteração (feat, fix, docs, etc.)
 */

import { runAnalysis } from '../dist/index.js';
import simpleGit from 'simple-git';
import { createInterface } from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

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
async function execGitCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('warning:')) {
      console.error(`Erro Git: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Erro ao executar comando Git: ${error.message}`);
    return '';
  }
}

/**
 * Agrupa as alterações por tipo (feat, fix, docs, refactor, test)
 */
function groupChangesByType(changes) {
  const groupedChanges = {};
  
  // Mapeamento de tipos antigos para os essenciais
  const typeMapping = {
    'chore': 'refactor',
    'style': 'refactor',
    'perf': 'refactor',
    'build': 'refactor',
    'ci': 'refactor'
  };
  
  changes.forEach(change => {
    // Ignorar alterações sem arquivo
    if (!change.filePath && !change.file) {
      console.log("Aviso: Alteração sem caminho de arquivo detectada:", change);
      return;
    }
    
    const filePath = change.filePath || change.file;
    const type = change.commitType || 'other';
    
    if (!groupedChanges[type]) {
      groupedChanges[type] = [];
    }
    
    // Garantir que a alteração tenha um campo de arquivo para uso posterior
    const enhancedChange = {
      ...change,
      file: filePath
    };
    
    groupedChanges[type].push(enhancedChange);
  });
  
  return groupedChanges;
}

/**
 * Gera uma mensagem de commit para um grupo de alterações
 */
function generateCommitMessage(type, changes) {
  // Determina o escopo (se houver um principal)
  let scope = '';
  const scopeCounts = {};
  
  changes.forEach(change => {
    if (change.commitScope) {
      scopeCounts[change.commitScope] = (scopeCounts[change.commitScope] || 0) + 1;
    }
  });
  
  // Se mais de 30% das alterações têm o mesmo escopo, usamos ele
  const totalChanges = changes.length;
  let maxScope = '';
  let maxCount = 0;
  
  for (const [s, count] of Object.entries(scopeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxScope = s;
    }
  }
  
  if (maxCount / totalChanges >= 0.3) {
    scope = `(${maxScope})`;
  }
  
  // Determina se há breaking changes
  const hasBreakingChanges = changes.some(change => 
    change.impact === 'major' || 
    (change.semanticChanges && change.semanticChanges.some(sc => 
      sc.severity === 'breaking' || sc.severity === 'high'
    ))
  );
  
  // Gera o subject da mensagem
  let subject = '';
  if (changes.length === 1 && changes[0] && changes[0].file) {
    // Se há apenas uma alteração, usamos a descrição dela
    subject = changes[0].summary || `altera ${changes[0].file}`;
  } else if (changes.length <= 3) {
    // Se há poucas alterações, listamos todas
    const validFiles = changes.filter(c => c && c.file).map(c => path.basename(c.file));
    subject = validFiles.length > 0 ? validFiles.join(', ') : `alterações de ${type}`;
  } else {
    // Se há muitas alterações, resumimos
    subject = `${changes.length} alterações de ${type}`;
  }
  
  // Monta a mensagem completa
  let message = `${type}${scope}`;
  if (hasBreakingChanges) message += '!';
  message += `: ${subject}`;
  
  return message;
}

/**
 * Função principal
 */
async function commitByType() {
  try {
    const git = simpleGit();
    
    // Verificar status do git
    const status = await git.status();
    
    if (!status.files.length) {
      console.log('Não há alterações para commitar.');
      rl.close();
      return;
    }
    
    console.log(`\n🔍 Encontradas ${status.files.length} alterações no diretório de trabalho.\n`);
    
    // Preparar todos os arquivos se ainda não estiverem preparados
    console.log('📋 Preparando todos os arquivos para análise (git add .)...');
    await git.add('.');
    
    // Obter o status atualizado
    const updatedStatus = await git.status();
    console.log(`Arquivos preparados: ${updatedStatus.staged.length}`);
    
    // Obter a lista de arquivos modificados
    const gitFiles = status.files.map(f => f.path);
    
    // Classificar arquivos por tipo diretamente
    const fileTypes = {};
    
    console.log('\n📁 Classificando arquivos por tipo...');
    for (const filePath of gitFiles) {
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
    
    console.log('\n🧠 Analisando alterações com DiffSense para commit messages...');
    const result = await runAnalysis('HEAD', '');
    
    if (!result.changes || result.changes.length === 0) {
      console.log('Não foram detectadas alterações para análise.');
      rl.close();
      return;
    }
    
    // Depurar informações de alterações
    console.log(`\nInformações de alterações detectadas (primeiros 3 exemplos):`);
    result.changes.slice(0, 3).forEach((change, i) => {
      console.log(`\nAlteração ${i + 1}:`);
      console.log(`  Arquivo: ${change.filePath || change.file || 'Sem nome'}`);
      console.log(`  Tipo de Commit: ${change.commitType || 'Não definido'}`);
    });
    
    // Exibir os arquivos agrupados por tipo
    console.log('\n� Alterações agrupadas por tipo:');
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
      console.log('\nUsando mensagem de commit geral sugerida pelo DiffSense:');
      console.log(`\n> ${result.suggestedCommit.type}${result.suggestedCommit.scope ? `(${result.suggestedCommit.scope})` : ''}${result.suggestedCommit.breaking ? '!' : ''}: ${result.suggestedCommit.subject}\n`);
      
      const confirmCommit = await question('Confirma este commit único? (S/n): ');
      if (!confirmCommit || confirmCommit.toLowerCase() === 's') {
        const commitMessage = `${result.suggestedCommit.type}${result.suggestedCommit.scope ? `(${result.suggestedCommit.scope})` : ''}${result.suggestedCommit.breaking ? '!' : ''}: ${result.suggestedCommit.subject}`;
        await execGitCommand(`git commit -m "${commitMessage}"`);
        console.log('\n✅ Commit realizado com sucesso!');
      } else {
        console.log('\n❌ Commit cancelado.');
      }
      
      rl.close();
      return;
    }
    
    // Processo para commitar por tipo
    console.log('\n🔄 Iniciando commits por tipo...\n');
    
    // Remover tudo do staging inicialmente
    console.log('Limpando área de preparação...');
    await git.reset();
    
    // Para cada tipo, oferecer commit
    for (const type of types) {
      const files = fileTypes[type] || [];
      
      console.log(`\n📁 Tipo: ${type.toUpperCase()} (${files.length} arquivos)`);
      
      if (files.length === 0) {
        console.log(`⚠️ Nenhum arquivo encontrado para o tipo "${type}". Pulando.`);
        continue;
      }
      
      console.log(`Arquivos: ${files.map(f => path.basename(f)).join(', ')}`);
      
      // Encontrar alterações semânticas relevantes para este tipo
      const relevantChanges = result.changes.filter(c => c.commitType === type);
      
      // Gerar mensagem de commit
      const commitMessage = relevantChanges.length > 0 
        ? generateCommitMessage(type, relevantChanges)
        : `${type}: alterações em arquivos de ${type}`;
      
      console.log(`\nMensagem sugerida: ${commitMessage}`);
      
      const confirmCommit = await question(`Realizar commit para alterações de tipo "${type}"? (S/n): `);
      
      if (!confirmCommit || confirmCommit.toLowerCase() === 's') {
        // Verificar se os arquivos existem antes de tentar adicioná-los
        console.log(`Verificando e adicionando ${files.length} arquivos para o tipo ${type}...`);
        
        try {
          let addedCount = 0;
          
          // Adicionar cada arquivo individualmente
          for (const file of files) {
            try {
              // Usar diretamente o git add, pois ele irá falhar se o arquivo não existir
              await git.add(file);
              addedCount++;
              console.log(`Adicionado: ${file}`);
            } catch (e) {
              console.log(`Erro ao adicionar arquivo ${file}: ${e.message}`);
            }
          }
          
          console.log(`${addedCount} arquivos adicionados com sucesso.`);
          
          if (addedCount === 0) {
            console.log(`⚠️ Nenhum arquivo foi adicionado para o tipo "${type}". Pulando commit.`);
            continue;
          }
          
          // Realizar o commit
          await git.commit(commitMessage);
          console.log(`✅ Commit de "${type}" realizado com sucesso!`);
        } catch (error) {
          console.error(`❌ Erro ao realizar commit: ${error.message}`);
        }
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

// Adiciona um import path esquecido
import path from 'path';

// Executa a função principal
commitByType();
