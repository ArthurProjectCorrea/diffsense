#!/usr/bin/env node

/**
 * Script para configurar os secrets no GitHub usando a CLI do GitHub
 * Este script utiliza o GitHub CLI (gh) para configurar secrets
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Verifica se o GitHub CLI está instalado
function checkGithubCli() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Verifica se o usuário está autenticado no GitHub CLI
function checkGithubAuth() {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Carrega o arquivo .env para obter os tokens
function loadEnvTokens() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado. Execute npm run setup-tokens primeiro.');
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokens = {};
  
  const extractToken = (content, key) => {
    const regex = new RegExp(`${key}=(.*)`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };
  
  tokens.GH_TOKEN = extractToken(envContent, 'GH_TOKEN');
  tokens.NPM_TOKEN = extractToken(envContent, 'NPM_TOKEN');
  tokens.SONAR_TOKEN = extractToken(envContent, 'SONAR_TOKEN');
  tokens.CODECOV_TOKEN = extractToken(envContent, 'CODECOV_TOKEN');
  
  return tokens;
}

// Configura um secret no repositório GitHub
function setSecret(name, value) {
  if (!value) {
    console.log(`⚠️ O token ${name} não está configurado. Pulando...`);
    return false;
  }
  
  try {
    console.log(`🔐 Configurando secret ${name}...`);
    execSync(`gh secret set ${name} -b"${value}"`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.log(`❌ Erro ao configurar secret ${name}: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🔧 Configuração de Secrets no GitHub\n');
  
  // Verifica pré-requisitos
  if (!checkGithubCli()) {
    console.log('❌ GitHub CLI (gh) não encontrado. Instale-o primeiro:');
    console.log('   https://cli.github.com/manual/installation');
    process.exit(1);
  }
  
  if (!checkGithubAuth()) {
    console.log('❌ Você não está autenticado no GitHub CLI. Execute:');
    console.log('   gh auth login');
    process.exit(1);
  }
  
  // Carrega tokens do .env
  const tokens = loadEnvTokens();
  if (!tokens) {
    process.exit(1);
  }
  
  console.log('🔍 Tokens encontrados no arquivo .env:');
  console.log(`   NPM_TOKEN: ${tokens.NPM_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   SONAR_TOKEN: ${tokens.SONAR_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   CODECOV_TOKEN: ${tokens.CODECOV_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  
  // Confirma a configuração
  const answer = await new Promise(resolve => {
    rl.question('\n🚀 Deseja configurar esses tokens como secrets no GitHub? (s/N): ', resolve);
  });
  
  if (answer.toLowerCase() !== 's') {
    console.log('❌ Operação cancelada.');
    process.exit(0);
  }
  
  // Configura os secrets
  const results = [];
  results.push(setSecret('NPM_TOKEN', tokens.NPM_TOKEN));
  results.push(setSecret('SONAR_TOKEN', tokens.SONAR_TOKEN));
  results.push(setSecret('CODECOV_TOKEN', tokens.CODECOV_TOKEN));
  
  const successCount = results.filter(Boolean).length;
  console.log(`\n✅ ${successCount} secret(s) configurado(s) com sucesso!`);
  
  if (successCount < results.length) {
    console.log('⚠️ Alguns secrets não foram configurados. Verifique os erros acima.');
  }
  
  console.log('\n📝 Nota: O GITHUB_TOKEN é fornecido automaticamente pelo GitHub Actions');
  console.log('   e não precisa ser configurado manualmente como secret.');
  
  rl.close();
}

main();
