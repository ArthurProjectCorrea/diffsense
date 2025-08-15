#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeChanges } from '../dist/index.js';
import { ResultFormatter } from '../dist/utils/formatter.js';
import { exec } from 'child_process';
import { promisify } from 'util';

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
      
      // Imprimir resultado completo para depuração
      console.log('\n🔍 Estrutura do resultado recebido:');
      console.log(JSON.stringify(result, null, 2));
      
      // Agrupar arquivos por tipo
      const filesByType = {};
      
      if (result && result.files) {
        console.log(`\n📋 Total de alterações detectadas: ${result.files.length}`);
        
        // Examinar estrutura das alterações
        result.files.forEach((change, index) => {
          console.log(`\n📄 Alteração #${index + 1}:`);
          console.log(JSON.stringify(change, null, 2));
        });
        
        // Se não há alterações ou está vazio, tente extrair diretamente dos arquivos modificados
        if (result.files.length === 0) {
          console.log('\n⚠️ Sem alterações detectadas no resultado. Tentando outra abordagem...');
          
          // Obter arquivos modificados diretamente
          try {
            const { stdout } = await execPromise('git diff --name-only --cached');
            const modifiedFiles = stdout.trim().split('\n').filter(Boolean);
            
            console.log(`\n📄 Arquivos modificados (do git diff): ${modifiedFiles.length}`);
            console.log(modifiedFiles);
            
            // Assumir como 'feat' se não conseguirmos classificar
            if (modifiedFiles.length > 0) {
              if (!filesByType['feat']) {
                filesByType['feat'] = new Set();
              }
              modifiedFiles.forEach(file => filesByType['feat'].add(file));
            }
          } catch (gitError) {
            console.error('❌ Erro ao tentar obter arquivos modificados:', gitError.message);
          }
        } else {
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
            } else {
              console.log(`⚠️ Alteração sem tipo ou arquivo válido: ${JSON.stringify(change)}`);
              
              // Se não tem tipo mas tem arquivo, classificar como feat
              if (change.filePath) {
                if (!filesByType['feat']) {
                  filesByType['feat'] = new Set();
                }
                filesByType['feat'].add(change.filePath);
              }
            }
          });
        }
      } else {
        console.log('⚠️ Resultado inválido ou sem propriedade "changes"');
      }
      
      // Verificar se há arquivos para commit
      const typesWithFiles = Object.keys(filesByType);
      
      console.log(`\n📊 Tipos de alterações encontrados: ${typesWithFiles.length}`);
      typesWithFiles.forEach(type => {
        console.log(`  - ${type}: ${filesByType[type].size} arquivo(s)`);
      });
      
      if (typesWithFiles.length === 0) {
        console.log('⚠️ Nenhuma alteração classificada encontrada para commit.');
        return;
      }
      
      console.log(`\n🔄 Encontrados arquivos para commit em ${typesWithFiles.length} categorias diferentes.`);
      
      // Realizar commits agrupados por tipo
      for (const type of typesWithFiles) {
        const files = Array.from(filesByType[type]);
        
        if (files.length > 0) {
          const commitMessage = `${type}: commit dos arquivos do ${type}`;
          
          console.log(`\n📝 Preparando commit para ${files.length} arquivo(s) do tipo '${type}':`);
          console.log(files.map(file => `  - ${file}`).join('\n'));
          
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
              const fs = await import('fs/promises');
              await fs.writeFile(tempFileName, fileList);
              
              // Construir o comando de commit usando o arquivo temporário
              const commitCommand = `git commit -m "${commitMessage}" --pathspec-from-file="${tempFileName}"`;
              
              console.log(`\n$ ${commitCommand}`);
              
              const { stdout, stderr } = await execPromise(commitCommand);
              
              // Remover o arquivo temporário
              await fs.unlink(tempFileName).catch(e => console.warn(`Não foi possível remover arquivo temporário: ${e.message}`));
              
              if (stderr && stderr.trim()) {
                console.warn(`⚠️ Aviso do Git:\n${stderr}`);
              }
              console.log(`✅ Commit realizado com sucesso:\n${stdout}`);
            } catch (error) {
              console.error(`❌ Erro ao realizar commit para tipo '${type}':`);
              console.error(`   ${error.message}`);
              if (error.stderr) {
                console.error(`   Detalhes: ${error.stderr}`);
              }
            }
          } else {
            // Formato para modo dry-run
            const quotedFiles = files.map(file => `"${file.replace(/"/g, '\\"')}"`).join(' ');
            const commitCommand = `git commit -m "${commitMessage}" --only ${quotedFiles}`;
            console.log(`\n$ ${commitCommand}`);
            console.log('(Modo dry-run: comando não foi executado)');
          }
        }
      }
      
      // Exibir resumo da análise ao final
      console.log('\n-------------------------------------------------------');
      console.log('📊 Resumo final da análise:');
      
      if (options.json) {
        // Saída em formato JSON
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Saída formatada para o console
        const formatter = new ResultFormatter();
        const output = formatter.format(result);
        console.log(output);
      }
      
      // Mostrar totais de arquivos commitados por tipo
      if (!options.dryRun) {
        console.log('\n� Total de arquivos commitados por tipo:');
        for (const type of Object.keys(filesByType)) {
          console.log(`  - ${type}: ${filesByType[type].size} arquivo(s)`);
        }
      }
    } catch (error) {
      console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
