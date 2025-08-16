import { analyzeChangesAndFiles, groupFilesByType } from './analyzer.js';
import { displayChangeSummary, confirmCommits } from './ui.js';
import { executeCommits, displayCommitSummary } from './committer.js';
import chalk from 'chalk';

// Função principal que orquestra todo o processo
export const runCommitProcess = async (options) => {
  // Analisar alterações e obter resultados
  const result = await analyzeChangesAndFiles(options);
  
  // Agrupar arquivos por tipo
  const filesByType = groupFilesByType(result);
  
  // Exibir resumo das alterações
  const hasChanges = displayChangeSummary(filesByType);
  
  // Se não há alterações, encerra o processo
  if (!hasChanges) {
    return;
  }
  
  // Se é modo dry-run, mostrar mensagem
  if (options.dryRun) {
    console.log(chalk.cyan('\n🔍 Modo dry-run: os comandos serão exibidos, mas não executados.'));
  } else if (options.autoComplete) {
    // Pular confirmação em modo autoComplete
    console.log(chalk.blue('\n🔄 Modo auto-complete: executando commits automaticamente sem confirmação...'));
  } else {
    // Solicitar confirmação para prosseguir
    const confirmed = await confirmCommits();
    if (!confirmed) {
      return;
    }
  }
  
  // Executar commits agrupados por tipo
  const commitResults = await executeCommits(filesByType, options);
  
  // Mostrar resumo final dos commits
  displayCommitSummary(commitResults, filesByType, options);
};
