#!/usr/bin/env node

/**
 * Script para analisar modificações não-commitadas no diretório de trabalho
 * usando o DiffSense
 */

import { runAnalysis } from '../dist/index.js';
import simpleGit from 'simple-git';

async function analyzeWorkingDir() {
  try {
    // Inicializa o Git
    const git = simpleGit();
    
    // Primeiro adiciona todos os arquivos ao staging (git add .)
    console.log('Preparando arquivos para análise (git add .)...');
    await git.add('.');
    console.log('Arquivos preparados com sucesso.\n');
    
    // Executa a análise comparando o HEAD (último commit) com o diretório de trabalho
    const result = await runAnalysis('HEAD', '');
    
    // Exibe o resultado
    console.log('=== DiffSense: Análise de Modificações no Diretório de Trabalho ===\n');
    console.log(result.report);
    
    if (result.suggestedCommit) {
      console.log('\n=== Sugestão de Commit ===');
      const { type, scope, subject, body, breaking } = result.suggestedCommit;
      
      let commitMsg = `${type}`;
      if (scope) {
        commitMsg += `(${scope})`;
      }
      if (breaking) {
        commitMsg += '!';
      }
      
      commitMsg += `: ${subject}`;
      console.log(commitMsg);
      
      if (body) {
        console.log(`\n${body}`);
      }
      
      // Exibe comando para usar a mensagem de commit
      console.log('\nPara usar esta mensagem de commit:');
      console.log(`git commit -m "${commitMsg}"`);
    }
    
    console.log('\nObservação: Todos os arquivos foram adicionados ao staging (git add .)');
    console.log('Para remover arquivos do staging: git restore --staged .');
  } catch (error) {
    console.error('Erro ao analisar diretório de trabalho:', error);
  }
}

// Executa a análise
analyzeWorkingDir();
