#!/usr/bin/env node

/**
 * Script para commit direto e interativo no DiffSense
 * Permite especificar o tipo de commit e descrição via argumentos de linha de comando
 * 
 * Formatos suportados:
 * - pnpm commit --type "descrição do commit"
 * - pnpm commit --feat "nova funcionalidade"
 * - pnpm commit --fix "correção de bug"
 * - pnpm commit --docs "atualização de documentação"
 * - pnpm commit --refactor "refatoração de código"
 * - pnpm commit --test "adição de testes"
 * - pnpm commit --chore "tarefa de manutenção"
 * - pnpm commit --style "formatação de código"
 * - pnpm commit --perf "melhoria de performance"
 * 
 * Para breaking changes:
 * - pnpm commit --breaking --feat "breaking change"
 * - pnpm commit --feat! "breaking change alternativo"
 * 
 * Com flag para encerrar após um commit:
 * - pnpm commit --feat "novo endpoint" --stop
 * - pnpm commit --fix "correção de bug" -s
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

// Bibliotecas para interface de terminal
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import Listr from 'listr';

// Importar o classificador de arquivos compartilhado
import { 
  classifyFiles, 
  classifyFile,
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

// Função para processar argumentos da linha de comando
function parseArguments() {
  const args = process.argv.slice(2);
  const params = {};

  // Verificar argumentos no formato --type "descrição"
  const validTypes = [
    // Tipos padrão
    'feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'style', 'perf', 'build', 'ci', 'revert',
    // Tipos com breaking changes
    'feat!', 'fix!', 'docs!', 'refactor!', 'test!', 'chore!', 'style!', 'perf!'
  ];
  
  // Verificar se o usuário está pedindo ajuda
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  }
  
  // Verificar se o usuário quer parar após o primeiro commit
  if (args.includes('--stop') || args.includes('-s')) {
    params.stopAfterCommit = true;
    // Remover os argumentos --stop/-s para não interferir no processamento
    args.splice(args.indexOf(args.includes('--stop') ? '--stop' : '-s'), 1);
  }
  
  // Flag para detectar argumentos de breaking change
  let hasBreakingFlag = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Detectar flags de breaking change
    if (arg === '--breaking' || arg === '-b') {
      hasBreakingFlag = true;
      continue;
    }
    
    if (arg.startsWith('--')) {
      // Remover o prefixo -- e possíveis aspas
      let type = arg.substring(2).replace(/^"|"$/g, '');
      
      // Se já temos flag de breaking change, adicionar '!' ao tipo
      if (hasBreakingFlag && !type.endsWith('!')) {
        type = `${type}!`;
        hasBreakingFlag = false; // Consumir a flag
      }
      
      // Verificar se é um tipo válido
      if (validTypes.includes(type)) {
        // Verificar se existe próximo argumento como descrição
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          params.type = type;
          // Remover possíveis aspas da descrição
          params.description = args[i + 1].replace(/^"|"$/g, '').replace(/^['']|['']$/g, '');
          console.log(`\n${chalk.bold('Commit direto:')} ${TYPE_COLORS[type] ? TYPE_COLORS[type](type) : chalk.white(type)} "${chalk.italic(params.description)}"`);
          i++; // Pular o próximo argumento já processado
        } else {
          // Se não tiver descrição, apenas registrar o tipo
          params.type = type;
          console.log(`\n${chalk.bold('Tipo pré-selecionado:')} ${TYPE_COLORS[type] ? TYPE_COLORS[type](type) : chalk.white(type)} - ${chalk.italic('aguardando descrição interativa...')}`);
        }
      }
    }
  }
  
  return params;
}

// Função para exibir seção com destaque
function displaySection(title) {
  console.log('\n' + chalk.bold.underline(title));
}

// A função isRelevantForVersioning é importada do módulo compartilhado

// Função para exibir a ajuda do comando
function showHelp() {
  console.log('\n' + gradient.passion.multiline('DIFFSENSE - Ajuda do Comando de Commit\n'));
  
  console.log(chalk.bold('Uso básico:'));
  console.log('  pnpm commit                         - Inicia o assistente de commit interativo');
  
  console.log('\n' + chalk.bold('Commit direto com tipo e descrição:'));
  console.log('  pnpm commit --feat "nova feature"   - Commit direto do tipo feat');
  console.log('  pnpm commit --fix "correção bug"    - Commit direto do tipo fix');
  
  console.log('\n' + chalk.bold('Tipos de commit suportados:'));
  console.log(`  ${chalk.green('--feat')}     Nova funcionalidade`);
  console.log(`  ${chalk.yellow('--fix')}      Correção de bug`);
  console.log(`  ${chalk.blue('--docs')}     Documentação`);
  console.log(`  ${chalk.magenta('--refactor')} Refatoração de código`);
  console.log(`  ${chalk.cyan('--test')}     Testes`);
  console.log(`  ${chalk.grey('--chore')}    Tarefas de manutenção`);
  console.log(`  ${chalk.white('--style')}    Formatação de código`);
  console.log(`  ${chalk.blueBright('--perf')}     Melhorias de performance`);
  
  console.log('\n' + chalk.bold('Para breaking changes (mudanças que quebram compatibilidade):'));
  console.log('  pnpm commit --breaking --feat "mudança incompatível"');
  console.log('  pnpm commit --feat! "alternativa para breaking change"');
  
  console.log('\n' + chalk.bold('Opções adicionais:'));
  console.log('  --help, -h     Exibe esta ajuda');
  console.log('  --breaking, -b Marca o commit como breaking change');
  console.log('  --stop, -s     Realiza apenas o commit do tipo especificado e encerra\n');
  
  console.log(chalk.bold('Exemplos com combinação de opções:'));
  console.log('  pnpm commit --feat "nova API" --stop        - Commit apenas do tipo feat e encerra');
  console.log('  pnpm commit --fix! "correção crítica" --stop - Commit de breaking change fix e encerra\n');
  
  process.exit(0);
}

// Função para exibir cabeçalho
function showHeader() {
  const packageInfo = JSON.parse(execSync('npm pkg get name version description', { encoding: 'utf8' }));
  const name = packageInfo.name.replace(/["@a-z\/]+\//, '').toUpperCase();
  const version = packageInfo.version.replace(/"/g, '');
  
  const headerText = gradient.cristal(`
   ${name} v${version}
    
   COMMIT INTERATIVO
  `);
  
  console.log(boxen(headerText, boxenOptions));
}

// Função para criar o commit
async function createCommit(commitType, description, scope = '') {
  try {
    const commitSpinner = ora('Criando commit...').start();
    
    // Formatação do commit conforme conventional commits
    const breakingChange = commitType.endsWith('!');
    const baseType = breakingChange ? commitType.slice(0, -1) : commitType;
    
    let commitMessage = `${baseType}`;
    if (scope) {
      commitMessage += `(${scope})`;
    }
    if (breakingChange) {
      commitMessage += '!';
    }
    commitMessage += `: ${description}`;
    
    // Verificar se existe arquivo temporário de mensagem de commit
    const commitMsgPath = path.resolve('.git', 'COMMIT_EDITMSG');
    await fs.writeFile(commitMsgPath, commitMessage, 'utf8');
    
    // Executar comando de commit
    await execAsync(`git commit -F "${commitMsgPath}"`);
    
    commitSpinner.succeed(`Commit criado: ${chalk.green(commitMessage)}`);
    return true;
  } catch (error) {
    console.error(chalk.red(`\nErro ao criar commit: ${error.message}`));
    return false;
  }
}

// Função principal
async function main() {
  try {
    // Analisar argumentos da linha de comando
    const args = parseArguments();
    const preSelectedType = args.type;
    const preSelectedDescription = args.description;
    const stopAfterCommit = args.stopAfterCommit;
    
    showHeader();
    
    // Iniciar análise do repositório
    const repoSpinner = ora('Analisando repositório...').start();
    
    // Verificar status do git
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    if (!gitStatus.trim()) {
      repoSpinner.fail('Não há alterações para commit.');
      return;
    }
    
    // Executar tarefas em sequência
    const tasks = new Listr([
      {
        title: 'Adicionando arquivos ao stage',
        task: async () => {
          // Verificar se já existem arquivos no stage
          const { stdout: stagedFiles } = await execAsync('git diff --cached --name-only');
          if (!stagedFiles.trim()) {
            // Se não houver arquivos no stage, adicionar todos
            await execAsync('git add .');
          }
        }
      },
      {
        title: 'Identificando alterações',
        async task(ctx) {
          const { stdout: stagedFiles } = await execAsync('git diff --cached --name-only');
          ctx.allFiles = stagedFiles.split('\n').filter(Boolean);
          
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
    let allFiles = context.allFiles;
    
    repoSpinner.succeed('Repositório analisado');
    
    // Exibir arquivos encontrados
    displaySection('Arquivos detectados');
    
    if (allFiles.length > 0) {
      const fileTable = new Table({
        head: [chalk.blue('#'), chalk.blue('Arquivo')],
        colWidths: [5, 70]
      });
      
      allFiles.forEach((file, index) => {
        fileTable.push([index + 1, file]);
      });
      
      console.log(fileTable.toString());
    } else {
      console.log(chalk.yellow('Nenhum arquivo encontrado para commit.'));
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
    
    // Ordenar por importância (peso do tipo)
    typeCounts.sort((a, b) => {
      const weightA = TYPE_WEIGHTS[a.type] || 0;
      const weightB = TYPE_WEIGHTS[b.type] || 0;
      return weightB - weightA;
    });
    
    // Criar tabela para visualização dos tipos
    const typeTable = new Table({
      head: [chalk.blue('Tipo'), chalk.blue('Quantidade'), chalk.blue('Arquivos')],
      colWidths: [10, 10, 60]
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
    
    // Verificar se foi especificado um tipo via linha de comando
    if (preSelectedType && preSelectedDescription) {
      // Verificar se o tipo especificado está entre os tipos detectados
      let typeExists = typeCounts.some(tc => tc.type === preSelectedType);
      
      // Verificar variações de breaking change se o tipo exato não for encontrado
      if (!typeExists && preSelectedType.endsWith('!')) {
        const baseType = preSelectedType.slice(0, -1);
        typeExists = typeCounts.some(tc => tc.type === baseType);
        
        // Se encontrou o tipo base, converter para breaking change
        if (typeExists) {
          console.log(chalk.yellow(`\nTipo ${preSelectedType} não encontrado, mas encontrou-se ${baseType}.`));
          console.log(chalk.yellow(`Convertendo arquivos de ${baseType} para ${preSelectedType} (breaking change)...`));
          
          // Converter o tipo para breaking change
          if (!filesByType[preSelectedType]) {
            filesByType[preSelectedType] = [];
          }
          filesByType[preSelectedType] = [...filesByType[preSelectedType], ...filesByType[baseType]];
          delete filesByType[baseType];
          
          // Atualizar typeCounts
          const index = typeCounts.findIndex(tc => tc.type === baseType);
          if (index !== -1) {
            typeCounts[index].type = preSelectedType;
          }
          
          typeExists = true;
        }
      }
      
      if (typeExists) {
        console.log(chalk.green(`\nUsando parâmetros informados: ${TYPE_COLORS[preSelectedType] ? TYPE_COLORS[preSelectedType](preSelectedType) : chalk.white(preSelectedType)}: "${preSelectedDescription}"`));
        
        // Criar commit diretamente com os parâmetros informados
        await createCommit(preSelectedType, preSelectedDescription);
        
        // Remover os arquivos do tipo já commitado
        const filesCommitted = filesByType[preSelectedType] || [];
        
        // Verificar se o usuário solicitou para parar após o commit
        if (stopAfterCommit) {
          console.log(chalk.cyan('\nFlag --stop detectada. Finalizando após o commit solicitado.'));
          return;
        }
        
        // Se ainda houver outros tipos, perguntar se deseja prosseguir
        const remainingTypes = typeCounts.filter(tc => tc.type !== preSelectedType);
        
        if (remainingTypes.length > 0) {
          const { shouldContinue } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldContinue',
              message: 'Há outros tipos de alterações. Deseja continuar com o fluxo interativo para eles?',
              default: true
            }
          ]);
          
          if (!shouldContinue) {
            console.log(chalk.yellow('\nOperação finalizada pelo usuário.'));
            return;
          }
          
          // Continuar apenas com os tipos restantes
          delete filesByType[preSelectedType];
          
        } else {
          // Todos os arquivos foram commitados
          console.log(chalk.green('\nTodas as alterações foram commitadas com sucesso.'));
          return;
        }
      } else {
        console.log(chalk.yellow(`\nTipo ${preSelectedType} informado não foi encontrado nas alterações. Continuando com o fluxo interativo.`));
      }
    }
    
    // Fluxo interativo normal para os tipos remanescentes
    const commitPromises = [];
    
    // Caso de tipo pré-selecionado sem descrição
    if (preSelectedType && !preSelectedDescription) {
      const typeExists = typeCounts.some(tc => tc.type === preSelectedType);
      
      if (typeExists) {
        // Destacar o tipo pré-selecionado
        console.log(chalk.cyan(`\nEncontradas alterações do tipo pré-selecionado: ${TYPE_COLORS[preSelectedType] ? TYPE_COLORS[preSelectedType](preSelectedType) : preSelectedType}`));
        
        // Pedir a descrição para o tipo pré-selecionado primeiro
        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: `Descrição para o commit do tipo ${preSelectedType}:`,
            validate: input => input.length > 0 ? true : 'A descrição não pode estar vazia'
          }
        ]);
        
        // Criar o commit para o tipo pré-selecionado
        await createCommit(preSelectedType, description);
        
        // Verificar se o usuário solicitou para parar após o commit
        if (stopAfterCommit) {
          console.log(chalk.cyan('\nFlag --stop detectada. Finalizando após o commit solicitado.'));
          return;
        }
        
        // Remover o tipo processado da lista
        const remainingTypes = typeCounts.filter(tc => tc.type !== preSelectedType);
        
        if (remainingTypes.length === 0) {
          console.log(chalk.green('\nTodas as alterações foram commitadas com sucesso.'));
          return;
        }
        
        const { shouldContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldContinue',
            message: 'Há outros tipos de alterações. Deseja continuar com o fluxo interativo para eles?',
            default: true
          }
        ]);
        
        if (!shouldContinue) {
          console.log(chalk.yellow('\nOperação finalizada pelo usuário.'));
          return;
        }
        
        // Continuar apenas com os tipos restantes
        delete filesByType[preSelectedType];
      } else {
        console.log(chalk.yellow(`\nO tipo pré-selecionado ${preSelectedType} não foi encontrado nas alterações.`));
      }
    }
    
    // Perguntar descrição para cada tipo
    for (const { type, files } of typeCounts) {
      // Pular o tipo que já foi commitado (se aplicável)
      if (preSelectedType && type === preSelectedType) continue;
      
      displaySection(`Detalhes para ${TYPE_COLORS[type] ? TYPE_COLORS[type](type) : type}`);
      
      // Listar arquivos deste tipo
      const fileTable = new Table({
        head: [chalk.blue('#'), chalk.blue('Arquivo')],
        colWidths: [5, 70]
      });
      
      files.forEach((file, index) => {
        fileTable.push([index + 1, file]);
      });
      
      console.log(fileTable.toString());
      
      // Solicitar descrição do commit
      const { description, scope } = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: `Descrição para ${type}:`,
          validate: input => input.trim().length > 0 ? true : 'A descrição é obrigatória'
        },
        {
          type: 'input',
          name: 'scope',
          message: 'Escopo (opcional):',
        }
      ]);
      
      commitPromises.push({ type, description, scope });
    }
    
    // Confirmar commits
    if (commitPromises.length > 0) {
      const { confirmCommits } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmCommits',
          message: 'Confirmar commits?',
          default: true
        }
      ]);
      
      if (confirmCommits) {
        // Criar commits
        for (const { type, description, scope } of commitPromises) {
          await createCommit(type, description, scope);
        }
        
        console.log(chalk.green('\nTodos os commits foram realizados com sucesso!'));
      } else {
        console.log(chalk.yellow('\nOperação cancelada pelo usuário.'));
      }
    }
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
