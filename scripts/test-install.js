#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Cores para saída no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Executa um comando shell e retorna sua saída
 * @param {string} command - Comando a ser executado
 * @param {string} cwd - Diretório onde executar o comando
 * @param {boolean} silent - Se deve suprimir a saída
 * @returns {string} - Saída do comando
 */
function exec(command, cwd = process.cwd(), silent = false) {
  if (!silent) {
    console.log(`${colors.yellow}Executando:${colors.reset} ${command}`);
  }
  
  try {
    return execSync(command, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
  } catch (error) {
    console.error(`${colors.red}Erro ao executar comando:${colors.reset} ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}=== Testando Instalação do DiffSense ====${colors.reset}\n`);
  
  // Cria diretório temporário para teste
  const tempDir = await mkdtemp(join(tmpdir(), 'diffsense-test-'));
  console.log(`${colors.yellow}Diretório de teste:${colors.reset} ${tempDir}\n`);
  
  try {
    // Empacota o projeto atual
    console.log(`${colors.cyan}Empacotando projeto atual...${colors.reset}`);
    exec('npm pack', projectRoot);
    
    // Move o pacote para o diretório temporário
    const packageJson = JSON.parse(exec('cat package.json', projectRoot, true));
    const packageFilename = `${packageJson.name}-${packageJson.version}.tgz`;
    exec(`mv ${packageFilename} ${tempDir}`, projectRoot);
    
    // Inicializa um projeto de teste no diretório temporário
    console.log(`\n${colors.cyan}Inicializando projeto de teste...${colors.reset}`);
    exec('npm init -y', tempDir);
    
    // Instala o pacote localmente
    console.log(`\n${colors.cyan}Instalando pacote local...${colors.reset}`);
    exec(`npm install --save-dev ./${packageFilename}`, tempDir);
    
    // Testa o binário
    console.log(`\n${colors.cyan}Testando o binário diffsense...${colors.reset}`);
    try {
      exec('npx diffsense --version', tempDir);
    } catch (error) {
      console.error(`${colors.red}Falha ao executar o binário diffsense.${colors.reset}`);
      throw error;
    }
    
    console.log(`\n${colors.green}${colors.bright}✓ Teste concluído com sucesso!${colors.reset}`);
    console.log(`${colors.green}O pacote foi instalado e o binário funciona corretamente.${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ Teste de instalação falhou:${colors.reset}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Limpa o diretório temporário
    console.log(`${colors.yellow}Removendo diretório de teste...${colors.reset}`);
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch(console.error);
