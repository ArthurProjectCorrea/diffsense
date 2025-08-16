import { execPromise } from './analyzer.js';
import { promises as fs } from 'fs';
import { getCustomCommitDescription } from './ui.js';
import chalk from 'chalk';
import boxen from 'boxen';

// Função para realizar commits por tipo
export const executeCommits = async (filesByType, options) => {
  // Verificar se há arquivos para commit
  const typesWithFiles = Object.keys(filesByType);
  
  if (typesWithFiles.length === 0) {
    return { success: 0, error: 0 };
  }
  
  let commitsFeitosComSucesso = 0;
  let commitsComErro = 0;
  
  for (const type of typesWithFiles) {
    const files = Array.from(filesByType[type]);
    
    if (files.length > 0) {
      // Definir a mensagem de commit
      let commitMessage;
      
      if (options.autoComplete) {
        // Usar descrição automática
        commitMessage = `${type}: commit dos arquivos do ${type}`;
      } else {
        // Solicitar descrição personalizada ao usuário
        const customDescription = await getCustomCommitDescription(type);
        commitMessage = `${type}: ${customDescription}`;
      }
      
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
  
  return { success: commitsFeitosComSucesso, error: commitsComErro };
};

// Função para exibir o resumo final dos commits
export const displayCommitSummary = (results, filesByType, options) => {
  if (!options.dryRun && (results.success > 0 || results.error > 0)) {
    console.clear();
    
    const titulo = boxen(chalk.bold('RESUMO DE COMMITS'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue',
      backgroundColor: '#222'
    });
    
    console.log(titulo);
    
    if (results.success > 0 && results.error === 0) {
      console.log('\n' + boxen(chalk.green.bold('✅ Todos os commits foram realizados com sucesso!'), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }));
    } else if (results.success > 0 && results.error > 0) {
      console.log('\n' + boxen(chalk.yellow.bold(`⚠️ ${results.success} commits realizados com sucesso, ${results.error} com erro`), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow'
      }));
    } else if (results.success === 0 && results.error > 0) {
      console.log('\n' + boxen(chalk.red.bold(`❌ Nenhum commit realizado com sucesso, ${results.error} com erro`), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red'
      }));
    }
    
    if (results.success > 0) {
      console.log('\n' + chalk.cyan.bold('📊 Total de arquivos commitados por tipo:'));
      
      const typeColors = {
        feat: chalk.green,
        fix: chalk.red,
        docs: chalk.cyan,
        style: chalk.magenta,
        refactor: chalk.yellow,
        test: chalk.blue,
        chore: chalk.gray,
        default: chalk.white
      };
      
      const typeEmojis = {
        feat: '✨',
        fix: '🐛',
        docs: '📚',
        style: '💅',
        refactor: '🔧',
        test: '🧪',
        chore: '🔨',
        default: '📋'
      };
      
      for (const type of Object.keys(filesByType).sort()) {
        const colorize = typeColors[type] || typeColors.default;
        const emoji = typeEmojis[type] || typeEmojis.default;
        const files = Array.from(filesByType[type]);
        console.log(`  ${colorize(`${emoji} ${type}: ${files.length} arquivo(s)`)}`);
      }
      
      console.log('\n' + chalk.green.bold('✨ Commits realizados com sucesso!'));
      
      const nextSteps = boxen(
        chalk.bold.blue('💡 PRÓXIMOS PASSOS:') + '\n\n' +
        chalk.white('▪ git push           (Enviar commits para o repositório remoto)\n') +
        chalk.white('▪ git pull           (Atualizar repositório local)\n') +
        chalk.white('▪ git log            (Visualizar histórico de commits)'),
        {
          padding: 1,
          margin: { top: 1 },
          borderStyle: 'round',
          borderColor: 'blue'
        }
      );
      
      console.log(nextSteps);
    }
  } else if (options.dryRun) {
    console.log('\n' + boxen(chalk.cyan.bold('📋 Simulação concluída! Nenhum commit foi realizado (modo dry-run).'), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }));
  }
};
