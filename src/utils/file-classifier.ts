/**
 * Módulo compartilhado para classificação de arquivos
 * Este módulo centraliza a lógica de classificação para garantir consistência entre diferentes comandos
 */

import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

// Exportar como ESM module
export type CommitType = 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'chore';
export type BreakingCommitType = `${CommitType}!`;
export type AnyCommitType = CommitType | BreakingCommitType;

// Definir pesos para os diferentes tipos de commit
export const TYPE_WEIGHTS: Record<string, number> = {
  'feat!': 100,  // Breaking changes têm o maior peso - prioridade máxima
  'fix!': 90,    // Correções com breaking changes - muito importante
  'feat': 80,    // Novas funcionalidades
  'fix': 70,     // Correções
  'docs': 60,    // Documentação
  'refactor': 50, // Refatoração
  'test': 40,    // Testes
  'chore': 30    // Manutenção
};

// Lista de padrões de arquivos irrelevantes para o versionamento semântico
// Esses arquivos serão sempre classificados como 'chore' e terão peso reduzido
export const NON_VERSIONING_FILES = [
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
  
  // Arquivos de build
  'dist/',
  'build/',
  
  // Documentação
  'README-*.md',
  'README-WIKI.md',
  '.github/wiki/',
  '.github/instructions/',
  
  // Configurações de CI/CD
  '.travis.yml',
  '.github/workflows/',
  'azure-pipelines.yml',
  
  // Arquivos de ambiente
  '.env.example',
  '.env.sample',
  
  // Scripts auxiliares
  'scripts/',
  
  // Configurações de editor
  '.editorconfig',
];

const execAsync = promisify(exec);

/**
 * Verifica se um arquivo é relevante para versionamento semântico
 * @param filePath Caminho do arquivo
 * @returns true se o arquivo é relevante, false caso contrário
 */
export function isRelevantForVersioning(filePath: string): boolean {
  for (const pattern of NON_VERSIONING_FILES) {
    if (pattern.endsWith('/')) {
      // É um padrão de diretório
      if (filePath.startsWith(pattern)) {
        return false;
      }
    } else {
      // É um padrão de arquivo
      if (filePath === pattern || 
          filePath.endsWith('/' + pattern) ||
          new RegExp(pattern.replace('*', '.*')).test(filePath)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Classifica um arquivo com base em seu nome e conteúdo
 * @param filePath Caminho do arquivo
 * @returns O tipo de commit mais apropriado para o arquivo
 */
export async function classifyFile(filePath: string): Promise<AnyCommitType> {
  // Verificar se o arquivo é relevante para versionamento
  if (!isRelevantForVersioning(filePath)) {
    return 'chore';
  }
  
  // Verificar se é o package.json (caso especial)
  if (filePath === 'package.json') {
    return 'chore';
  }
  
  // Análise baseada em padrões de nome de arquivo
  if (filePath.match(/\.(md|txt|docx?)$/i) || filePath.match(/docs\//i)) {
    // Arquivos de documentação
    return 'docs';
  } else if (filePath.match(/\.(spec|test)\.(js|ts|jsx|tsx)$/i) || filePath.match(/tests?\//i)) {
    // Arquivos de teste
    return 'test';
  } else if (filePath.match(/features\//i) || filePath.match(/\/features\//i)) {
    // Arquivos na pasta features são sempre novas funcionalidades
    return 'feat';
  } else if (filePath.match(/\.(js|ts|jsx|tsx|vue|svelte)$/i)) {
    // Verificar se o arquivo é novo (não rastreado)
    try {
      // Verificamos explicitamente arquivos não rastreados - arquivos novos que não estão no Git
      const { stdout: isUntracked } = await execAsync(`git ls-files --others --exclude-standard "${filePath}"`);
      
      // Se for um arquivo novo (não rastreado)
      if (isUntracked.trim() === filePath) {
        console.log(`Arquivo não rastreado detectado: ${filePath}`);
        
        // Tentar analisar o conteúdo para determinar o tipo mais preciso
        try {
          // Ler conteúdo do arquivo usando fs em vez de cat para compatibilidade com Windows
          const fileContent = await fs.readFile(filePath, 'utf8');
          
          // Arquivo na pasta de testes ou com padrões de teste
          if (filePath.includes('/tests/') || filePath.includes('/test/') || 
              filePath.includes('\\tests\\') || filePath.includes('\\test\\') || 
              filePath.match(/\.(spec|test)\.(js|ts|jsx|tsx)$/i) ||
              fileContent.includes('test(') || fileContent.includes('describe(') || 
              fileContent.includes('it(')) {
            console.log(`Classificando como teste: ${filePath}`);
            return 'test';
          } 
          // Arquivo de documentação ou ajuda
          else if (filePath.match(/\.(md|txt|docx?)$/i) || filePath.match(/docs\//i)) {
            return 'docs';
          }
          // Arquivo com correção de bug
          else if (fileContent.includes('fix') || fileContent.includes('bug') || 
                    fileContent.includes('error') || fileContent.includes('resolve')) {
            return 'fix';
          } 
          // Arquivo de refatoração ou helper
          else if ((fileContent.includes('refactor') || fileContent.includes('helper')) && 
                    !fileContent.match(/export (default |class|function)/)) {
            console.log(`Classificando como refactor: ${filePath}`);
            return 'refactor';
          }
          
          // Por padrão, um arquivo novo é considerado nova funcionalidade
          console.log(`Classificando como feat: ${filePath}`);
          return 'feat';
        } catch (err) {
          console.log(`Erro ao ler conteúdo, usando feat como padrão: ${filePath}`);
          // Se não conseguir ler o conteúdo, classifica como nova funcionalidade
          return 'feat';
        }
      }
      
      // Para arquivos existentes, analisar o diff
      const { stdout: gitDiff } = await execAsync(`git diff HEAD -- "${filePath}" 2>/dev/null || echo ""`);
      
      // Verificar breaking changes
      const hasBreakingChange = gitDiff.includes('BREAKING CHANGE') || gitDiff.includes('BREAKING-CHANGE');
      
      // Verificar características do diff para classificação mais precisa
      if (gitDiff.includes('export function') || gitDiff.includes('export const') || 
          gitDiff.includes('export class') || gitDiff.includes('export default') ||
          gitDiff.match(/\+\s*function\s+\w+/) || gitDiff.match(/\+\s*class\s+\w+/)) {
        // Adição de novas funções ou classes = nova funcionalidade
        return hasBreakingChange ? 'feat!' : 'feat';
      } else if (gitDiff.includes('fix') || gitDiff.includes('bug') || gitDiff.includes('error') ||
                gitDiff.includes('corrigir') || gitDiff.includes('resolve')) {
        // Correção de bugs
        return hasBreakingChange ? 'fix!' : 'fix';
      } else if (gitDiff.includes('refactor') || gitDiff.match(/-\s*\w+\s*[:=]\s*function/) && 
                gitDiff.match(/\+\s*\w+\s*[:=]\s*function/) || 
                (gitDiff.match(/-\s*const\s+/) && gitDiff.match(/\+\s*const\s+/))) {
        // Modificações que parecem refatoração (renomeação, reorganização)
        return hasBreakingChange ? 'refactor!' : 'refactor';
      } else {
        // Determinar de forma mais precisa baseado em análise adicional
        
        // Verificar se há muitas linhas removidas e adicionadas (sinal de refatoração)
        const removedLines = (gitDiff.match(/^-/gm) || []).length;
        const addedLines = (gitDiff.match(/^\+/gm) || []).length;
        
        // Se há equilíbrio entre linhas adicionadas e removidas, provavelmente é refatoração
        if (removedLines > 5 && addedLines > 5 && 
            Math.abs(removedLines - addedLines) < Math.max(removedLines, addedLines) * 0.3) {
          return hasBreakingChange ? 'refactor!' : 'refactor';
        }
        
        // Se há muito mais linhas adicionadas que removidas, provavelmente é nova feature
        if (addedLines > removedLines * 2) {
          return hasBreakingChange ? 'feat!' : 'feat';
        }
        
        // Se as mudanças são pequenas, considerar como fix
        if (addedLines + removedLines < 10) {
          return hasBreakingChange ? 'fix!' : 'fix';
        }
        
        // Quando não for possível determinar com certeza, usar refactor
        return hasBreakingChange ? 'refactor!' : 'refactor';
      }
    } catch (error) {
      // Em caso de erro, classificar como chore
      return 'chore';
    }
  }
  
  // Por padrão, classificar como chore
  return 'chore';
}

/**
 * Classifica vários arquivos e os agrupa por tipo
 * @param files Lista de arquivos a serem classificados
 * @returns Um objeto com os arquivos agrupados por tipo
 */
export async function classifyFiles(files: string[]): Promise<Record<AnyCommitType, string[]>> {
  const filesByType: Record<string, string[]> = {};
  
  // Classificar cada arquivo
  for (const file of files) {
    const fileType = await classifyFile(file);
    
    if (!filesByType[fileType]) {
      filesByType[fileType] = [];
    }
    
    filesByType[fileType].push(file);
  }
  
  return filesByType as Record<AnyCommitType, string[]>;
}
