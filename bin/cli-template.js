#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import gradient from 'gradient-string';

/**
 * CLI Template para manter consistência entre os comandos DiffSense
 * Use este arquivo como base para criar novos scripts CLI
 */

/**
 * Configura e retorna um banner colorido para o CLI
 * @param {string} title - O título principal a ser exibido no banner
 * @param {string} subtitle - Subtítulo opcional para o banner
 * @param {boolean} showHeader - Se deve exibir o logo ASCII
 * @returns {void}
 */
export function showBanner(title, subtitle = '', showHeader = true) {
  console.clear();
  
  if (showHeader) {
    const header = gradient.rainbow.multiline(`
   ██████╗ ██╗███████╗███████╗███████╗███████╗███╗   ██╗███████╗███████╗
   ██╔══██╗██║██╔════╝██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
   ██║  ██║██║█████╗  █████╗  ███████╗█████╗  ██╔██╗ ██║███████╗█████╗  
   ██║  ██║██║██╔══╝  ██╔══╝  ╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝  
   ██████╔╝██║██║     ██║     ███████║███████╗██║ ╚████║███████║███████╗
   ╚═════╝ ╚═╝╚═╝     ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
   `);
    console.log(header);
  }
  
  console.log(chalk.bold.cyan(`\n${title.toUpperCase()}`));
  
  if (subtitle) {
    console.log(chalk.blue(subtitle));
  }
  
  console.log('\n');
}

/**
 * Cria um comando CLI base com configurações padrão
 * @param {string} name - Nome do comando
 * @param {string} description - Descrição do comando
 * @param {string} version - Versão do comando
 * @returns {Command} Instância de Command configurada
 */
export function createCLI(name, description, version = '1.0.0') {
  const program = new Command();
  
  program
    .name(name)
    .description(description)
    .version(version)
    .addHelpText('before', () => {
      return chalk.bold.cyan(`DiffSense - ${name}`);
    })
    .addHelpText('after', () => {
      return chalk.gray('\nSaiba mais em: https://github.com/ArthurProjectCorrea/diffsense');
    });
    
  return program;
}

/**
 * Manipulador de erro padrão para comandos CLI
 * @param {Error} error - O erro ocorrido
 * @param {boolean} verbose - Se deve exibir o stack trace
 */
export function handleError(error, verbose = false) {
  console.error(chalk.red('\n❌ Erro:'), chalk.red(error instanceof Error ? error.message : String(error)));
  
  if (verbose && error instanceof Error && error.stack) {
    console.error(chalk.gray('\nStack trace:'));
    console.error(chalk.gray(error.stack));
  }
  
  process.exit(1);
}
