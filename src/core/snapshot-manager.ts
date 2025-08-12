import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Interface para um Snapshot do código
 */
export interface Snapshot {
  id: string;
  gitRef: string;
  timestamp: number;
  files: SnapshotFile[];
}

/**
 * Interface para um arquivo em um snapshot
 */
export interface SnapshotFile {
  path: string;
  hash: string;
  content?: string;
  size: number;
}

/**
 * Responsável por gerenciar snapshots do código
 * Cria e gerencia snapshots temporários do código para análise
 */
export class SnapshotManager {
  private git: SimpleGit;
  private workingDir: string;
  private snapshotDir: string;
  
  constructor(workingDir?: string) {
    this.workingDir = workingDir || process.cwd();
    this.git = simpleGit({
      baseDir: this.workingDir,
      binary: 'git',
      maxConcurrentProcesses: 6
    });
    
    // Diretório temporário para snapshots
    this.snapshotDir = path.join(os.tmpdir(), 'diffsense-snapshots');
  }
  
  /**
   * Cria um snapshot do estado do repositório em uma determinada referência Git
   */
  async createSnapshot(ref: string): Promise<Snapshot> {
    console.log(`Criando snapshot para ${ref}...`);
    
    // Gerar um ID único para o snapshot
    const snapshotId = crypto.randomUUID();
    
    try {
      // Criar diretório de snapshot se não existir
      const snapshotPath = path.join(this.snapshotDir, snapshotId);
      await fs.mkdir(snapshotPath, { recursive: true });
      
      // Listar todos os arquivos na referência
      const files = await this.listFilesInRef(ref);
      
      // Para cada arquivo, obter o conteúdo e salvar no snapshot
      const snapshotFiles: SnapshotFile[] = [];
      
      for (const filePath of files) {
        try {
          // Obter conteúdo do arquivo
          const content = await this.git.show([`${ref}:${filePath}`]);
          
          // Calcular hash do conteúdo
          const hash = this.calculateHash(content);
          
          // Salvar arquivo no diretório de snapshot
          const targetPath = path.join(snapshotPath, filePath);
          
          // Garantir que o diretório do arquivo exista
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          
          // Escrever conteúdo no arquivo
          await fs.writeFile(targetPath, content);
          
          snapshotFiles.push({
            path: filePath,
            hash,
            size: Buffer.byteLength(content),
          });
        } catch (error) {
          console.error(`Erro ao processar arquivo ${filePath}:`, error);
        }
      }
      
      const snapshot: Snapshot = {
        id: snapshotId,
        gitRef: ref,
        timestamp: Date.now(),
        files: snapshotFiles
      };
      
      // Salvar metadados do snapshot
      await fs.writeFile(
        path.join(snapshotPath, 'metadata.json'),
        JSON.stringify(snapshot, null, 2)
      );
      
      return snapshot;
    } catch (error: any) {
      console.error(`Erro ao criar snapshot para ${ref}:`, error);
      throw new Error(`Falha ao criar snapshot: ${error?.message || 'Erro desconhecido'}`);
    }
  }
  
  /**
   * Lista todos os arquivos em uma referência Git
   */
  private async listFilesInRef(ref: string): Promise<string[]> {
    try {
      const result = await this.git.raw(['ls-tree', '-r', '--name-only', ref]);
      return result.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      console.error(`Erro ao listar arquivos para ${ref}:`, error);
      return [];
    }
  }
  
  /**
   * Calcula o hash SHA-256 de um conteúdo
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Carrega um snapshot existente pelo ID
   */
  async loadSnapshot(snapshotId: string): Promise<Snapshot | null> {
    const snapshotPath = path.join(this.snapshotDir, snapshotId);
    
    try {
      const metadataPath = path.join(snapshotPath, 'metadata.json');
      const metadata = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(metadata) as Snapshot;
    } catch (error) {
      console.error(`Erro ao carregar snapshot ${snapshotId}:`, error);
      return null;
    }
  }
  
  /**
   * Retorna o caminho para um arquivo específico em um snapshot
   */
  getSnapshotFilePath(snapshotId: string, filePath: string): string {
    return path.join(this.snapshotDir, snapshotId, filePath);
  }
  
  /**
   * Remove um snapshot
   */
  async removeSnapshot(snapshotId: string): Promise<void> {
    const snapshotPath = path.join(this.snapshotDir, snapshotId);
    
    try {
      await fs.rm(snapshotPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Erro ao remover snapshot ${snapshotId}:`, error);
    }
  }
}
