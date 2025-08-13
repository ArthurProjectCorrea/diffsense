#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`
${colors.bright}${colors.green}DiffSense v${packageJson.version}${colors.reset} foi instalado com sucesso!

${colors.bright}Comandos disponíveis:${colors.reset}
- ${colors.cyan}diffsense run${colors.reset}: Analisar alterações entre commits/branches
- ${colors.cyan}diffsense analyze-uncommitted${colors.reset}: Analisar arquivos não commitados
- ${colors.cyan}diffsense commit-by-type${colors.reset}: Agrupar e commitar por tipo semântico
- ${colors.cyan}diffsense commit${colors.reset}: Interface melhorada para commit por tipo

${colors.dim}Documentação completa em: https://github.com/ArthurProjectCorrea/diffsense#readme${colors.reset}
`);
