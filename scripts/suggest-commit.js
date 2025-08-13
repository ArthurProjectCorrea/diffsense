#!/usr/bin/env node

/**
 * Script para gerar sugestões de commits semânticos baseados na análise DiffSense
 * 
 * Uso:
 * npm run suggest-commit [-- --from <sha> --to <sha>]
 * 
 * Se não forem fornecidos --from e --to, o script comparará o HEAD atual com o commit anterior
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .option('--from <sha>', 'SHA do commit base para comparação')
  .option('--to <sha>', 'SHA do commit final para comparação (default: HEAD)')
  .option('--branch <branch>', 'Branch base para comparação (e.g., main, develop)')
  .option('--staged', 'Analisar apenas mudanças staged')
  .parse(process.argv);

const options = program.opts();

// Determinar os commits para comparação
let fromSha, toSha;

if (options.staged) {
  // Para mudanças em stage, usamos um método diferente
  console.log('Analisando mudanças em stage...');
  
  // Salvar o estado atual
  execSync('git stash push --keep-index --include-untracked');
  
  try {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Criar um commit temporário
    execSync('git commit --no-verify -m "temp: Commit temporário para análise DiffSense"');
    
    // Usar o commit atual e o anterior para análise
    toSha = execSync('git rev-parse HEAD').toString().trim();
    fromSha = execSync('git rev-parse HEAD~1').toString().trim();
    
    // Executar a análise
    runAnalysis(fromSha, toSha);
    
    // Desfazer o commit temporário
    execSync('git reset --soft HEAD~1');
  } finally {
    // Restaurar o estado original
    try {
      execSync('git stash pop');
    } catch (error) {
      console.log('Aviso: Não foi possível restaurar o stash. Talvez não houvesse nada para salvar.');
    }
  }
} else if (options.branch) {
  // Comparar com uma branch específica
  const currentSha = execSync('git rev-parse HEAD').toString().trim();
  const mergeBase = execSync(`git merge-base origin/${options.branch} HEAD`).toString().trim();
  
  console.log(`Analisando mudanças entre branch ${options.branch} (${mergeBase}) e HEAD (${currentSha})...`);
  
  fromSha = mergeBase;
  toSha = currentSha;
  
  runAnalysis(fromSha, toSha);
} else {
  // Usar os SHAs fornecidos ou detectar automaticamente
  fromSha = options.from || execSync('git rev-parse HEAD~1').toString().trim();
  toSha = options.to || 'HEAD';
  
  console.log(`Analisando mudanças entre ${fromSha} e ${toSha}...`);
  
  runAnalysis(fromSha, toSha);
}

// Função de análise

function runAnalysis(fromSha, toSha) {
  try {
    // Rodar o DiffSense
    const rawOutput = execSync(
      `node ${path.join(__dirname, '../dist/cli/index.js')} run --base ${fromSha} --head ${toSha} --format json`
    ).toString();
    
    // Extrair apenas o JSON da saída
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível extrair JSON da saída do DiffSense');
    }
    const diffsenseOutput = jsonMatch[0];
    
    // Processar o output do DiffSense
    const data = JSON.parse(diffsenseOutput);
    const changes = data.changes || [];
    
    if (changes.length === 0) {
      console.log('Nenhuma mudança semântica detectada.');
      return;
    }
    
    // Classificar as mudanças
    const types = {
      feature: changes.filter(c => c.type.includes('FEATURE') || c.type.includes('ADD')),
      fix: changes.filter(c => c.type.includes('FIX') || c.type.includes('BUGFIX')),
      refactor: changes.filter(c => c.type.includes('REFACTOR')),
      docs: changes.filter(c => c.type.includes('DOCS')),
      test: changes.filter(c => c.type.includes('TEST')),
      chore: changes.filter(c => 
        !c.type.includes('FEATURE') && !c.type.includes('ADD') && 
        !c.type.includes('FIX') && !c.type.includes('BUGFIX') && 
        !c.type.includes('REFACTOR') && !c.type.includes('DOCS') &&
        !c.type.includes('TEST')
      )
    };
    
    // Determinar o tipo primário de commit
    let commitType = 'chore';
    let commitScope = '';
    
    if (types.feature.length > 0) {
      commitType = 'feat';
      const mostImpactful = types.feature.sort((a, b) => b.impactScore - a.impactScore)[0];
      commitScope = mostImpactful.file.split('/')[0];
    } else if (types.fix.length > 0) {
      commitType = 'fix';
      const mostImpactful = types.fix.sort((a, b) => b.impactScore - a.impactScore)[0];
      commitScope = mostImpactful.file.split('/')[0];
    } else if (types.refactor.length > 0) {
      commitType = 'refactor';
      const mostImpactful = types.refactor.sort((a, b) => b.impactScore - a.impactScore)[0];
      commitScope = mostImpactful.file.split('/')[0];
    } else if (types.docs.length > 0) {
      commitType = 'docs';
      commitScope = types.docs[0].file.split('/')[0];
    } else if (types.test.length > 0) {
      commitType = 'test';
      commitScope = types.test[0].file.split('/')[0];
    }
    
    // Verificar mudanças breaking
    const breakingChanges = changes.filter(c => c.impactScore > 0.8);
    const isBreaking = breakingChanges.length > 0;
    
    // Gerar descrição
    let description = '';
    
    if (isBreaking) {
      const breakingDesc = breakingChanges.map(c => c.description || 
        `Changes in ${c.file}`).join(', ');
      description = `BREAKING CHANGE: ${breakingDesc}`;
    } else {
      const highImpactChanges = changes.filter(c => c.impactScore > 0.5);
      if (highImpactChanges.length > 0) {
        description = highImpactChanges.map(c => c.description || 
          `Changes in ${c.file}`).join(', ');
      } else {
        description = 'Various updates and improvements';
      }
    }
    
    // Formatar mensagem de commit
    const commitMsg = commitScope ? 
      `${commitType}(${commitScope})${isBreaking ? '!' : ''}: ${description}` : 
      `${commitType}${isBreaking ? '!' : ''}: ${description}`;
    
    // Exibir o resultado
    console.log('\n====== ANÁLISE DIFFSENSE ======');
    console.log(`\nMudanças detectadas: ${changes.length}`);
    console.log(`- Features: ${types.feature.length}`);
    console.log(`- Fixes: ${types.fix.length}`);
    console.log(`- Refactors: ${types.refactor.length}`);
    console.log(`- Documentation: ${types.docs.length}`);
    console.log(`- Tests: ${types.test.length}`);
    console.log(`- Other: ${types.chore.length}`);
    
    if (breakingChanges.length > 0) {
      console.log('\n⚠️ BREAKING CHANGES DETECTADAS:');
      breakingChanges.forEach(c => {
        console.log(`- ${c.description || c.file}: Impact Score ${c.impactScore.toFixed(2)}`);
      });
    }
    
    console.log('\n====== SUGESTÃO DE COMMIT ======');
    console.log(commitMsg);
    console.log('\nPara usar esta mensagem de commit:');
    console.log(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    
  } catch (error) {
    console.error('Erro ao executar análise DiffSense:', error.message);
    console.error('Certifique-se de que o DiffSense está compilado (npm run build)');
    process.exit(1);
  }
}
