import { ChangeType, CHANGE_PRIORITY, FileChange, FileStatus } from '../types/index.js';
import { minimatch } from 'minimatch';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import chalk from 'chalk';

/**
 * Analisa o conteúdo do diff para determinar os tipos de alteração
 */
export class DiffAnalyzer {
  /**
   * Analisa um diff e identifica os tipos de alteração
   * @param filePath Caminho do arquivo
   * @param diff Conteúdo do diff
   * @param status Status do arquivo
   * @param additions Número de adições
   * @param deletions Número de deleções
   * @returns FileChange com os tipos de alteração identificados
   */
  analyzeFile(filePath: string, diff: string, status: FileStatus, additions: number, deletions: number): FileChange {
    const changeTypes = this.identifyChangeTypes(filePath, diff, status);
    const primaryType = this.determinePrimaryType(changeTypes);
    
    return {
      filePath,
      changeTypes,
      diff,
      primaryType,
      status,
      additions,
      deletions,
    };
  }

  /**
   * Identifica os tipos de alteração com base no diff e no caminho do arquivo
   * @param filePath Caminho do arquivo
   * @param diff Conteúdo do diff
   * @param status Status do arquivo
   * @returns Array de tipos de alteração encontrados
   */
  private identifyChangeTypes(filePath: string, diff: string, status: FileStatus): ChangeType[] {
    const changeTypes: Set<ChangeType> = new Set();
    
    // Classificação baseada no path do arquivo
    // Documentação
    if (
      filePath.includes('README.md') || 
      filePath.includes('docs/') || 
      filePath.includes('.github/wiki/') ||
      filePath.endsWith('.md') || 
      filePath.includes('CONTRIBUTING') ||
      filePath.includes('CHANGELOG')
    ) {
      changeTypes.add(ChangeType.DOCS);
    }
    
    // Testes
    if (
      filePath.includes('/tests/') || 
      filePath.includes('/__tests__/') || 
      filePath.includes('.test.') || 
      filePath.includes('.spec.') ||
      filePath.includes('vitest.config') ||
      filePath.includes('jest.config')
    ) {
      changeTypes.add(ChangeType.TEST);
    }
    
    // Tarefas de manutenção
    if (
      filePath.includes('package.json') || 
      filePath.includes('tsconfig.json') || 
      filePath.includes('.gitignore') ||
      filePath.includes('.eslintrc') ||
      filePath.includes('.github/workflows') ||
      filePath.includes('.env') ||
      filePath.includes('pnpm-lock.yaml') ||
      filePath.includes('yarn.lock') ||
      filePath.includes('package-lock.json')
    ) {
      changeTypes.add(ChangeType.CHORE);
    }
    
    // Se for um arquivo novo, provavelmente é uma nova funcionalidade
    if (status === FileStatus.ADDED) {
      // Se não for documentação nem teste, é uma nova funcionalidade
      if (!changeTypes.has(ChangeType.DOCS) && !changeTypes.has(ChangeType.TEST)) {
        changeTypes.add(ChangeType.FEAT);
      }
    }
    
    // Analisa o conteúdo do diff linha por linha
    const lines = diff.split('\n');
    
    // Padrões para identificar os tipos de alterações
    const featurePatterns = [
      /\+\s*(export|public|function|class|interface|type|const|let|var)\s+\w+/i, // Novas exportações, funções, classes, etc.
      /\+\s*(new feature|adiciona|implements|feature:|feat:|feature\(|feat\()/i,
      /\+\s*\*\s*@param/i, // Adição de parâmetros de função
      /\+\s*\*\s*@returns/i, // Adição de retornos de função
    ];
    
    const fixPatterns = [
      /\+\s*(fix|corrige|resolve|bug|issue|problema):|fix\(/i,
      /-\s*(bug|error|exception|throw|catch)/i, // Remoção de código com erros
      /\+\s*try\s*{/i, // Adição de tratamento de erro
      /\+\s*catch\s*\(/i, // Adição de tratamento de exceção
    ];
    
    const refactorPatterns = [
      /\+\s*(refactor|refatoração|simplifica|melhora performance|otimiza):|refactor\(/i,
      // Mudanças em nomes de variáveis, estrutura de código, etc.
      /[+-]\s*(rename|renomeia|move|reorganiza)/i,
      // Substituição de código (linha removida e adicionada com pequenas mudanças)
      /\+\s*const\s+\w+\s*=/i, // Adicionou uma constante
      /-\s*var\s+\w+\s*=/i // Removeu uma variável
    ];
    
    // Analisar cada linha do diff
    for (const line of lines) {
      if (line.startsWith('+')) { // Linha adicionada
        // Verificar se é uma nova funcionalidade
        if (featurePatterns.some(pattern => pattern.test(line))) {
          changeTypes.add(ChangeType.FEAT);
        }
        
        // Verificar se é uma correção
        if (fixPatterns.some(pattern => pattern.test(line))) {
          changeTypes.add(ChangeType.FIX);
        }
        
        // Verificar se é uma refatoração
        if (refactorPatterns.some(pattern => pattern.test(line))) {
          changeTypes.add(ChangeType.REFACTOR);
        }
      } else if (line.startsWith('-')) { // Linha removida
        // Verificar se é uma correção (remoção de código com bug)
        if (fixPatterns.some(pattern => pattern.test(line))) {
          changeTypes.add(ChangeType.FIX);
        }
        
        // Verificar se é uma refatoração baseada em linhas removidas
        if (refactorPatterns.some(pattern => pattern.test(line))) {
          changeTypes.add(ChangeType.REFACTOR);
        }
      }
    }
    
    // Detectar mudanças em imports/exports (refatoração)
    const importExportChanges = lines.filter(
      line => (line.startsWith('+') || line.startsWith('-')) && 
      (line.includes('import ') || line.includes('export '))
    ).length;
    
    if (importExportChanges > 0 && importExportChanges < 5) {
      changeTypes.add(ChangeType.REFACTOR);
    }
    
    // Se tiver muitos imports novos, provavelmente é uma feature
    if (importExportChanges >= 5) {
      changeTypes.add(ChangeType.FEAT);
    }
    
    // Se não identificou nenhum tipo específico, assume que é uma refatoração
    if (changeTypes.size === 0) {
      // Arquivo foi modificado, mas não conseguimos detectar o tipo específico
      changeTypes.add(ChangeType.REFACTOR);
    }
    
    return Array.from(changeTypes);
  }

  /**
   * Determina o tipo primário de alteração com base na prioridade
   * @param changeTypes Tipos de alteração encontrados
   * @returns O tipo de alteração com maior prioridade
   */
  private determinePrimaryType(changeTypes: ChangeType[]): ChangeType {
    if (changeTypes.length === 0) {
      return ChangeType.CHORE; // Tipo padrão se nenhum tipo for identificado
    }
    
    if (changeTypes.length === 1) {
      return changeTypes[0]; // Se só houver um tipo, esse é o primário
    }
    
    // Ordena os tipos por prioridade e retorna o de maior prioridade (menor número)
    return changeTypes.sort((a, b) => CHANGE_PRIORITY[a] - CHANGE_PRIORITY[b])[0];
  }
}
