#!/usr/bin/env node

/**
 * Script para agrupar e commitar alterações por tipo no DiffSense
 * Versão com sistema de pesos para classificação inteligente
 * Melhorado com distinção entre arquivos relevantes e não relevantes para versionamento
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Verificar se a opção --show-only foi passada
const showOnly = process.argv.includes('--show-only');

// Definir pesos para os diferentes tipos de commit
// Quanto maior o peso, mais importante é a classificação
const TYPE_WEIGHTS = {
  'feat!': 100,  // Breaking changes têm o maior peso
  'fix!': 90,    // Correções com breaking changes
  'feat': 80,    // Novas funcionalidades
  'fix': 70,     // Correções
  'docs': 60,    // Documentação
  'refactor': 50, // Refatoração
  'test': 40,    // Testes
  'chore': 30    // Manutenção
};

// Lista de padrões de arquivos irrelevantes para o versionamento semântico
// Esses arquivos serão sempre classificados como 'chore' e terão peso reduzido
const NON_VERSIONING_FILES = [
  // Arquivos de lock de pacotes
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  
  // Arquivos de configuração git
  '.gitignore',
  '.gitattributes',
  '.github/',
  
  // Arquivos temporários ou cache
  '.cache/',
  '.vscode/',
  '.idea/',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  
  // Arquivos de configuração npm/pnpm
  '.npmrc',
  '.npmignore',
  '.npmrc.json'
];

// Interface para interação do usuário
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Pergunta ao usuário com promessa para a resposta
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
 * Verifica se um arquivo é relevante para versionamento
 * @param {string} filePath Caminho do arquivo
 * @returns {boolean} True se o arquivo for relevante para versionamento
 */
function isRelevantForVersioning(filePath) {
  // Verificar padrões de arquivos não relevantes
  for (const pattern of NON_VERSIONING_FILES) {
    if (pattern.endsWith('/')) {
      // É um padrão de diretório
      if (filePath.includes(pattern)) {
        return false;
      }
    } else if (pattern.startsWith('*.')) {
      // É um padrão de extensão
      const ext = pattern.replace('*', '');
      if (filePath.endsWith(ext)) {
        return false;
      }
    } else {
      // É um nome específico de arquivo
      if (filePath.endsWith(pattern) || filePath.includes('/' + pattern) || filePath.includes('\\' + pattern)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Analisa o diff de um arquivo e atribui pesos para cada tipo de alteração encontrada
 * @param {string} filePath Caminho do arquivo alterado
 * @returns {Object} Objeto com os pesos para cada tipo de alteração
 */
function analyzeFileDiff(filePath) {
  // Objeto para armazenar os pesos de cada tipo de alteração
  const typeWeights = {
    'feat': 0,
    'feat!': 0,
    'fix': 0,
    'fix!': 0,
    'docs': 0,
    'test': 0,
    'refactor': 0,
    'chore': 0
  };
  
  // Verificar se o arquivo é relevante para versionamento
  if (!isRelevantForVersioning(filePath)) {
    // Arquivo não é relevante para versionamento, classificar como 'chore' com peso baixo
    typeWeights['chore'] = 15; // Peso baixo fixo para arquivos não relevantes
    return typeWeights;
  }
  
  try {
    // Obter o diff do arquivo
    const diffOutput = execSync(`git diff -- "${filePath}"`, { encoding: 'utf8' });
    
    // Dividir o diff em chunks/hunks para analisar cada alteração separadamente
    const diffHunks = diffOutput.split(/^@@.+@@/m).slice(1);
    
    // Padrões para identificar cada tipo de alteração
    const patterns = {
      'fix': [
        /\bfix(ed|es|ing)?\b/i,
        /\berror\b/i,
        /\bbug\b/i,
        /\bcorrec|\bcorrig/i,
        /\bresolve\b/i,
        /\bTS\d+\b/,                 // Códigos de erro TypeScript
        /\bTypescript.*error\b/i,
        /\?\./,                       // Adição de operador opcional
        /\?:/,                       // Tipos opcionais
        /\bundefined\b/i,
        /\bnull\b/i,
        /\+\s*import/i,              // Adição de importações (correções comuns)
        /:\s*(string|number|boolean|any)\b/i, // Tipagem
        /\/\/\s*@ts-ignore/i         // Ignorando erros de TS
      ],
      'feat': [
        /\badd(ed|ing)?\b/i,
        /\bnew\b/i,
        /\bimplement(ed|ing)?\b/i,
        /\bfeature\b/i,
        /\+\s*export/i,              // Novas exportações
        /\+\s*(class|interface|type|enum|function)/i, // Novas definições
        /\+\s*const\s+\w+\s*=/i      // Novas constantes
      ],
      'refactor': [
        /\brefactor\b/i,
        /\brewrite\b/i,
        /\bimprove\b/i,
        /\boptimiz(e|ing)\b/i,
        /\bclean\b/i,
        /\bsimplif(y|ied)\b/i
      ],
      'docs': [
        /\bdoc(s|umentation)\b/i,
        /\bcomment\b/i,
        /\+\s*\/\*\*/i,              // JSDoc
        /\+\s*\/\/\//i,              // TSDoc
        /\+\s*#/i,                   // Markdown heading
        /README/i
      ],
      'test': [
        /\btest\b/i,
        /\bspec\b/i,
        /\bmock\b/i,
        /\bassert\b/i,
        /\bexpect\b/i,
        /\bit\(/i,
        /\bdescribe\(/i
      ]
    };
    
    // Padrões para breaking changes
    const breakingPatterns = [
      /\-\s*export/,                // Remoção de exportações
      /\-\s*public/,                // Remoção de membros públicos
      /\-\s*(interface|type|class|function)/i, // Remoção de definições
      /\breaking\b/i,
      /\incompatib/i,
      /\!:/,
      /\bmajor\b/i
    ];
    
    // Considerar o tipo de arquivo para ajustar os pesos iniciais
    const ext = path.extname(filePath).toLowerCase();
    const fileBaseName = path.basename(filePath).toLowerCase();
    
    // Dar pesos iniciais baseados no tipo de arquivo
    if (fileBaseName === 'readme.md' || fileBaseName === 'changelog.md' || ext === '.md') {
      typeWeights['docs'] += 20;
    } else if (filePath.includes('/test') || filePath.includes('\\test') || 
              fileBaseName.includes('.test.') || fileBaseName.includes('.spec.')) {
      typeWeights['test'] += 20;
    } else if (filePath.includes('/src/') || filePath.includes('\\src\\')) {
      // Código-fonte tem chance de ser feature ou fix
      typeWeights['feat'] += 10;
      typeWeights['fix'] += 5;
    } else if (filePath.includes('package.json') || filePath.includes('.config.') || 
              filePath.includes('.rc') || fileBaseName === 'tsconfig.json') {
      typeWeights['chore'] += 15;
    }
    
    // Analisar cada hunk do diff separadamente
    for (const hunk of diffHunks) {
      // Verificar breaking changes em todo o hunk
      for (const pattern of breakingPatterns) {
        if (pattern.test(hunk)) {
          if (typeWeights['fix'] > typeWeights['feat']) {
            typeWeights['fix!'] += 50; // Breaking change em uma correção
          } else {
            typeWeights['feat!'] += 50; // Breaking change em uma feature
          }
          break;
        }
      }
      
      // Dividir o hunk em linhas para análise mais detalhada
      const lines = hunk.split('\n');
      
      // Verificar cada linha do diff
      for (const line of lines) {
        // Ignorar linhas de contexto (não começam com + ou -)
        if (!line.startsWith('+') && !line.startsWith('-')) continue;
        
        const isAddition = line.startsWith('+');
        const isDeletion = line.startsWith('-');
        
        // Analisar cada tipo possível
        for (const [type, typePatterns] of Object.entries(patterns)) {
          for (const pattern of typePatterns) {
            if (pattern.test(line)) {
              // Adições têm peso maior para 'feat', remoções para 'fix' ou 'refactor'
              if (isAddition && type === 'feat') {
                typeWeights[type] += 8;
              } else if (isDeletion && (type === 'fix' || type === 'refactor')) {
                typeWeights[type] += 6;
              } else if (isAddition && type === 'fix') {
                typeWeights[type] += 10; // Correções adicionadas têm peso alto
              } else {
                typeWeights[type] += 5; // Peso padrão
              }
              break;
            }
          }
        }
      }
    }
    
    // Lógica especial para arquivos específicos que sabemos que são críticos
    if (filePath === 'src/core/rules-engine.ts' || 
        filePath === 'src\\core\\rules-engine.ts' ||
        filePath === 'src/core/semantic-analyzer.ts' || 
        filePath === 'src\\core\\semantic-analyzer.ts' ||
        filePath === 'src/types/index.ts' || 
        filePath === 'src\\types\\index.ts') {
      
      // Se tem sinais claros de correção, aumentar o peso significativamente
      if (typeWeights['fix'] > 0) {
        typeWeights['fix'] *= 1.5;
      }
    }
    
    return typeWeights;
  } catch (error) {
    console.error(`Erro ao analisar diff de ${filePath}:`, error.message);
    return typeWeights;
  }
}

/**
 * Verifica se uma alteração é provavelmente uma correção de erro
 * @param {string} filePath Caminho do arquivo alterado
 * @returns {boolean} True se for provavelmente uma correção
 */
function checkIsErrorFix(filePath) {
  // Verificar o conteúdo do arquivo para identificar alterações de erro
  try {
    // Verificar se o arquivo é relevante para versionamento
    if (!isRelevantForVersioning(filePath)) {
      return false; // Não é relevante para versionamento
    }
    
    // 1. Verificar o diff do arquivo para identificar padrões de correção
    const diffOutput = execSync(`git diff -- "${filePath}"`, { encoding: 'utf8' });
    
    // Padrões que indicam correções de erros em tipos
    const errorPatterns = [
      /\bfix\b/i,
      /\berror\b/i,
      /\bcorrec|\bcorrig/i,
      /\bbug\b/i,
      /\bresolve\b/i,
      /\bTypescript.*error\b/i,
      /\bTS\d+\b/,                 // Códigos de erro TypeScript como TS2305
      /\b(type|interface).*missing\b/i,
      /\?:/,                       // Adição de tipos opcionais
      /\boptional\b/i,             // Marcação explícita de propriedades opcionais
      /:\s*(string|number|boolean|any)\b/i, // Adição/modificação de anotações de tipo
      /\bimport\s+{/i,             // Correção de importações
      /undefined.*type\b/i,
      /implicit.*any\b/i,
      /cannot.*assigned\b/i,
      /\?\./,                      // Adição de operador opcional (?.)
      /\+\s*import/i               // Corrigindo importações
    ];
    
    // Verificar se algum dos padrões de erro está presente no diff
    for (const pattern of errorPatterns) {
      if (pattern.test(diffOutput)) {
        return true;
      }
    }
    
    // 2. Verificar commits recentes para ver se mencionam correções
    try {
      const recentCommits = execSync('git log -n 5 --oneline', { encoding: 'utf8' });
      const fixPatterns = [/\bfix\b/i, /\berror\b/i, /\bbug\b/i, /\bresolve\b/i, /\bcrash\b/i];
      
      for (const pattern of fixPatterns) {
        if (pattern.test(recentCommits)) {
          return true;
        }
      }
    } catch (e) {
      // Falha ao verificar commits, continuar com outras heurísticas
    }
    
    // 3. Verificar o nome do arquivo e caminho
    if (filePath.toLowerCase().includes('fix') || 
        filePath.toLowerCase().includes('patch') || 
        filePath.toLowerCase().includes('hotfix')) {
      return true;
    }
    
    // 4. Verificar se são arquivos críticos do sistema que normalmente requerem correções
    if (filePath.includes('src/core/rules-engine.ts') ||
        filePath.includes('src\\core\\rules-engine.ts') ||
        filePath.includes('src/core/semantic-analyzer.ts') ||
        filePath.includes('src\\core\\semantic-analyzer.ts')) {
      
      // Analisar o diff para ver se são mudanças de tipagem
      if (diffOutput.includes('?') || 
          diffOutput.includes('import') || 
          diffOutput.includes('undefined') ||
          diffOutput.includes('any')) {
        return true;
      }
    }
    
  } catch (e) {
    // Se houver um erro ao analisar, retornar false
    return false;
  }
  
  return false;
}

/**
 * Verifica se uma alteração é provavelmente um breaking change
 * @param {string} fileContent Conteúdo do arquivo alterado
 * @param {string} filePath Caminho do arquivo
 * @returns {boolean} True se for provavelmente um breaking change
 */
function isBreakingChange(fileContent, filePath) {
  try {
    // Verificar se o arquivo é relevante para versionamento
    if (!isRelevantForVersioning(filePath)) {
      return false; // Não é relevante para versionamento
    }
    
    // Padrões que indicam breaking changes
    const breakingPatterns = [
      /\-\s*export/,              // Remoção de exportações
      /\-\s*public/,              // Remoção de membros públicos
      /\-\s*(interface|type|class|function)/i, // Remoção de tipos/interfaces/classes/funções
      /\breaking\b/i,             // Menção explícita a breaking
      /\incompatib/i,             // Menções a incompatibilidade
      /change.*API/i,             // Mudança na API
      /\!:/                       // Marcação convencional de breaking change
    ];
    
    for (const pattern of breakingPatterns) {
      if (pattern.test(fileContent)) {
        return true;
      }
    }
  } catch (e) {
    return false;
  }
  
  return false;
}

/**
 * Verifica se um arquivo é um arquivo de teste
 */
function isTest(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  return filePath.includes('/tests/') || 
         filePath.includes('\\tests\\') ||
         filePath.includes('/test/') || 
         filePath.includes('\\test\\') ||
         filePath.includes('/__tests__/') || 
         filePath.includes('\\_tests__\\') ||
         fileName.endsWith('.test.js') ||
         fileName.endsWith('.test.ts') ||
         fileName.endsWith('.spec.js') ||
         fileName.endsWith('.spec.ts');
}

/**
 * Verifica se um arquivo é documentação
 */
function isDoc(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  
  return fileName === 'readme.md' || 
         fileName === 'license' || 
         (ext === '.md' && (
           fileName.includes('changelog') || 
           filePath.includes('/docs/') || 
           filePath.includes('\\docs\\')
         ));
}

/**
 * Verifica se uma alteração é uma correção de tipos
 */
function isTypeFix(filePath, fileContent) {
  return checkIsErrorFix(filePath);
}

/**
 * Verifica se um arquivo é uma feature
 */
function isFeature(filePath) {
  return filePath.startsWith('src/') || 
         filePath.startsWith('src\\') || 
         filePath.startsWith('lib/') || 
         filePath.startsWith('lib\\');
}

/**
 * Verifica se um arquivo é de manutenção
 */
function isChore(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  return filePath.includes('package.json') || 
         filePath.includes('tsconfig.json') || 
         filePath.includes('.gitignore') ||
         fileName.endsWith('.md') || 
         fileName.endsWith('.yml') || 
         fileName.endsWith('.yaml');
}

/**
 * Função principal do script
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
    
    // Objeto para armazenar os tipos detectados e seus pesos para cada arquivo
    const fileTypeWeights = {};
    
    let processedFiles = 0;
    
    // Iniciar barra de progresso para classificação
    showProgress('Classificando alterações', 0);
    
    console.log(`Arquivos encontrados: ${files.length}\n${files.join('\n')}`);
    
    // Processamento por arquivo
    for (const filePath of files) {
      // Inicializar objeto para armazenar pesos
      if (!fileTypeWeights[filePath]) {
        fileTypeWeights[filePath] = {};
      }
      
      // Verificar se o arquivo é relevante para versionamento
      const relevantForVersioning = isRelevantForVersioning(filePath);
      
      // Se não for relevante para versionamento, classificá-lo como 'chore'
      if (!relevantForVersioning) {
        fileTypeWeights[filePath]['chore'] = 15; // Peso baixo fixo
        continue; // Não analisar mais este arquivo
      }
      
      // Usar nossa nova função para analisar o diff e obter os pesos para cada tipo
      const diffAnalysis = analyzeFileDiff(filePath);
      
      // Aplicar os pesos do diff para cada tipo
      for (const [type, weight] of Object.entries(diffAnalysis)) {
        if (weight > 0) {
          // Multiplicar pelo peso base do tipo para priorizar tipos mais importantes
          const finalWeight = weight * (TYPE_WEIGHTS[type] || 30) / 10;
          fileTypeWeights[filePath][type] = (fileTypeWeights[filePath][type] || 0) + finalWeight;
        }
      }
      
      // Caso especial: Se não detectamos pesos significativos, usar a classificação básica
      const hasSignificantWeights = Object.values(diffAnalysis).some(weight => weight > 10);
      
      if (!hasSignificantWeights) {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        
        // Classificação básica baseada no caminho e extensão
        // Arquivos críticos que sabemos que são frequentemente correções
        if (filePath === 'src/core/rules-engine.ts' || 
            filePath === 'src\\core\\rules-engine.ts' ||
            filePath === 'src/core/semantic-analyzer.ts' || 
            filePath === 'src\\core\\semantic-analyzer.ts' ||
            filePath === 'src/types/index.ts' || 
            filePath === 'src\\types\\index.ts' ||
            filePath === 'src/index.ts' || 
            filePath === 'src\\index.ts') {
          
          // Verificar se é uma correção de tipo TypeScript
          const isErrorFix = checkIsErrorFix(filePath);
          
          if (isErrorFix) {
            // Dar um peso extra para 'fix' para estes arquivos críticos
            fileTypeWeights[filePath]['fix'] = (fileTypeWeights[filePath]['fix'] || 0) + TYPE_WEIGHTS['fix'] * 1.5;
          } else {
            // Ainda damos um peso base para fix, mas menor
            fileTypeWeights[filePath]['fix'] = (fileTypeWeights[filePath]['fix'] || 0) + TYPE_WEIGHTS['fix'] * 0.8;
            // E adicionamos um peso para feature também
            fileTypeWeights[filePath]['feat'] = (fileTypeWeights[filePath]['feat'] || 0) + TYPE_WEIGHTS['feat'] * 0.5;
          }
        }
        
        // 1. TESTES - importantes, mas não impactam a API pública
        else if (isTest(filePath)) {
          fileTypeWeights[filePath]['test'] = (fileTypeWeights[filePath]['test'] || 0) + TYPE_WEIGHTS['test'];
        }
        
        // 2. DOCUMENTAÇÃO PÚBLICA - afeta os usuários finais
        else if (isDoc(filePath)) {
          // Verificar se é documentação com breaking changes
          const content = await fs.readFile(filePath, 'utf8').catch(() => '');
          if (isBreakingChange(content, filePath)) {
            fileTypeWeights[filePath]['docs!'] = (fileTypeWeights[filePath]['docs!'] || 0) + TYPE_WEIGHTS['docs!'];
          } else {
            fileTypeWeights[filePath]['docs'] = (fileTypeWeights[filePath]['docs'] || 0) + TYPE_WEIGHTS['docs'];
          }
        }
        
        // 3. CÓDIGO-FONTE DA API PÚBLICA - tem maior impacto
        else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext) && (isFeature(filePath))) {
          // Verificar se é uma correção ou uma nova funcionalidade
          const isErrorFix = checkIsErrorFix(filePath);
          
          if (isErrorFix) {
            fileTypeWeights[filePath]['fix'] = (fileTypeWeights[filePath]['fix'] || 0) + TYPE_WEIGHTS['fix'];
          } else {
            fileTypeWeights[filePath]['feat'] = (fileTypeWeights[filePath]['feat'] || 0) + TYPE_WEIGHTS['feat'];
          }
        }
        
        // 4. OUTRAS ALTERAÇÕES - geralmente manutenção
        else if (isChore(filePath)) {
          fileTypeWeights[filePath]['chore'] = (fileTypeWeights[filePath]['chore'] || 0) + TYPE_WEIGHTS['chore'];
        } else {
          fileTypeWeights[filePath]['chore'] = (fileTypeWeights[filePath]['chore'] || 0) + TYPE_WEIGHTS['chore'];
        }
      }
      
      // Atualizar barra de progresso
      processedFiles++;
      showProgress('Classificando alterações', Math.floor((processedFiles / files.length) * 100));
    }
    
    // Processar o sistema de pesos para determinar o tipo final de cada arquivo
    console.log('\n⚖️ Aplicando sistema de pesos para classificação final...');
    
    // Para cada arquivo, escolher o tipo com maior peso
    for (const [filePath, weights] of Object.entries(fileTypeWeights)) {
      let maxWeight = 0;
      let finalType = 'chore'; // tipo padrão
      
      // Verificar se o arquivo é relevante para versionamento
      const relevantForVersioning = isRelevantForVersioning(filePath);
      
      // Log detalhado de pesos para cada arquivo
      console.log(`\n   Arquivo: ${path.basename(filePath)}${!relevantForVersioning ? ' (não relevante para versionamento)' : ''}`);
      console.log(`   Pesos detectados:`);
      
      // Se não for relevante para versionamento, forçar 'chore'
      if (!relevantForVersioning) {
        // Forçar chore para arquivos não relevantes
        console.log(`     - chore: 15 (forçado para arquivo não relevante)`);
        finalType = 'chore';
        maxWeight = 15;
      } else {
        for (const [type, weight] of Object.entries(weights)) {
          console.log(`     - ${type}: ${weight}`);
          if (weight > maxWeight) {
            maxWeight = weight;
            finalType = type;
          }
        }
      }
      
      // Adicionar o arquivo ao tipo final escolhido
      if (!fileTypes[finalType]) {
        fileTypes[finalType] = [];
      }
      fileTypes[finalType].push(filePath);
      
      // Log de debug para mostrar a decisão tomada
      console.log(`   → Classificação final: ${finalType} (peso: ${maxWeight})`);
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
