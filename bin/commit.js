#!/usr/bin/env node

/**
 * DiffSense - Commit CLI
 * 
 * Ponto de entrada para o comando de commit com funcionalidade integrada de análise
 * Este arquivo funciona apenas como um orquestrador que carrega os módulos de comando
 */

import { createCommandProgram, addCommonOptions, addCommitOptions } from './commands/config.js';
import { executeCommand } from './commands/main.js';

// Criar o programa principal
const program = createCommandProgram(
  'diffsense-commit',
  'Ferramenta para análise de código e commits semânticos automatizados'
);

// Configurar opções e ação
addCommonOptions(program);
addCommitOptions(program);

program.action(executeCommand);

// Processar os argumentos da linha de comando
program.parse(process.argv);
