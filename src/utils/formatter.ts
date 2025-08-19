/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { AnalysisResult, ChangeType, FileStatus } from '../types/index.js';
import { getChangeTypeDescription } from '../index.js';

/**
 * Formatador para exibir os resultados da análise no console
 */
export class ResultFormatter {
  /**
   * Formata e exibe os resultados no console
   * @param result Resultado da análise
   */
  format(result: AnalysisResult): string {
  const { files, summary, baseBranch, headBranch, hasBreakingChanges, breakingChanges } = result;
        let output = '';
        
        // Banner principal
        output += boxen(
          chalk.cyan.bold('DiffSense: Análise de Alterações'),
          { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
        ) + '\n';
        
  // Tabela de referências
  const refsTable = new Table({
          head: [chalk.bold('Referência'), chalk.bold('Branch')],
          style: { head: [], border: [] },
  });
  refsTable.push(
          ['Base', chalk.yellow(baseBranch || 'HEAD^')],
          ['Head', chalk.yellow(headBranch || 'HEAD')]
        );
        output += refsTable.toString() + '\n\n';
    
    // Resumo
    output += chalk.bold('Resumo:\n');
    if (Object.keys(summary).length > 0) {
  const summaryTable = new Table({
        head: [
          chalk.cyan('Tipo'), 
          chalk.cyan('Descrição'),
          chalk.cyan('Quantidade')
        ],
        style: { head: [], border: [] },
      });
      
      // Ordenar por prioridade
      const orderedTypes = Object.entries(summary)
        .sort(([typeA], [typeB]) => {
          const a = typeA as ChangeType;
          const b = typeB as ChangeType;
          return (a && b) ? 1 : 0;  // Simplesmente os exibimos na ordem em que aparecem
        });
      
      for (const [type, count] of orderedTypes) {
        const changeType = type as ChangeType;
        summaryTable.push([
          this.formatChangeType(changeType), 
          getChangeTypeDescription(changeType),
          count.toString()
        ]);
      }
      
  output += (summaryTable as any).toString() + '\n\n';
    } else {
      output += 'Nenhuma alteração encontrada.\n\n';
    }
    
    // [Removido] Linha de Tipo Primário, pois já listado na tabela
    // Destacar se há breaking changes
    if (hasBreakingChanges) {
      output += chalk.bold.red('⚠️ CONTÉM BREAKING CHANGES!') + '\n\n';
    }
    
    // Detalhes dos arquivos
    output += chalk.bold('Detalhes dos Arquivos:\n');
    if (files && files.length > 0) {
  const filesTable = new Table({
        head: [
          chalk.cyan('Arquivo'),
          chalk.cyan('Status'),
          chalk.cyan('+/-'),
          chalk.cyan('Tipo'),
          chalk.cyan('Todos'),
          chalk.cyan('Breaking')
        ],
        style: { head: [], border: [] },
        wordWrap: true,
        wrapOnWordBoundary: true,
        colWidths: [35, 8, 8, 8, 18, 13],
      });
      
  for (const file of files) {
        // Ajustando o tamanho do nome do arquivo para caber melhor na coluna
        let filePath = file.filePath;
        if (filePath.length > 38) {
          const parts = filePath.split('/');
          if (parts.length > 2) {
            filePath = '...' + filePath.slice(-37);
          }
        }

  filesTable.push([
          filePath,
          file.status ? this.formatFileStatus(file.status) : '?',
          `+${file.additions || 0}/-${file.deletions || 0}`,
          file.primaryType ? this.formatChangeType(file.primaryType) : 'N/A',
          file.changeTypes.map(type => this.formatChangeType(type)).join(', '),
          file.isBreakingChange ? chalk.bold.red('⚠️ ' + (file.breakingChangeReason || 'Sim')) : ''
        ]);
      }
      
  output += (filesTable as any).toString() + '\n';
    } else {
      output += 'Nenhum arquivo modificado.\n';
    }
    
    // Seção especial para breaking changes
    if (hasBreakingChanges && breakingChanges && breakingChanges.length > 0) {
      output += '\n' + chalk.bold.red('⚠️ Breaking Changes Detectados:\n');
  const breakingTable = new Table({
        head: [
          chalk.red('Arquivo'),
          chalk.red('Razão')
        ],
        style: { head: [], border: [] },
        wordWrap: true,
        wrapOnWordBoundary: true,
        colWidths: [40, 50],
      });
      
  for (const file of breakingChanges) {
  breakingTable.push([
          file.filePath,
          file.breakingChangeReason || 'Alteração incompatível detectada'
        ]);
      }
      
  output += (breakingTable as any).toString() + '\n';
      
      output += chalk.yellow('\nObservação: Breaking changes precisam ser indicados no commit com "!" após o tipo.\n');
      output += chalk.yellow('Exemplo: feat!: nova API incompatível com versão anterior\n');
    }
    
    return output;
  }
  
  /**
   * Formata o tipo de alteração com cores
   * @param type Tipo de alteração
   * @returns Texto formatado
   */
  private formatChangeType(type: ChangeType): string {
    switch (type) {
      case ChangeType.FEAT:
        return chalk.green(type);
      case ChangeType.FIX:
        return chalk.red(type);
      case ChangeType.DOCS:
        return chalk.blue(type);
      case ChangeType.REFACTOR:
        return chalk.yellow(type);
      case ChangeType.TEST:
        return chalk.magenta(type);
      case ChangeType.CHORE:
        return chalk.gray(type);
      default:
        return type;
    }
  }

  /**
   * Formata o status do arquivo com cores
   * @param status Status do arquivo
   * @returns Texto formatado
   */
  private formatFileStatus(status: FileStatus): string {
    switch (status) {
      case FileStatus.ADDED:
        return chalk.green('Add');
      case FileStatus.DELETED:
        return chalk.red('Del');
      case FileStatus.MODIFIED:
        return chalk.yellow('Mod');
      case FileStatus.RENAMED:
        return chalk.blue('Ren');
      case FileStatus.UNMODIFIED:
        return chalk.gray('N/A');
      default:
        return status;
    }
  }
}
