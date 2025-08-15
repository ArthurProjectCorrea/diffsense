#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeChanges } from '../dist/index.js';
import { ResultFormatter } from '../dist/utils/formatter.js';

const program = new Command();

program
  .name('diffsense-analyzer')
  .description('Analisa alterações no código e classifica-as por tipo')
  .version('1.0.0')
  .option('-b, --base <ref>', 'Referência base para comparação (ex: main, HEAD~1)', 'HEAD^')
  .option('-h, --head <ref>', 'Referência para comparação (ex: HEAD)', 'HEAD')
  .option('--json', 'Saída em formato JSON')
  .action(async (options) => {
    try {
      console.log('🔍 Analisando alterações...');
      console.log('⚠️  Nota: Todos os arquivos serão adicionados ao stage (git add .) para garantir análise completa.');
      
      const result = await analyzeChanges(options.base, options.head);
      
      if (options.json) {
        // Saída em formato JSON
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Saída formatada para o console
        const formatter = new ResultFormatter();
        const output = formatter.format(result);
        console.log(output);
      }
    } catch (error) {
      console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
