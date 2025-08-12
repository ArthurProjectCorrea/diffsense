import simpleGit, { SimpleGit } from 'simple-git';
import { Change, ChangeMetadata, ChangeType } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Responsável por detectar mudanças entre diferentes versões do código
 */
export class ChangeDetector {
  private git: SimpleGit;
  private workingDir: string;

  constructor(workingDir?: string) {
    this.workingDir = workingDir || process.cwd();
    this.git = simpleGit({
      baseDir: this.workingDir,
      binary: 'git',
      maxConcurrentProcesses: 6
    });
  }

  /**
   * Detecta mudanças entre duas referências Git
   * Se headRef for string vazia, analisa mudanças não commitadas no diretório de trabalho
   * incluindo arquivos não rastreados (untracked)
   */
  async detectChanges(baseRef: string, headRef: string): Promise<Change[]> {
    // Se headRef for vazio, estamos analisando o diretório de trabalho
    const isWorkingDir = !headRef || headRef === '';
    
    if (isWorkingDir) {
      console.log(`Detectando mudanças no diretório de trabalho (não commitadas)...`);
    } else {
      console.log(`Detectando mudanças entre ${baseRef} e ${headRef}...`);
    }
    
    try {
      let changedFiles: { filePath: string; type: ChangeType; }[] = [];
      
      if (isWorkingDir) {
        // Para mudanças no diretório de trabalho, incluindo arquivos não rastreados
        
        // 1. Primeiro, obtenha as alterações nos arquivos rastreados
        const diffResult = await this.git.diff(['--name-status', baseRef]);
        changedFiles = this.parseNameStatus(diffResult);
        
        // 2. Depois, obtenha os arquivos não rastreados (novos)
        const untrackedResult = await this.git.raw(['ls-files', '--others', '--exclude-standard']);
        const untrackedFiles = untrackedResult.trim();
        
        const untrackedCount = untrackedFiles ? untrackedFiles.split('\n').filter((f: string) => f.trim()).length : 0;
        console.log(`Detectados ${untrackedCount} arquivos não rastreados`);
        
        // Adicione cada arquivo não rastreado como "adicionado"
        if (untrackedFiles) {
          untrackedFiles.split('\n')
            .filter((f: string) => f.trim())
            .forEach((filePath: string) => {
              changedFiles.push({
                filePath,
                type: ChangeType.ADDED
              });
            });
        }
      } else {
        // Para mudanças entre duas referências, use o diff normal
        const diffResult = await this.git.diff(['--name-status', baseRef, headRef]);
        changedFiles = this.parseNameStatus(diffResult);
      }
      
      // Para cada arquivo, obter mais detalhes
      const changes: Change[] = [];
      
      for (const file of changedFiles) {
        try {
          // Obter o conteúdo do arquivo nas duas versões
          let oldContent: string | undefined;
          let newContent: string | undefined;
          
          // Se o arquivo foi adicionado, não há conteúdo antigo
          if (file.type !== ChangeType.ADDED) {
            oldContent = await this.getFileContentFromGit(file.filePath, baseRef);
          }
          
          // Se o arquivo foi excluído, não há conteúdo novo
          if (file.type !== ChangeType.DELETED) {
            if (!headRef || headRef === '') {
              // Se estamos analisando o diretório de trabalho, lemos o arquivo diretamente do disco
              try {
                newContent = await fs.readFile(path.join(this.workingDir, file.filePath), 'utf-8');
              } catch (err) {
                console.error(`Não foi possível ler o arquivo ${file.filePath} do disco:`, err);
              }
            } else {
              newContent = await this.getFileContentFromGit(file.filePath, headRef);
            }
          }
          
          // Obter metadados detalhados do arquivo
          const metadata = await this.getFileMetadata(file.filePath, oldContent, newContent);
          
          changes.push({
            filePath: file.filePath,
            type: file.type,
            oldContent,
            newContent,
            metadata
          });
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file.filePath}:`, error);
        }
      }
      
      return changes;
    } catch (error) {
      console.error('Erro ao detectar mudanças:', error);
      return [];
    }
  }
  
  /**
   * Obtém o conteúdo de um arquivo específico de uma referência Git
   */
  private async getFileContentFromGit(filePath: string, ref: string): Promise<string | undefined> {
    try {
      const result = await this.git.show([`${ref}:${filePath}`]);
      return result;
    } catch (error) {
      console.error(`Erro ao obter conteúdo de ${filePath} no commit ${ref}:`, error);
      return undefined;
    }
  }
  
  /**
   * Parseia a saída de git diff --name-status
   */
  private parseNameStatus(output: string): Array<{ filePath: string; type: ChangeType }> {
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => {
      const status = line[0];
      let filePath = line.substring(1).trim();
      
      // Remove aspas que podem estar em volta do nome do arquivo
      if (filePath.startsWith('"') && filePath.endsWith('"')) {
        filePath = filePath.substring(1, filePath.length - 1);
      }
      
      let type: ChangeType;
      
      switch (status) {
        case 'A':
          type = ChangeType.ADDED;
          break;
        case 'M':
          type = ChangeType.MODIFIED;
          break;
        case 'D':
          type = ChangeType.DELETED;
          break;
        case 'R':
          type = ChangeType.RENAMED;
          break;
        default:
          type = ChangeType.MODIFIED;
      }
      
      return { filePath, type };
    });
  }
  
  /**
   * Obtém metadados detalhados sobre um arquivo
   */
  private async getFileMetadata(
    filePath: string, 
    oldContent?: string, 
    newContent?: string
  ): Promise<ChangeMetadata> {
    // Calcular linhas adicionadas e removidas
    let linesAdded = 0;
    let linesRemoved = 0;
    
    if (oldContent && newContent) {
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      linesAdded = newLines.length - oldLines.length;
      linesRemoved = 0;
      
      if (linesAdded < 0) {
        linesRemoved = Math.abs(linesAdded);
        linesAdded = 0;
      }
    } else if (oldContent && !newContent) {
      // Arquivo deletado
      linesRemoved = oldContent.split('\n').length;
    } else if (!oldContent && newContent) {
      // Arquivo adicionado
      linesAdded = newContent.split('\n').length;
    }
    
    // Determinar o tipo de arquivo baseado na extensão
    const fileExt = path.extname(filePath).toLowerCase();
    let fileType = 'unknown';
    
    // Identificar o tipo de arquivo
    if (['.js', '.ts', '.jsx', '.tsx'].includes(fileExt)) {
      fileType = 'script';
    } else if (['.html', '.vue', '.svelte'].includes(fileExt)) {
      fileType = 'markup';
    } else if (['.css', '.scss', '.less', '.sass'].includes(fileExt)) {
      fileType = 'style';
    } else if (['.json', '.yaml', '.yml', '.xml', '.toml'].includes(fileExt)) {
      fileType = 'config';
    } else if (['.md', '.txt', '.rst'].includes(fileExt)) {
      fileType = 'doc';
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(fileExt)) {
      fileType = 'image';
    } else if (['.test.js', '.spec.ts', '.test.ts', '.spec.js'].some(ext => filePath.includes(ext))) {
      fileType = 'test';
    }
    
    // Verificar se é um arquivo binário
    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.exe'].includes(fileExt);
    
    return {
      linesAdded,
      linesRemoved,
      fileType,
      isBinary,
      extraData: {
        extension: fileExt,
        filename: path.basename(filePath),
        directory: path.dirname(filePath)
      }
    };
  }
}
