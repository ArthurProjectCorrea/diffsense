import { ScoredChange, CommitType } from '../types/index.js';
import * as path from 'path';

/**
 * Interface para formatar os resultados da análise
 */
export interface FormatterOptions {
  format: 'markdown' | 'json' | 'cli';
  detailed?: boolean;
  includeSuggestion?: boolean;
}

/**
 * Gerador de relatórios de análise
 * Gera relatórios em diferentes formatos com base nas mudanças analisadas
 */
export class Reporter {
  /**
   * Gera um relatório com base nas mudanças analisadas
   */
  generateReport(changes: ScoredChange[], options: FormatterOptions | string = { format: 'markdown', detailed: true, includeSuggestion: true }): string {
    console.log(`Gerando relatório de mudanças...`);
    
    // Compatibilidade com versões anteriores que usavam string direta
    if (typeof options === 'string') {
      options = { format: options as 'markdown' | 'json' | 'cli', detailed: true, includeSuggestion: true };
    }
    
    switch (options.format) {
      case 'json':
        return this.generateJsonReport(changes);
      case 'cli':
        return this.generateCliReport(changes, options.detailed);
      case 'markdown':
      default:
        return this.generateMarkdownReport(changes, options.detailed, options.includeSuggestion);
    }
  }
  
  /**
   * Gera um relatório em formato Markdown
   */
  private generateMarkdownReport(changes: ScoredChange[], detailed = true, includeSuggestion = true): string {
    let report = '# Relatório de Análise DiffSense\n\n';
    
    if (changes.length === 0) {
      report += 'Nenhuma mudança detectada.\n';
      return report;
    }
    
    report += `## ${changes.length} mudanças encontradas\n\n`;
    
    // Adicionar resumo da análise
    report += this.generateSummary(changes);
    
    // Ordenar mudanças por pontuação (mais alta primeiro)
    const sortedChanges = [...changes].sort((a, b) => b.score - a.score);
    
    // Adicionar seção de sugestão de commit
    if (includeSuggestion) {
      report += '\n## Sugestão de Commit\n\n';
      const suggestion = this.generateCommitSuggestion(changes);
      report += `\`\`\`\n${suggestion.formatted}\n\`\`\`\n`;
    }
    
    // Adicionar detalhes de cada mudança
    report += '\n## Detalhes das Mudanças\n\n';
    
    sortedChanges.forEach((change, index) => {
      report += `### ${index + 1}. ${path.basename(change.filePath)}\n`;
      report += `- **Arquivo:** ${change.filePath}\n`;
      report += `- **Tipo:** ${change.type}\n`;
      report += `- **Pontuação:** ${change.score.toFixed(2)}\n`;
      
      if (change.commitType) {
        report += `- **Tipo de Commit:** ${change.commitType}${change.breaking ? ' (breaking)' : ''}\n`;
      }
      
      if (change.description) {
        report += `- **Descrição:** ${change.description}\n`;
      }
      
      if (detailed) {
        if (change.semanticChanges.length > 0) {
          report += '\n#### Alterações Semânticas\n';
          change.semanticChanges.forEach(delta => {
            report += `- ${delta.description} (${delta.severity})\n`;
          });
        }
        
        if (change.appliedRules.length > 0) {
          report += '\n#### Regras Aplicadas\n';
          change.appliedRules.forEach(rule => {
            report += `- ${rule}\n`;
          });
        }
        
        if (change.scoreFactors.length > 0) {
          report += '\n#### Fatores de Pontuação\n';
          change.scoreFactors.forEach(factor => {
            report += `- ${factor.name}: ${factor.value} × ${factor.weight} = ${(factor.value * factor.weight).toFixed(2)}\n`;
          });
        }
      }
      
      report += '\n';
    });
    
    return report;
  }
  
  /**
   * Gera um relatório em formato JSON
   */
  private generateJsonReport(changes: ScoredChange[]): string {
    const suggestion = this.generateCommitSuggestion(changes);
    
    const report = {
      summary: {
        totalChanges: changes.length,
        breakdown: this.getTypeBreakdown(changes),
      },
      suggestedCommit: suggestion ? {
        type: suggestion.type,
        scope: suggestion.scope,
        subject: suggestion.subject,
        breaking: suggestion.breaking
      } : undefined,
      changes: changes.map(change => ({
        filePath: change.filePath,
        type: change.type,
        score: change.score,
        commitType: change.commitType,
        commitScope: change.commitScope,
        breaking: change.breaking,
        description: change.description,
        semanticChanges: change.semanticChanges.map(delta => ({
          type: delta.type,
          description: delta.description,
          severity: delta.severity,
          affectedSymbol: delta.affectedSymbol
        }))
      }))
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Gera um relatório para CLI
   */
  private generateCliReport(changes: ScoredChange[], detailed = false): string {
    let report = `=== Relatório de Análise DiffSense ===\n\n`;
    
    if (changes.length === 0) {
      report += 'Nenhuma mudança detectada.\n';
      return report;
    }
    
    // Adicionar resumo da análise
    const breakdown = this.getTypeBreakdown(changes);
    report += `${changes.length} mudanças encontradas\n`;
    
    Object.entries(breakdown).forEach(([type, count]) => {
      report += `- ${type}: ${count}\n`;
    });
    
    // Adicionar sugestão de commit
    const suggestion = this.generateCommitSuggestion(changes);
    report += `\nSugestão de Commit: ${suggestion.formatted}\n`;
    
    // Adicionar top 5 mudanças por pontuação
    const topChanges = [...changes]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    report += `\nTop ${Math.min(5, topChanges.length)} Mudanças:\n`;
    
    topChanges.forEach((change, index) => {
      report += `\n${index + 1}. ${path.basename(change.filePath)} (${change.score.toFixed(2)})\n`;
      report += `   ${change.description || 'Sem descrição'}\n`;
      
      if (detailed && change.semanticChanges.length > 0) {
        report += `   Alterações: ${change.semanticChanges.length}\n`;
        
        if (change.breaking) {
          report += `   ⚠️ BREAKING CHANGE\n`;
        }
      }
    });
    
    return report;
  }
  
  /**
   * Gera um resumo da análise
   */
  private generateSummary(changes: ScoredChange[]): string {
    let summary = '## Resumo\n\n';
    
    // Contagem por tipo de commit
    const breakdown = this.getTypeBreakdown(changes);
    
    summary += '### Tipos de Mudanças\n\n';
    Object.entries(breakdown).forEach(([type, count]) => {
      summary += `- **${type}:** ${count}\n`;
    });
    
    // Breaking changes
    const breakingChanges = changes.filter(change => change.breaking);
    if (breakingChanges.length > 0) {
      summary += `\n### ⚠️ ${breakingChanges.length} Breaking Changes Detectadas\n\n`;
      breakingChanges.forEach(change => {
        summary += `- **${path.basename(change.filePath)}:** ${change.description || 'Sem descrição'}\n`;
      });
    }
    
    return summary;
  }
  
  /**
   * Obtém a distribuição de tipos de mudanças
   */
  private getTypeBreakdown(changes: ScoredChange[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    changes.forEach(change => {
      const type = change.commitType || 'other';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    
    return breakdown;
  }
  
  /**
   * Gera uma sugestão de commit com base nas mudanças
   */
  private generateCommitSuggestion(changes: ScoredChange[]): {
    type: string;
    scope?: string;
    subject: string;
    breaking: boolean;
    formatted: string;
  } {
    // Se não há mudanças, retorna um commit genérico
    if (changes.length === 0) {
      return {
        type: 'chore',
        subject: 'sem mudanças detectadas',
        breaking: false,
        formatted: 'chore: sem mudanças detectadas'
      };
    }
    
    // Identificar o tipo mais significativo com base nas mudanças
    const commitType = this.determineCommitType(changes);
    
    // Identificar o escopo mais relevante
    const scope = this.determineCommitScope(changes);
    
    // Determinar se é um breaking change
    const hasBreakingChange = changes.some(change => change.breaking);
    
    // Gerar assunto do commit
    const subject = this.generateCommitSubject(changes, commitType);
    
    // Formatar mensagem de commit
    let formatted = `${commitType}`;
    
    if (scope) {
      formatted += `(${scope})`;
    }
    
    formatted += `${hasBreakingChange ? '!' : ''}: ${subject}`;
    
    return {
      type: commitType,
      scope,
      subject,
      breaking: hasBreakingChange,
      formatted
    };
  }
  
  /**
   * Determina o tipo de commit com base nas mudanças
   */
  private determineCommitType(changes: ScoredChange[]): CommitType {
    // Prioridade dos tipos de commit
    const typePriority: CommitType[] = ['feat', 'fix', 'refactor', 'docs', 'style', 'test', 'chore', 'perf', 'build', 'ci', 'revert'];
    
    // Contar tipos de commit
    const typeCounts: Record<string, number> = {};
    
    changes.forEach(change => {
      if (change.commitType) {
        typeCounts[change.commitType] = (typeCounts[change.commitType] || 0) + 1;
      }
    });
    
    // Encontrar o tipo com maior prioridade
    for (const type of typePriority) {
      if (typeCounts[type] && typeCounts[type] > 0) {
        return type as CommitType;
      }
    }
    
    // Default
    return 'chore';
  }
  
  /**
   * Determina o escopo do commit com base nas mudanças
   */
  private determineCommitScope(changes: ScoredChange[]): string | undefined {
    // Contar escopos
    const scopeCounts: Record<string, number> = {};
    
    changes.forEach(change => {
      if (change.commitScope) {
        scopeCounts[change.commitScope] = (scopeCounts[change.commitScope] || 0) + 1;
      }
    });
    
    // Encontrar o escopo mais comum
    let maxCount = 0;
    let maxScope: string | undefined = undefined;
    
    Object.entries(scopeCounts).forEach(([scope, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxScope = scope;
      }
    });
    
    // Se muitas mudanças afetam múltiplos escopos, não usar escopo específico
    if (Object.keys(scopeCounts).length > 3 && maxCount < changes.length / 2) {
      return undefined;
    }
    
    return maxScope;
  }
  
  /**
   * Gera o assunto do commit com base nas mudanças
   */
  private generateCommitSubject(changes: ScoredChange[], commitType: CommitType): string {
    // Se houver apenas uma mudança, usar sua descrição
    if (changes.length === 1) {
      return changes[0].description || 'atualizar código';
    }
    
    // Para múltiplas mudanças, gerar um assunto genérico baseado no tipo
    const changedFiles = changes.length;
    
    switch (commitType) {
      case 'feat':
        return changedFiles === 1 
          ? `adiciona nova funcionalidade` 
          : `adiciona ${changedFiles} novas funcionalidades`;
      case 'fix':
        return changedFiles === 1 
          ? `corrige bug` 
          : `corrige ${changedFiles} bugs`;
      case 'refactor':
        return changedFiles === 1 
          ? `refatora código` 
          : `refatora ${changedFiles} arquivos`;
      case 'docs':
        return `atualiza documentação`;
      case 'test':
        return `adiciona/atualiza testes`;
      case 'style':
        return `melhora estilo do código`;
      case 'perf':
        return `melhora performance`;
      default:
        return `atualiza ${changedFiles} arquivos`;
    }
  }
}
