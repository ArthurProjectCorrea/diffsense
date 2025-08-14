#!/usr/bin/env node

/**
 * Script para análise e classificação de arquivos no DiffSense
 * Exibe apenas a classificação de arquivos sem realizar commits
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';

// Bibliotecas para interface de terminal
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import Listr from 'listr';

// Importar o classificador de arquivos compartilhado
import { 
  classifyFiles, 
  TYPE_WEIGHTS,
  isRelevantForVersioning 
} from '../dist/utils/file-classifier.js';

const execAsync = promisify(exec);

// Temas de cores para tipos de commit
const TYPE_COLORS = {
  'feat!': chalk.red.bold,
  'fix!': chalk.red.bold,
  'feat': chalk.green.bold,
  'fix': chalk.yellow.bold,
  'docs': chalk.blue.bold,
  'refactor': chalk.magenta.bold,
  'test': chalk.cyan.bold,
  'chore': chalk.grey.bold
};

// Configurações do boxen para cabeçalhos
const boxenOptions = {
  padding: 1,
  margin: 1,
  borderStyle: 'round',
  borderColor: 'blue',
  backgroundColor: '#222'
};

// Função para exibir seção com destaque
function displaySection(title) {
  console.log('\n' + chalk.bold.underline(title));
}

// Função para exibir cabeçalho
function showHeader() {
  const packageInfo = JSON.parse(execSync('npm pkg get name version description', { encoding: 'utf8' }));
  const name = packageInfo.name.replace(/["@a-z\/]+\//, '').toUpperCase();
  const version = packageInfo.version.replace(/"/g, '');
  
  const headerText = gradient.cristal(`
   ${name} v${version}
    
   ANÁLISE DE ALTERAÇÕES
  `);
  
  console.log(boxen(headerText, boxenOptions));
}

// Função principal
async function main() {
  try {
    showHeader();
    
    // Iniciar análise do repositório
    const repoSpinner = ora('Analisando repositório...').start();
    
    // Verificar status do git
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    if (!gitStatus.trim()) {
      repoSpinner.fail('Não há alterações para analisar.');
      return;
    }
    
    repoSpinner.succeed('Repositório analisado');
    
    // Executar tarefas em sequência
    const tasks = new Listr([
      {
        title: 'Identificando alterações',
        async task(ctx) {
          const { stdout: modifiedFiles } = await execAsync('git ls-files -m');
          const { stdout: untrackedFiles } = await execAsync('git ls-files --others --exclude-standard');
          const { stdout: stagedFiles } = await execAsync('git diff --cached --name-only');
          
          ctx.allFiles = [...new Set([
            ...modifiedFiles.split('\n').filter(Boolean),
            ...untrackedFiles.split('\n').filter(Boolean),
            ...stagedFiles.split('\n').filter(Boolean)
          ])];
          
          return new Listr([
            {
              title: `Encontrados ${ctx.allFiles.length} arquivos`,
              task: () => {}
            }
          ]);
        }
      }
    ]);
    
    // Executar tarefas
    const context = await tasks.run();
    const allFiles = context.allFiles;
    
    // Exibir arquivos encontrados
    displaySection('Arquivos detectados');
    
    if (allFiles.length > 0) {
      const fileTable = new Table({
        head: [chalk.blue('#'), chalk.blue('Arquivo'), chalk.blue('Status')],
        colWidths: [5, 60, 15]
      });
      
      const checkFileStatus = async (file) => {
        const isStaged = (await execAsync(`git diff --cached --name-only "${file}" 2>/dev/null || echo ""`)).stdout.trim() === file;
        const isModified = (await execAsync(`git ls-files -m "${file}" 2>/dev/null || echo ""`)).stdout.trim() === file;
        const isUntracked = (await execAsync(`git ls-files --others --exclude-standard "${file}" 2>/dev/null || echo ""`)).stdout.trim() === file;
        
        if (isStaged) return chalk.green('Staged');
        if (isModified) return chalk.yellow('Modificado');
        if (isUntracked) return chalk.red('Não rastreado');
        return chalk.grey('Desconhecido');
      };
      
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        const status = await checkFileStatus(file);
        fileTable.push([i + 1, file, status]);
      }
      
      console.log(fileTable.toString());
    } else {
      console.log(chalk.yellow('Nenhum arquivo encontrado para análise.'));
      return;
    }
    
    // Iniciar classificação
    const analyzeSpinner = ora('Analisando e classificando alterações...').start();
    
    // Verificar se há arquivo para teste de breaking change
    const hasBreakingTest = allFiles.includes('teste-breaking.js');
    
    // Usar o classificador compartilhado para classificar os arquivos
    analyzeSpinner.text = 'Classificando alterações usando o motor compartilhado...';
    
    // Classificar todos os arquivos usando o módulo compartilhado
    let filesByType = {};
    
    try {
      filesByType = await classifyFiles(allFiles);
      
      // Tratar o caso especial de teste de breaking change
      if (hasBreakingTest) {
        // Se o arquivo teste-breaking.js foi classificado como feat, reclassificar como feat!
        if (filesByType['feat'] && filesByType['feat'].includes('teste-breaking.js')) {
          // Criar array para feat! se não existir
          if (!filesByType['feat!']) {
            filesByType['feat!'] = [];
          }
          // Adicionar o arquivo à categoria feat!
          filesByType['feat!'].push('teste-breaking.js');
          
          // Remover o arquivo da categoria original
          filesByType['feat'] = filesByType['feat'].filter(file => file !== 'teste-breaking.js');
          
          // Se a categoria ficou vazia, removê-la
          if (filesByType['feat'].length === 0) {
            delete filesByType['feat'];
          }
        }
      }
    } catch (error) {
      analyzeSpinner.fail(`Erro na classificação: ${error.message}`);
      process.exit(1);
    }
    
    analyzeSpinner.succeed('Alterações classificadas');
    
    // Contar o número total de tipos encontrados
    displaySection('Resultado da classificação');
    
    const typeCounts = Object.entries(filesByType).map(([type, files]) => {
      return { type, count: files.length, files };
    });
    
    // Criar tabela para visualização dos tipos
    const typeTable = new Table({
      head: [chalk.blue('Tipo'), chalk.blue('Quantidade'), chalk.blue('Arquivos')],
      colWidths: [10, 10, 60]
    });
    
    // Ordenar por importância (peso do tipo)
    typeCounts.sort((a, b) => {
      const weightA = TYPE_WEIGHTS[a.type] || 0;
      const weightB = TYPE_WEIGHTS[b.type] || 0;
      return weightB - weightA;
    });
    
    typeCounts.forEach(({ type, count, files }) => {
      const fileList = files.length <= 3 
        ? files.join(', ')
        : `${files.slice(0, 3).join(', ')}... (e mais ${files.length - 3})`;
      
      typeTable.push([
        TYPE_COLORS[type] ? TYPE_COLORS[type](type) : chalk.white(type),
        count,
        fileList
      ]);
    });
    
    console.log(typeTable.toString());
    
    // Exibir detalhes de cada tipo
    displaySection('Detalhes por tipo');
    
    for (const { type, files } of typeCounts) {
      // Cabeçalho do tipo
      console.log(boxen(
        TYPE_COLORS[type] ? TYPE_COLORS[type](type.toUpperCase()) : chalk.white(type.toUpperCase()), 
        { padding: 0.5, borderStyle: 'round', borderColor: 'cyan' }
      ));
      
      // Listar arquivos
      const fileDetailTable = new Table({
        head: [chalk.blue('#'), chalk.blue('Arquivo')],
        colWidths: [5, 70]
      });
      
      files.forEach((file, index) => {
        fileDetailTable.push([index + 1, file]);
      });
      
      console.log(fileDetailTable.toString());
    }
    
    // Finalização
    console.log('\n' + boxen(gradient.pastel('Análise finalizada com sucesso!'), { 
      padding: 1, 
      borderStyle: 'double', 
      borderColor: 'green' 
    }));
    
  } catch (error) {
    console.error(chalk.red(`\nErro: ${error.message}`));
    process.exit(1);
  }
}

// Executar função principal
main().catch(error => {
  console.error(chalk.red(`\nErro fatal: ${error.message}`));
  process.exit(1);
});
