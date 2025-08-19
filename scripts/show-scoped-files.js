#!/usr/bin/env node
import { findPackageScopes } from '../src/utils/scope-finder.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { classifyFilesByScope } from '../src/utils/scope-classifier.js';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import ora from 'ora';

(async () => {
  try {
    const rootDir = process.cwd();
    // Encontra escopos e normaliza caminho para barras '/'
    const rawScopes = await findPackageScopes(rootDir);
    // Normalizar escopos: nome e diretório relativo para barras '/'
    const scopes = rawScopes.map(s => ({
      name: s.name,
      dir: s.dir.split(path.sep).join('/')
    }));

    // Capturar arquivos de alterações:
    // diff entre commits (main..HEAD)
    const pathsSet = new Set();
    try {
      const commits = execSync('git diff --name-only main HEAD', { encoding: 'utf-8' });
      commits.split('\n').filter(Boolean).forEach(p => pathsSet.add(p));
    } catch {}
    // arquivos staged
    try {
      const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
      staged.split('\n').filter(Boolean).forEach(p => pathsSet.add(p));
    } catch {}
    // arquivos unstaged
    try {
      const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' });
      unstaged.split('\n').filter(Boolean).forEach(p => pathsSet.add(p));
    } catch {}
    // arquivos untracked
    try {
      const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8' });
      untracked.split('\n').filter(Boolean).forEach(p => pathsSet.add(p));
    } catch {}
    // Normalizar caminhos e filtrar somente arquivos existentes
    let filePaths = Array.from(pathsSet)
      .map(p => p.split(path.sep).join('/'))
      .filter(p => {
        try {
          return fs.lstatSync(path.resolve(rootDir, p)).isFile();
        } catch {
          return false;
        }
      });
    // Remover package.json dos escopos (não classificamos o próprio arquivo de escopo)
    filePaths = filePaths.filter(p => {
      return !scopes.some(s => {
        const pkgPath = s.dir ? `${s.dir}/package.json` : 'package.json';
        return p === pkgPath;
      });
    });
    if (filePaths.length === 0) {
      console.log(chalk.yellow('Nenhuma modificação detectada.')); process.exit(0);
    }
    // Carregar escopos e arquivos modificados
    const spinner = ora('Analisando escopos e arquivos modificados...').start();
    const grouped = classifyFilesByScope(filePaths, scopes);
    spinner.succeed(chalk.green('Arquivos classificados por escopo!'));
    // Exibir banner
    console.log(boxen(
      chalk.cyan.bold('DiffSense - Arquivos por Escopo') + '\n' +
      chalk.dim('Listagem de arquivos modificados agrupados por pacote'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
    ));
    // Preparar tabela
    const table = new Table({
      head: [chalk.cyan('Escopo'), chalk.cyan('Arquivos Modificados')],
      style: { head: [], border: [] },
      wordWrap: true,
      colWidths: [30, 80]
    });
    const entries = Object.entries(grouped).filter(([, files]) => files.length > 0);
    if (entries.length === 0) {
      console.log(chalk.yellow('Nenhum arquivo classificado em escopos.'));
    } else {
      entries.forEach(([scope, files]) => {
        table.push([chalk.green(scope), files.join('\n')]);
      });
      console.log(table.toString());
    }
  } catch (err) {
    console.error('Erro agrupando arquivos por escopo:', err);
    process.exit(1);
  }
})();
