import { GitUtils } from '../utils/git.js';
import { DiffAnalyzer } from './diff-analyzer.js';
import { AnalysisResult, CHANGE_PRIORITY, ChangeType, FileChange } from '../types/index.js';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Principal classe para análise de alterações
 */
export class ChangeAnalyzer {
  private gitUtils = new GitUtils();
  private diffAnalyzer = new DiffAnalyzer();

  /**
   * Analisa as alterações entre duas referências Git
   * @param base Referência base (ex: 'main')
   * @param head Referência de comparação (ex: 'HEAD')
   * @returns Promise com o resultado da análise
   */
  async analyzeChanges(base = 'HEAD^', head = 'HEAD'): Promise<AnalysisResult> {
    const spinner = ora('Iniciando análise de alterações...').start();
    
    try {
      // Verifica se estamos em um repositório Git
      const isGitRepo = await this.gitUtils.isGitRepository();
      if (!isGitRepo) {
        spinner.fail('Não foi possível encontrar um repositório Git válido');
        throw new Error('Não foi possível encontrar um repositório Git válido');
      }
      
      // Adiciona todos os arquivos ao stage para garantir que todos sejam considerados
      spinner.text = 'Preparando arquivos para análise (git add .)...';
      await this.gitUtils.stageAllFiles();
      
      spinner.text = 'Obtendo alterações do Git...';
      
      // Obtém os diffs entre as referências
      const diffs = await this.gitUtils.getDiff(base, head);
      
      spinner.text = 'Analisando semanticamente as alterações...';
      
      // Análise de cada arquivo modificado
      const analyzedFiles: FileChange[] = [];
      
      // Processa cada arquivo alterado
      for (const [filePath, fileInfo] of diffs.entries()) {
        const { diff, status, additions, deletions } = fileInfo;
        const fileChange = this.diffAnalyzer.analyzeFile(filePath, diff, status, additions, deletions);
        analyzedFiles.push(fileChange);
      }
      
      // Gera o resumo das alterações
      const summary = this.generateSummary(analyzedFiles);
      
      // Determina o tipo primário para todo o conjunto de alterações
      const primaryType = this.determinePrimaryTypeForChangeset(analyzedFiles);
      
      spinner.succeed(chalk.green(`Análise concluída: ${analyzedFiles.length} arquivos analisados`));
      
      // Verifica se existem breaking changes
      const breakingChanges = analyzedFiles.filter(file => file.isBreakingChange);
      const hasBreakingChanges = breakingChanges.length > 0;
      
      return {
        files: analyzedFiles,
        summary,
        primaryType,
        baseBranch: base,
        headBranch: head,
        hasBreakingChanges,
        breakingChanges,
      };
    } catch (error) {
      spinner.fail(`Erro durante a análise: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Gera um resumo das alterações por tipo
   * @param files Arquivos analisados
   * @returns Objeto com o resumo
   */
  private generateSummary(files: FileChange[]): { [key in ChangeType]?: number } {
    const summary: { [key in ChangeType]?: number } = {};
    
    // Conta os arquivos por tipo primário
    for (const file of files) {
      if (file.primaryType) {
        summary[file.primaryType] = (summary[file.primaryType] || 0) + 1;
      }
    }
    
    return summary;
  }

  /**
   * Determina o tipo primário para todo o conjunto de alterações
   * @param files Arquivos analisados
   * @returns O tipo primário para o conjunto
   */
  private determinePrimaryTypeForChangeset(files: FileChange[]): ChangeType {
    // Se não houver arquivos, o padrão é CHORE
    if (files.length === 0) {
      return ChangeType.CHORE;
    }
    
    // Coleta todos os tipos primários
    const primaryTypes = files
      .map(file => file.primaryType)
      .filter((type): type is ChangeType => !!type);
    
    // Se não houver tipos primários, o padrão é CHORE
    if (primaryTypes.length === 0) {
      return ChangeType.CHORE;
    }
    
    // Conta a ocorrência de cada tipo primário
    const typeCounts = primaryTypes.reduce<Record<string, number>>((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    // Encontra o tipo mais comum
    let mostCommonType = ChangeType.CHORE;
    let highestCount = 0;
    
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > highestCount) {
        mostCommonType = type as ChangeType;
        highestCount = count;
      } else if (count === highestCount) {
        // Em caso de empate, usa a prioridade para desempatar
        const currentType = type as ChangeType;
        
        // Se a prioridade atual for maior (número menor), use-a
        if (currentType && mostCommonType && 
            CHANGE_PRIORITY[currentType] < CHANGE_PRIORITY[mostCommonType]) {
          mostCommonType = currentType;
        }
      }
    }
    
    return mostCommonType;
  }
}
