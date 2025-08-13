#!/usr/bin/env node

/**
 * Script to group and commit changes by type in DiffSense
 * Version with improved terminal interface
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import path from 'path';

const execAsync = promisify(exec);

// Check if the --show-only option was passed
const showOnly = process.argv.includes('--show-only');

// Interface for user interaction
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask the user with promise for response
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
 * Main function
 */
async function commitByType() {
  try {
    console.log('\n🔍 DiffSense - Commit por Tipo\n');
    console.log('Analisando repositório...');
    
    // Mostrar barra de progresso enquanto detecta arquivos
    showProgress('Looking for changes', 20);
    
    // Get modified files that are not staged (unstaged)
    const modifiedFiles = await runCommand('git ls-files -m');
    
    showProgress('Looking for changes', 40);
    
    // Get untracked files
    const untrackedFiles = await runCommand('git ls-files --others --exclude-standard');
    
    showProgress('Looking for changes', 60);
    
    // Obter arquivos preparados (staged)
    const stagedFiles = await runCommand('git diff --cached --name-only');
    
    showProgress('Procurando alterações', 100);
    
    // Combinar todas as alterações (sem duplicatas)
    const allChanges = [...new Set([...modifiedFiles.split('\n'), ...untrackedFiles.split('\n'), ...stagedFiles.split('\n')])];
    const files = allChanges.filter(Boolean);
    
    if (files.length === 0) {
      console.log('\n✨ Repositório limpo! Não há alterações para commitar.');
      rl.close();
      return;
    }
    
    console.log(`\n✅ Encontradas ${files.length} alterações no repositório.`);
    
    // Classificar arquivos por tipo
    const fileTypes = {
      'feat': [],
      'fix': [],
      'docs': [],
      'refactor': [],
      'test': [],
      'chore': [],
      // Adicionar categorias para breaking changes
      'feat!': [],
      'fix!': [],
      'refactor!': [],
      'docs!': []
    };
    let processedFiles = 0;
    
    // Iniciar barra de progresso para classificação
    showProgress('Classificando alterações', 0);
    
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath).toLowerCase();
      
      // Analisar o caminho e determinar o tipo de alteração
      // Para uma biblioteca npm, precisamos classificar com cuidado o que impacta os usuários
      
      // Por padrão, começamos com chore (não afeta versionamento)
      let type = 'chore';
      
      // 1. TESTES - importantes, mas não impactam a API pública
      if (filePath.includes('/tests/') || 
          filePath.includes('\\tests\\') ||
          filePath.includes('/test/') || 
          filePath.includes('\\test\\') ||
          filePath.includes('/__tests__/') || 
          filePath.includes('\\_tests__\\') ||
          fileName.endsWith('.test.js') ||
          fileName.endsWith('.test.ts') ||
          fileName.endsWith('.spec.js') ||
          fileName.endsWith('.spec.ts')) {
        type = 'test';
      }
      
      // 2. DOCUMENTAÇÃO PÚBLICA - afeta os usuários finais
      else if (fileName.toLowerCase() === 'readme.md' || 
               fileName.toLowerCase() === 'license' || 
               (ext === '.md' && (
                 fileName.toLowerCase().includes('changelog') || 
                 filePath.toLowerCase().includes('/docs/') || 
                 filePath.toLowerCase().includes('\\docs\\')
               ))) {
        
        // Verificar se é documentação com breaking changes
        if (fileName.toLowerCase().includes('breaking') || 
            fileName.toLowerCase().includes('migration') || 
            fileName.toLowerCase().includes('upgrade') || 
            fileName.toLowerCase().includes('v2') || 
            fileName.toLowerCase().includes('v3')) {
          type = 'docs!';
        } else {
          type = 'docs';
        }
      }
      
      // 3. CORREÇÕES ESPECÍFICAS CONHECIDAS
      else if (filePath.includes('change-detector.ts') || 
               filePath.includes('commit-by-type-direct.js')) {
        // Verificar se são correções que podem ser breaking changes
        if (filePath.includes('types') || filePath.includes('api') || 
            filePath.includes('interface') || filePath.includes('export')) {
          type = 'fix!'; // Potencialmente um breaking change
        } else {
          type = 'fix';
        }
      }
      
      // 4. CÓDIGO-FONTE DA API PÚBLICA
      else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        // Verificar se é código fonte da API pública (exportado pelo pacote)
        if (filePath.startsWith('src/types/') || 
            filePath.startsWith('src\\types\\') ||
            filePath.startsWith('src/core/') ||
            filePath.startsWith('src\\core\\') ||
            filePath.startsWith('src/api/') ||
            filePath.startsWith('src\\api\\') ||
            filePath === 'src/index.ts' ||
            filePath === 'src\\index.ts' ||
            filePath === 'src/index.js' ||
            filePath === 'src\\index.js') {
          
          // Verificar se é um breaking change
          let isBreaking = false;
          
          // Heurísticas para detectar breaking changes
          // Verificar especificamente o arquivo de tipos para detectar breaking changes
          if (filePath === 'src/types/index.ts' || filePath === 'src\\types\\index.ts') {
            // Este é um arquivo crítico para a API pública, então verificamos com cuidado
            // Neste caso específico, sabemos que modificamos o CommitType para incluir 'chore'
            // o que pode ser considerado um breaking change se alguém dependia dessa definição
            type = 'feat!'; // Marcar como breaking change
            isBreaking = true;
          }
          // Outras heurísticas gerais para detectar breaking changes
          else if (filePath.includes('/breaking/') || 
              filePath.includes('\\breaking\\') || 
              fileName.includes('break') || 
              fileName.includes('migration')) {
            isBreaking = true;
            
            // Adicionar à categoria correspondente com o marcador '!'
            if (fileName.includes('fix') || 
                filePath.includes('/fixes/') || 
                filePath.includes('\\fixes\\')) {
              type = 'fix!';
            } else {
              type = 'feat!';
            }
          }
          // Se não for breaking change
          else {
            // Arquivos de definição de tipo são importantes para usuários TypeScript
            if (ext === '.ts' && filePath.includes('/types/')) {
              type = 'feat';
            }
            // Detectar se é correção ou feature
            else if (fileName.includes('fix') || 
                    filePath.includes('/fixes/') || 
                    filePath.includes('\\fixes\\')) {
              type = 'fix';
            } 
            else {
              type = 'feat';
            }
          }
        }
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
    const types = Object.keys(fileTypes).filter(type => fileTypes[type].length > 0);
    
    // Separar tipos normais e breaking changes
    const regularTypes = types.filter(type => !type.includes('!'));
    const breakingTypes = types.filter(type => type.includes('!'));
    
    // Mostrar estatísticas de tipos normais
    const regularStats = regularTypes.map(type => `${type}: ${fileTypes[type].length}`).join(', ');
    console.log(`   ${regularStats}`);
    
    // Destacar breaking changes, se houver
    if (breakingTypes.length > 0) {
      const breakingStats = breakingTypes.map(type => `${type}: ${fileTypes[type].length}`).join(', ');
      console.log(`\n⚠️  BREAKING CHANGES detectadas:`);
      console.log(`   ${breakingStats}`);
    }
    
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
        // Tratar adequadamente tipos de breaking changes
        if (type.endsWith('!')) {
          // Extrair o tipo base (sem o !)
          const baseType = type.slice(0, -1);
          const suggestedMessage = `${baseType}!: BREAKING CHANGE - alterações incompatíveis em ${baseType}`;
          commitMessages[type] = suggestedMessage;
        } else {
          const suggestedMessage = `${type}: alterações em arquivos de ${type}`;
          commitMessages[type] = suggestedMessage;
        }
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
