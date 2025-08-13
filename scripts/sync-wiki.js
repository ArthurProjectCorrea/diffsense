#!/usr/bin/env node

/**
 * Script para sincronizar documentação com a wiki do GitHub
 * Este script facilita o trabalho de manutenção da documentação na wiki
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

/**
 * Log colorido
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Executa um comando e retorna a saída
 */
function run(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    log(`Erro ao executar comando: ${command}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

async function syncWiki() {
  log('🔄 Iniciando sincronização da Wiki do DiffSense...', 'blue');
  
  // Obter diretório do projeto
  const projectRoot = process.cwd();
  const wikiSource = path.join(projectRoot, '.github', 'wiki');
  
  // Verificar se a pasta .github/wiki existe
  if (!fs.existsSync(wikiSource)) {
    log('❌ Pasta .github/wiki não encontrada. Criando estrutura...', 'yellow');
    fs.mkdirSync(wikiSource, { recursive: true });
  }
  
  // Clonar ou atualizar o repositório wiki
  const wikiDir = path.join(projectRoot, 'wiki_temp');
  
  if (fs.existsSync(wikiDir)) {
    log('🗂️ Pasta wiki_temp já existe, atualizando repositório...', 'blue');
    run(`cd ${wikiDir} && git pull`);
  } else {
    log('📦 Clonando repositório wiki...', 'blue');
    const repoUrl = run('git remote get-url origin').replace(/\.git$/, '.wiki.git');
    run(`git clone ${repoUrl} ${wikiDir}`);
  }
  
  // Sincronizar arquivos
  log('📋 Copiando arquivos da wiki para o repositório clonado...', 'blue');
  
  // Listar arquivos na pasta .github/wiki
  const wikiFiles = fs.readdirSync(wikiSource);
  
  if (wikiFiles.length === 0) {
    log('⚠️ Nenhum arquivo encontrado em .github/wiki', 'yellow');
    return;
  }
  
  // Copiar cada arquivo
  let filesUpdated = 0;
  for (const file of wikiFiles) {
    const sourcePath = path.join(wikiSource, file);
    const destPath = path.join(wikiDir, file);
    
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      log(`✅ Arquivo copiado: ${file}`, 'green');
      filesUpdated++;
    }
  }
  
  // Verificar se há alterações para commitar
  if (filesUpdated === 0) {
    log('ℹ️ Nenhum arquivo foi atualizado', 'blue');
    return;
  }
  
  // Commitar alterações
  log('📝 Commitando alterações...', 'blue');
  run(`cd ${wikiDir} && git add .`);
  
  try {
    run(`cd ${wikiDir} && git commit -m "docs: atualizar documentação da wiki [local]"`);
    log('✅ Alterações commitadas com sucesso!', 'green');
  } catch (error) {
    log('ℹ️ Não há alterações para commitar', 'blue');
    return;
  }
  
  // Perguntar se deseja enviar as alterações para o GitHub
  log('\n🚀 Deseja enviar as alterações para o GitHub? (s/N)', 'yellow');
  process.stdin.setEncoding('utf8');
  
  process.stdin.once('data', (data) => {
    const answer = data.trim().toLowerCase();
    
    if (answer === 's' || answer === 'sim' || answer === 'y' || answer === 'yes') {
      log('📤 Enviando alterações para o GitHub...', 'blue');
      run(`cd ${wikiDir} && git push`);
      log('✅ Wiki atualizada com sucesso!', 'green');
    } else {
      log('❌ Operação cancelada. As alterações estão commitadas localmente em wiki_temp.', 'yellow');
    }
    
    log('\n👋 Obrigado por manter a documentação atualizada!', 'green');
    process.exit(0);
  });
}

// Executar a sincronização
syncWiki().catch((error) => {
  log(`❌ Erro durante a sincronização: ${error.message}`, 'red');
  process.exit(1);
});
