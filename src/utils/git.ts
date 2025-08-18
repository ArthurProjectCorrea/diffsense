import { simpleGit } from 'simple-git';
import { FileStatus } from '../types/index.js';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Utilitário para operações relacionadas ao Git
 */
export class GitUtils {
  private git = simpleGit();

  /**
   * Adiciona todos os arquivos modificados ao stage do Git
   * Isso garante que todos os arquivos sejam considerados na análise
   */
  async stageAllFiles(): Promise<void> {
    try {
      await execAsync('git add .');
      return;
    } catch (error) {
      console.error(chalk.red('Erro ao adicionar arquivos ao stage:'), error);
    }
  }

  /**
   * Obtém o diff entre duas referências (branches ou commits)
   * @param base Referência base (ex: 'main')
   * @param head Referência de comparação (ex: 'HEAD')
   * @returns Promise com os arquivos alterados e seus diffs
   */
  async getDiff(base: string, head: string): Promise<Map<string, { diff: string, status: FileStatus, additions: number, deletions: number }>> {
    const spinner = ora('Obtendo alterações do Git...').start();
    
    try {
      const filesMap = new Map<string, { diff: string, status: FileStatus, additions: number, deletions: number }>();
      
      // Obter status do git para identificar todos os arquivos modificados
      const status = await this.git.status();
      
      // Preparar lista de arquivos modificados para análise
      const changedFiles = [
        ...status.not_added.map(f => ({ path: f, status: FileStatus.ADDED })),
        ...status.created.map(f => ({ path: f, status: FileStatus.ADDED })),
        ...status.deleted.map(f => ({ path: f, status: FileStatus.DELETED })),
        ...status.modified.map(f => ({ path: f, status: FileStatus.MODIFIED })),
        ...status.renamed.map(f => ({ path: f.to, status: FileStatus.RENAMED, oldPath: f.from }))
      ];
      
      // Remover duplicatas baseado no path
      const uniqueFiles = changedFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.path === file.path)
      );
      
      if (uniqueFiles.length === 0) {
        spinner.succeed('Nenhuma alteração encontrada');
        return filesMap;
      }
      
      spinner.text = `Encontrados ${uniqueFiles.length} arquivos modificados`;
      
      // Processar cada arquivo
      let current = 0;
      for (const file of uniqueFiles) {
        current++;
        spinner.text = `Analisando alterações (${current}/${uniqueFiles.length}): ${file.path}`;
        
        try {
          // Para arquivos deletados, o diff pode falhar, então tratamos isso
          let fileDiff = '';
          let additions = 0;
          let deletions = 0;
          
          if (file.status !== FileStatus.DELETED) {
            try {
              // Tentar obter o diff do arquivo
              fileDiff = await this.git.diff([base, head, '--', file.path]);
              
              // Contar adições e deleções manualmente do diff
              const addLines = (fileDiff.match(/^\+(?![+@-])/gm) || []).length;
              const delLines = (fileDiff.match(/^-(?![+@-])/gm) || []).length;
              
              additions = addLines;
              deletions = delLines;
            } catch (diffError) {
              // Se falhar, isso pode ser um arquivo binário ou novo
              spinner.text = `Não foi possível obter diff para: ${file.path} (possível arquivo binário)`;
              fileDiff = ''; // Arquivo pode ser binário
              
              // Para arquivos novos, consideramos tudo como adição
              if (file.status === FileStatus.ADDED) {
                additions = 1;
                deletions = 0;
              }
            }
          } else {
            // Para arquivos deletados, contamos como uma deleção
            deletions = 1;
          }
          
          // Adicionar ao mapa de arquivos
          filesMap.set(file.path, {
            diff: fileDiff,
            status: file.status,
            additions,
            deletions
          });
        } catch (fileError) {
          spinner.warn(`Erro ao analisar ${file.path}: ${fileError}`);
        }
      }
      
  // Conclui carregamento sem mensagem de sucesso para evitar poluição no modo analyzer
  spinner.stop();
      return filesMap;
    } catch (error) {
      spinner.fail(`Erro ao obter diferenças: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Verifica se o repositório atual é um repositório Git
   * @returns Promise<boolean> True se for um repositório Git
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.revparse(['--is-inside-work-tree']);
      return true;
    } catch (error) {
      return false;
    }
  }
}
