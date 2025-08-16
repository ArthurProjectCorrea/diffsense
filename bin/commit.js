#!/usr/bin/env node

// Este é o ponto de entrada principal para o comando de commit
// Importa a função principal do módulo de orquestração
import { runCommitProcess } from './commit/index.js';
import { program } from 'commander';

// Configurar programa CLI com commander
program
  .name('commit')
  .description('Ferramenta para realizar commits semânticos baseados na análise de alterações')
  .option('-b, --base <branch>', 'Branch ou commit base para comparação', 'HEAD~1')
  .option('--head <branch>', 'Branch ou commit alvo para comparação', 'HEAD')
  .option('-a, --autoComplete', 'Executa commits automaticamente sem confirmação')
  .option('-v, --verbose', 'Exibe informações detalhadas durante o processo');

// Analisar argumentos da linha de comando
program.parse(process.argv);

// Obter opções
const options = program.opts();

// Executar processo de commit
runCommitProcess(options)
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro durante o processo de commit:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
