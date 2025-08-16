#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeChanges } from '../dist/index.js';
import { ResultFormatter } from '../dist/utils/formatter.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import { promises as fs } from 'fs';

const execPromise = promisify(exec);

const program = new Command();

program
  .name('diffsense-commit')
  .description('Analisa alterações no código e realiza commits agrupados por tipo')
  .version('1.0.0')
  .option('-b, --base <ref>', 'Referência base para comparação (ex: main, HEAD~1)', 'HEAD^')
  .option('-h, --head <ref>', 'Referência para comparação (ex: HEAD)', 'HEAD')
  .option('--json', 'Saída em formato JSON')
  .option('-d, --dry-run', 'Exibe os comandos de commit sem executá-los')
  .option('--autoCommit', 'Inicializa o modo de commit automático (ainda pede confirmação)')
  .action(async (options) => {
    try {
      console.log('🔍 Analisando alterações...');
      console.log('⚠️  Nota: Todos os arquivos serão adicionados ao stage (git add .) para garantir análise completa.');
      
      try {
        // Verificar status inicial
        const { stdout: initialStatus } = await execPromise('git status --porcelain');
        console.log(`\n📊 Status Git antes do add:\n${initialStatus || '(Área de trabalho limpa)'}`);
        
        // Executar git add para garantir que todos os arquivos são considerados
        const { stdout: addOutput, stderr: addError } = await execPromise('git add .');
        if (addError) {
          console.warn(`⚠️ Aviso ao adicionar arquivos: ${addError}`);
        }
        
        // Verificar status após git add
        const { stdout: afterAddStatus } = await execPromise('git status --porcelain');
        console.log(`\n📊 Status Git após add:\n${afterAddStatus || '(Área de trabalho limpa)'}`);
      } catch (gitError) {
        console.error(`❌ Erro ao executar git add: ${gitError.message}`);
      }
      
      const result = await analyzeChanges(options.base, options.head);
      
      // Exibir resultado da análise primeiro (padrão do analyzer.js)
      if (options.json) {
        // Saída em formato JSON
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Saída formatada para o console
        const formatter = new ResultFormatter();
        const output = formatter.format(result);
        console.log(output);
      }

      // Agrupar arquivos por tipo
      const filesByType = {};
      
      if (result && result.files) {
        // Ordenar as alterações para garantir consistência
        const sortedChanges = [...result.files].sort((a, b) => {
          // Primeiro ordenar por tipo
          if (a.primaryType < b.primaryType) return -1;
          if (a.primaryType > b.primaryType) return 1;
          // Em seguida por nome de arquivo
          return (a.filePath || '').localeCompare(b.filePath || '');
        });
        
        // Agrupar por tipo
        sortedChanges.forEach(change => {
          if (change.primaryType && change.filePath) {
            const type = change.primaryType.trim();
            if (!filesByType[type]) {
              filesByType[type] = new Set();
            }
            // Usar Set para evitar duplicatas
            filesByType[type].add(change.filePath);
          } else if (change.filePath) {
            // Se não tem tipo mas tem arquivo, classificar como feat
            if (!filesByType['feat']) {
              filesByType['feat'] = new Set();
            }
            filesByType['feat'].add(change.filePath);
          }
        });
      } else {
        // Se não conseguirmos extrair do resultado, tentar obter diretamente do git
        try {
          const { stdout } = await execPromise('git diff --name-only --cached');
          const modifiedFiles = stdout.trim().split('\n').filter(Boolean);
          
          if (modifiedFiles.length > 0) {
            if (!filesByType['feat']) {
              filesByType['feat'] = new Set();
            }
            modifiedFiles.forEach(file => filesByType['feat'].add(file));
          }
        } catch (gitError) {
          console.error('❌ Erro ao tentar obter arquivos modificados:', gitError.message);
        }
      }
      
      // Verificar se há arquivos para commit
      const typesWithFiles = Object.keys(filesByType);
      
      if (typesWithFiles.length === 0) {
        console.log('⚠️ Nenhuma alteração classificada encontrada para commit.');
        return;
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 RESUMO DE ALTERAÇÕES CLASSIFICADAS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Encontrados arquivos para commit em ${typesWithFiles.length} categorias diferentes:`);
      console.log('');
      
      // Mostrar todos os arquivos classificados por tipo
      for (const type of typesWithFiles.sort()) {
        const files = Array.from(filesByType[type]);
        console.log(`📁 ${type.toUpperCase()} (${files.length} arquivo(s)):`);
        console.log(files.map(file => `   - ${file}`).join('\n'));
        console.log('');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Pedir confirmação ao usuário antes de realizar os commits
      if (!options.dryRun) {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        // Função para perguntar ao usuário
        const perguntarConfirmacao = () => {
          return new Promise((resolve) => {
            rl.question('\n🔄 Deseja prosseguir com os commits? (S/n): ', (answer) => {
              const resposta = answer.trim().toLowerCase();
              if (resposta === '' || resposta === 's' || resposta === 'sim' || resposta === 'y' || resposta === 'yes') {
                resolve(true);
              } else {
                resolve(false);
              }
              rl.close();
            });
          });
        };
        
        const deveCommitar = await perguntarConfirmacao();
        
        if (!deveCommitar) {
          console.log('\n❌ Operação cancelada pelo usuário.');
          return;
        }
        
        console.log('\n✅ Confirmado! Realizando commits...');
      } else {
        console.log('\n🔍 Modo dry-run: os comandos serão exibidos, mas não executados.');
      }
      
      // Realizar commits agrupados por tipo
      let commitsFeitosComSucesso = 0;
      let commitsComErro = 0;
      
      for (const type of typesWithFiles) {
        const files = Array.from(filesByType[type]);
        
        if (files.length > 0) {
          const commitMessage = `${type}: commit dos arquivos do ${type}`;
          
          console.log(`\n📝 Executando commit para ${files.length} arquivo(s) do tipo '${type}'...`);
          
          // No Windows, o comando git com muitos arquivos pode falhar devido ao limite de comprimento da linha
          // Portanto, vamos criar um arquivo temporário com a lista de arquivos
          if (!options.dryRun) {
            try {
              // Primeiro, certifique-se de que todos os arquivos estão adicionados
              for (const file of files) {
                try {
                  await execPromise(`git add "${file}"`);
                } catch (addError) {
                  console.warn(`⚠️ Não foi possível adicionar arquivo "${file}": ${addError.message}`);
                }
              }
              
              // Usar --pathspec-from-file para contornar limites de tamanho de linha
              // Criar um arquivo temporário com a lista de arquivos
              const tempFileName = `.diffsense-files-${Date.now()}.txt`;
              const fileList = files.join('\n');
              await fs.writeFile(tempFileName, fileList);
              
              // Construir o comando de commit usando o arquivo temporário
              const commitCommand = `git commit -m "${commitMessage}" --pathspec-from-file="${tempFileName}"`;
              
              console.log(`$ ${commitCommand}`);
              
              const { stdout, stderr } = await execPromise(commitCommand);
              
              // Remover o arquivo temporário
              await fs.unlink(tempFileName).catch(e => console.warn(`Não foi possível remover arquivo temporário: ${e.message}`));
              
              if (stderr && stderr.trim()) {
                console.warn(`⚠️ Aviso do Git:\n${stderr}`);
              }
              
              console.log(`✅ Commit realizado com sucesso:\n${stdout}`);
              commitsFeitosComSucesso++;
              
            } catch (error) {
              console.error(`❌ Erro ao realizar commit para tipo '${type}':`);
              console.error(`   ${error.message}`);
              if (error.stderr) {
                console.error(`   Detalhes: ${error.stderr}`);
              }
              commitsComErro++;
            }
          } else {
            // Formato para modo dry-run
            const quotedFiles = files.map(file => `"${file.replace(/"/g, '\\"')}"`).join(' ');
            const commitCommand = `git commit -m "${commitMessage}" --only ${quotedFiles}`;
            console.log(`$ ${commitCommand}`);
            console.log('(Modo dry-run: comando não foi executado)');
          }
        }
      }
      
      // Mostrar resumo final dos commits
      if (!options.dryRun) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📈 RESUMO DE COMMITS: ${commitsFeitosComSucesso} realizados com sucesso, ${commitsComErro} com erro`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (commitsFeitosComSucesso > 0) {
          console.log('\n📊 Total de arquivos commitados por tipo:');
          for (const type of Object.keys(filesByType).sort()) {
            console.log(`  - ${type}: ${filesByType[type].size} arquivo(s)`);
          }
          
          console.log('\n✨ Commits realizados com sucesso!');
        }
      }
    } catch (error) {
      console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
