#!/usr/bin/env node

/**
 * Script para testar a cobertura do sistema de classificação para diferentes tipos de arquivos
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const TEST_FIXTURES_DIR = 'tests/fixtures/file-classification';

// Criar diretório de fixtures se não existir
async function setupTestFixtures() {
  try {
    await fs.mkdir(TEST_FIXTURES_DIR, { recursive: true });
    console.log(`✅ Criado diretório ${TEST_FIXTURES_DIR}`);
  } catch (err) {
    console.error(`❌ Erro ao criar diretório de fixtures: ${err.message}`);
    return false;
  }
  return true;
}

// Criar arquivos de teste para diferentes extensões e tipos de conteúdo
async function createTestFixtures() {
  const fixtures = [
    // Arquivos TypeScript
    {
      path: `${TEST_FIXTURES_DIR}/component.tsx`,
      content: `import React from 'react';
export const MyComponent: React.FC = () => {
  return <div>Hello World</div>;
};`
    },
    {
      path: `${TEST_FIXTURES_DIR}/types.d.ts`,
      content: `export interface User {
  id: number;
  name: string;
  email?: string;
}`
    },
    {
      path: `${TEST_FIXTURES_DIR}/util.ts`,
      content: `export function formatDate(date: Date): string {
  return date.toISOString();
}`
    },
    
    // Arquivos JavaScript
    {
      path: `${TEST_FIXTURES_DIR}/script.js`,
      content: `function calculateTotal(items) {
  return items.reduce((total, item) => total + item.price, 0);
}
module.exports = { calculateTotal };`
    },
    
    // Arquivos de teste
    {
      path: `${TEST_FIXTURES_DIR}/util.test.ts`,
      content: `import { formatDate } from './util';
describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate(new Date(2023, 0, 1))).toMatch(/2023-01-01/);
  });
});`
    },
    
    // Documentação
    {
      path: `${TEST_FIXTURES_DIR}/README.md`,
      content: `# Test Fixtures
This directory contains test fixtures for the DiffSense file classification system.`
    },
    
    // Configuração
    {
      path: `${TEST_FIXTURES_DIR}/tsconfig.json`,
      content: `{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "strict": true
  }
}`
    },
    
    // Outros tipos de arquivo
    {
      path: `${TEST_FIXTURES_DIR}/styles.css`,
      content: `.container {
  display: flex;
  flex-direction: column;
}`
    },
    {
      path: `${TEST_FIXTURES_DIR}/data.json`,
      content: `{
  "users": [
    {"id": 1, "name": "John"},
    {"id": 2, "name": "Alice"}
  ]
}`
    },
    {
      path: `${TEST_FIXTURES_DIR}/schema.graphql`,
      content: `type User {
  id: ID!
  name: String!
  email: String
}`
    },
    
    // Modificações específicas para testar detecção de fix vs feat
    {
      path: `${TEST_FIXTURES_DIR}/buggy.ts`,
      content: `export function processList<T>(items: T[]): T[] {
  // Erro proposital: não verificamos se items é null
  return items.filter(item => item !== undefined);
}`
    },
    {
      path: `${TEST_FIXTURES_DIR}/fixed.ts`,
      content: `export function processList<T>(items: T[] | null | undefined): T[] {
  // Correção: verificamos null/undefined
  if (!items) return [];
  return items.filter(item => item !== undefined);
}`
    }
  ];
  
  for (const fixture of fixtures) {
    try {
      await fs.writeFile(fixture.path, fixture.content);
      console.log(`✅ Criado fixture: ${path.basename(fixture.path)}`);
    } catch (err) {
      console.error(`❌ Erro ao criar fixture ${fixture.path}: ${err.message}`);
    }
  }
}

// Testar classificação para cada tipo de arquivo
async function testFileClassification() {
  console.log("\n🔍 TESTANDO CLASSIFICAÇÃO DE ARQUIVOS\n");
  
  // Criar um git repo temporário para testar
  try {
    execSync('git init', { cwd: TEST_FIXTURES_DIR });
    execSync('git config user.email "test@example.com"', { cwd: TEST_FIXTURES_DIR });
    execSync('git config user.name "Test User"', { cwd: TEST_FIXTURES_DIR });
    console.log("✅ Repositório git inicializado para testes");
  } catch (err) {
    console.error(`❌ Erro ao inicializar git: ${err.message}`);
    return;
  }
  
  // Adicionar todos os arquivos ao git
  try {
    execSync('git add .', { cwd: TEST_FIXTURES_DIR });
    execSync('git commit -m "Initial commit"', { cwd: TEST_FIXTURES_DIR });
    console.log("✅ Arquivos adicionados ao repositório");
  } catch (err) {
    console.error(`❌ Erro ao adicionar arquivos: ${err.message}`);
    return;
  }
  
  // Modificar arquivos para simular alterações
  const modifications = [
    {
      path: `${TEST_FIXTURES_DIR}/util.ts`,
      content: `export function formatDate(date: Date): string {
  // Adicionando suporte a formatos personalizados
  return date.toISOString().split('T')[0];
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}`
    },
    {
      path: `${TEST_FIXTURES_DIR}/buggy.ts`,
      content: `export function processList<T>(items: T[] | null | undefined): T[] {
  // Corrigido o bug: agora verificamos se items é null ou undefined
  if (!items) return [];
  return items.filter(item => item !== undefined);
}`
    },
    {
      path: `${TEST_FIXTURES_DIR}/README.md`,
      content: `# Test Fixtures
This directory contains test fixtures for the DiffSense file classification system.

## How to use
Add files to test different classification scenarios.

## Available fixtures
- TypeScript files
- JavaScript files
- Configuration files
- Documentation
- Test files`
    }
  ];
  
  for (const mod of modifications) {
    try {
      await fs.writeFile(mod.path, mod.content);
      console.log(`✅ Modificado: ${path.basename(mod.path)}`);
    } catch (err) {
      console.error(`❌ Erro ao modificar ${mod.path}: ${err.message}`);
    }
  }
  
  // Executar o script de classificação
  console.log("\n🚀 Executando classificação...\n");
  try {
    // Navegar para o diretório de fixtures e executar o script
    process.chdir(TEST_FIXTURES_DIR);
    const result = execSync('node ../../bin/commit-by-type-new.js --show-only', { encoding: 'utf8' });
    console.log(result);
  } catch (err) {
    console.error(`❌ Erro ao executar classificação: ${err.message}`);
  }
  
  // Voltar para o diretório original
  process.chdir('../..');
  
  console.log("\n🎯 RESULTADOS DO TESTE DE CLASSIFICAÇÃO\n");
  console.log("Verifique se os tipos de arquivos foram classificados corretamente:");
  console.log("1. TypeScript: .ts, .tsx, .d.ts devem ser classificados corretamente");
  console.log("2. JavaScript: .js, .jsx devem ser classificados");
  console.log("3. Arquivos de teste: .test.ts, .spec.js, etc devem ser 'test'");
  console.log("4. Documentação: .md deve ser 'docs'");
  console.log("5. Configuração: .json, .yaml devem ser 'chore'");
  console.log("6. Correções: modificações em buggy.ts devem ser 'fix'");
  console.log("7. Features: adição de novas funções em util.ts deve ser 'feat'");
}

// Função principal
async function runTests() {
  console.log("🧪 TESTE DE COBERTURA DO SISTEMA DE CLASSIFICAÇÃO DE ARQUIVOS\n");
  
  const setupSuccess = await setupTestFixtures();
  if (!setupSuccess) return;
  
  await createTestFixtures();
  await testFileClassification();
  
  console.log("\n✨ Testes concluídos!");
}

// Executar os testes
runTests().catch(err => {
  console.error("❌ Erro ao executar testes:", err);
  process.exit(1);
});
