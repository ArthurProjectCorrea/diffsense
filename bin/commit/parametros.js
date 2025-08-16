// Definições de parâmetros da linha de comando
import { Command } from 'commander';

export function configurarParametros() {
  const program = new Command();

  program
    .name('diffsense-commit')
    .description('Analisa alterações no código e realiza commits agrupados por tipo')
    .version('1.0.0')
    .option('-b, --base <ref>', 'Referência base para comparação (ex: main, HEAD~1)', 'HEAD^')
    .option('-h, --head <ref>', 'Referência para comparação (ex: HEAD)', 'HEAD')
    .option('--json', 'Saída em formato JSON')
    .option('-d, --dry-run', 'Exibe os comandos de commit sem executá-los')
    .option('--autoCommit', 'Inicializa o modo de commit automático (ainda pede confirmação)');
  
  return program;
}
