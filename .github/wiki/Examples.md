# Exemplos de Uso do DiffSense

Esta página contém exemplos práticos de como utilizar o DiffSense em diferentes cenários.

## Exemplo Básico

Este exemplo mostra como usar o DiffSense para analisar mudanças entre duas referências Git:

```javascript
// exemplo-uso-diffsense.js
// Execute com: node exemplo-uso-diffsense.js

import { runAnalysis, VERSION } from 'diffsense';

console.log(`DiffSense versão: ${VERSION}`);

async function exemploAnalise() {
  try {
    console.log('Analisando mudanças entre main e HEAD...');
    
    const resultado = await runAnalysis('main', 'HEAD', {
      format: 'json',
      // Opcionalmente, configurar caminho das regras:
      // configPath: './minhas-regras.yaml' 
    });
    
    console.log('\nRelatório:');
    console.log(resultado.report);
    
    if (resultado.suggestedCommit) {
      const { type, scope, subject, breaking } = resultado.suggestedCommit;
      console.log('\nSugestão de commit:');
      console.log(`${type}${scope ? `(${scope})` : ''}${breaking ? '!' : ''}: ${subject}`);
    }
    
    console.log('\nMudanças detectadas:');
    resultado.changes.forEach(change => {
      console.log(`- [${change.commitType}] ${change.filePath}`);
    });
  } catch (error) {
    console.error('Erro ao executar análise:', error);
  }
}

exemploAnalise();
```

## Integração com CI/CD

Este exemplo demonstra como integrar o DiffSense em sistemas de CI/CD:

```javascript
// exemplo-integracao-ci.js
// Exemplo de como integrar o DiffSense em sistemas de CI/CD
import { runAnalysis } from 'diffsense';
import fs from 'fs/promises';

async function verificarMudancas() {
  // Base branch pode ser configurada via variáveis de ambiente em CI/CD
  const baseBranch = process.env.CI_BASE_BRANCH || 'main';
  const headBranch = process.env.CI_HEAD_BRANCH || 'HEAD';
  
  console.log(`Verificando mudanças de ${baseBranch} para ${headBranch}...`);
  
  try {
    const resultado = await runAnalysis(baseBranch, headBranch, {
      format: 'json',
      // Arquivo de configuração customizado para CI
      configPath: './.diffsense-ci.yaml'
    });
    
    // Verificar se há breaking changes
    const temBreakingChanges = resultado.changes.some(change => change.breaking);
    
    // Gerar relatório para artefato do CI
    await fs.writeFile('./diffsense-report.json', JSON.stringify(resultado, null, 2));
    
    // Gerar relatório Markdown para PR ou documentação
    await fs.writeFile('./diffsense-report.md', resultado.report);
    
    // Verificar políticas de qualidade
    if (temBreakingChanges) {
      console.log('⚠️ ALERTA: Mudanças incompatíveis detectadas!');
      
      // Exemplo: Falhar o build se existirem breaking changes sem documentação adequada
      if (!resultado.changes.some(c => c.filePath.includes('CHANGELOG.md'))) {
        console.error('❌ Falha: Breaking changes detectadas sem atualização do CHANGELOG');
        process.exit(1); // Falhar o processo de CI
      }
    }
    
    // Análise de complexidade
    const complexidadeAlta = resultado.changes.filter(c => c.score > 80).length;
    if (complexidadeAlta > 5) {
      console.log('⚠️ ALERTA: Muitas mudanças de alta complexidade detectadas');
    }
    
    console.log('✅ Verificação de mudanças concluída com sucesso');
  } catch (error) {
    console.error('❌ Erro durante análise:', error);
    process.exit(1);
  }
}

verificarMudancas();
```

## Uso em GitHub Actions

Exemplo de como usar o DiffSense em um workflow do GitHub Actions:

```yaml
name: DiffSense Analysis

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install DiffSense
        run: npm install -g @arthurcorreadev/diffsense
      
      - name: Run DiffSense analysis
        run: |
          diffsense analyze \
            --base ${{ github.event.pull_request.base.sha }} \
            --head ${{ github.event.pull_request.head.sha }} \
            --format json > diffsense-report.json
      
      - name: Check for breaking changes
        id: check-breaking
        run: |
          BREAKING_COUNT=$(cat diffsense-report.json | jq '.breakingChanges | length')
          echo "::set-output name=count::$BREAKING_COUNT"
          if [ "$BREAKING_COUNT" -gt 0 ]; then
            echo "::warning::This PR contains $BREAKING_COUNT breaking changes"
          fi
      
      - name: Upload analysis report
        uses: actions/upload-artifact@v3
        with:
          name: diffsense-report
          path: diffsense-report.json
```

## Uso com Hooks Git

Exemplo de como usar DiffSense em um hook pre-commit:

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Executar DiffSense para verificar mudanças
npx diffsense analyze --local --check-breaking

# Se encontrar breaking changes, pedir confirmação
if [ $? -eq 2 ]; then
  echo "⚠️ AVISO: Breaking changes detectadas!"
  echo "Você tem certeza que deseja continuar com o commit? (s/N)"
  read resposta
  
  if [ "$resposta" != "s" ] && [ "$resposta" != "S" ]; then
    echo "Commit cancelado"
    exit 1
  fi
fi

exit 0
```
