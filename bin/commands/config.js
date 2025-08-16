/**
 * Módulo de configuração CLI
 * Define estrutura de comandos e opções
 */

import { createCLI } from '../cli-template.js';

/**
 * Cria e configura o objeto de comando CLI
 * @param {string} name - Nome do comando
 * @param {string} description - Descrição do comando
 * @param {string} version - Versão do comando
 * @returns {Command} Comando configurado
 */
export function createCommandProgram(name, description, version = '1.0.0') {
  return createCLI(name, description, version);
}

/**
 * Adiciona opções comuns a um comando
 * @param {Command} command - Comando para adicionar opções
 * @returns {Command} Comando com opções adicionadas
 */
export function addCommonOptions(command) {
  return command
    .option('-b, --base <ref>', 'Referência base para comparação', 'HEAD~1')
    .option('--head <ref>', 'Referência para comparação', 'HEAD')
    .option('-v, --verbose', 'Exibe informações detalhadas durante o processo');
}

/**
 * Adiciona opções específicas para o comando commit
 * @param {Command} command - Comando para adicionar opções
 * @returns {Command} Comando com opções adicionadas
 */
export function addCommitOptions(command) {
  return command
    .option('-a, --autoComplete', 'Executa commits automaticamente sem confirmação')
    .option('--analyzer', 'Executa apenas a análise sem realizar commits')
    .option('--json', 'Saída em formato JSON (apenas para modo analyzer)');
}
