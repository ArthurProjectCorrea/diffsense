#!/usr/bin/env node

/**
 * Script para configurar tokens de ambiente para o DiffSense
 * Este script interativo auxilia na configuração dos tokens necessários
 * para os workflows do GitHub Actions
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Obter o diretório atual para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Verifica se .env já existe
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n🔍 Arquivo .env existente encontrado. Configurações atuais serão preservadas quando possível.');
} catch (error) {
  // Copia .env.example para .env se não existir
  try {
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, exampleContent, 'utf8');
    envContent = exampleContent;
    console.log('\n✅ Arquivo .env criado com base no modelo .env.example');
  } catch (exError) {
    console.error('❌ Erro ao criar arquivo .env:', exError.message);
    process.exit(1);
  }
}

// Extrai configurações existentes
const extractEnvValue = (content, key) => {
  const regex = new RegExp(`${key}=(.*)`, 'm');
  const match = content.match(regex);
  return match ? match[1] : '';
};

const configs = {
  GH_TOKEN: extractEnvValue(envContent, 'GH_TOKEN'),
  NPM_TOKEN: extractEnvValue(envContent, 'NPM_TOKEN'),
  SONAR_TOKEN: extractEnvValue(envContent, 'SONAR_TOKEN'),
  CODECOV_TOKEN: extractEnvValue(envContent, 'CODECOV_TOKEN')
};

// Descrições e instruções para cada token
const tokenInfos = {
  GH_TOKEN: {
    description: 'GitHub Personal Access Token',
    instructions: 
      'Para criar: GitHub > Settings > Developer settings > Personal access tokens\n' +
      'Permissões necessárias: repo, workflow, write:packages, issues, pull_requests'
  },
  NPM_TOKEN: {
    description: 'Token para publicação no npm Registry',
    instructions: 
      'Para criar: npmjs.com > Perfil > Access Tokens > Generate New Token\n' +
      'Tipo recomendado: Automation (para CI/CD)'
  },
  SONAR_TOKEN: {
    description: 'Token para análises SonarCloud (opcional)',
    instructions: 
      'Para criar: sonarcloud.io > My Account > Security > Generate Token'
  },
  CODECOV_TOKEN: {
    description: 'Token para relatórios de cobertura Codecov (opcional)',
    instructions: 
      'Para criar: codecov.io > Repository Settings > Upload Token'
  }
};

console.log('\n🔐 Configuração de tokens para DiffSense\n');
console.log('Este script irá ajudá-lo a configurar os tokens necessários');
console.log('para os workflows do GitHub Actions funcionarem corretamente.\n');
console.log('Os tokens opcionais podem ser deixados em branco se você não usar esses serviços.\n');

const questions = Object.keys(configs).map(key => {
  return () => new Promise((resolve) => {
    const info = tokenInfos[key];
    const currentValue = configs[key] ? '********' : '(não configurado)';
    
    console.log(`\n📌 ${info.description}`);
    console.log(`   Valor atual: ${currentValue}`);
    console.log(`\n   ${info.instructions}\n`);
    
    rl.question(`   Novo valor para ${key} (deixe em branco para manter o atual): `, (answer) => {
      if (answer.trim()) {
        configs[key] = answer.trim();
        console.log('   ✅ Valor atualizado');
      } else if (!configs[key]) {
        console.log('   ⚠️ Token não configurado');
      } else {
        console.log('   ✅ Valor mantido');
      }
      resolve();
    });
  });
});

// Função para executar as perguntas em sequência
async function askQuestions() {
  for (const question of questions) {
    await question();
  }
  
  // Atualiza o arquivo .env
  try {
    let newContent = envContent;
    
    for (const [key, value] of Object.entries(configs)) {
      // Só atualiza se houver um valor
      if (value) {
        const regex = new RegExp(`${key}=.*`, 'm');
        if (newContent.match(regex)) {
          newContent = newContent.replace(regex, `${key}=${value}`);
        } else {
          newContent += `\n${key}=${value}`;
        }
      }
    }
    
    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('\n✅ Arquivo .env atualizado com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao atualizar arquivo .env:', error.message);
  }
  
  console.log('\n⚠️ LEMBRETE: O arquivo .env contém tokens sensíveis e não deve ser compartilhado ou commitado.');
  console.log('   Verifique se .env está no seu arquivo .gitignore\n');
  
  rl.close();
}

askQuestions();
