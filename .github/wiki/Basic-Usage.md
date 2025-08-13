# Basic Usage

Este guia explica os conceitos básicos e comandos do DiffSense para análise de mudanças de código.

## Comandos Principais

### Análise Básica

O comando `analyze` é o ponto de entrada principal:

```bash
# Analisar diferenças entre duas branches
diffsense analyze --base main --head feature/nova-funcionalidade

# Analisar diferenças entre dois commits
diffsense analyze --base 1a2b3c4d --head 5e6f7g8h

# Analisar diferenças no diretório atual (arquivos não-commitados)
diffsense analyze --local
```

### Formatos de Saída

Você pode obter os resultados em diferentes formatos:

```bash
# Saída padrão no terminal (colorida e formatada)
diffsense analyze --base main --head HEAD

# Saída em JSON
diffsense analyze --base main --head HEAD --format json > analise.json

# Saída em Markdown
diffsense analyze --base main --head HEAD --format markdown > analise.md
```

### Gerando Sugestões de Commit

Para obter sugestões de mensagens de commit:

```bash
# Gerar sugestão de commit baseada nas mudanças
diffsense commit --base main --head HEAD

# Gerar e usar a sugestão automaticamente
diffsense commit --base main --head HEAD --apply
```

## Configuração de Projeto

Para personalizar o comportamento do DiffSense, crie um arquivo `.diffsenserc.json` na raiz do seu projeto:

```json
{
  "rules": {
    "breaking-change": {
      "paths": ["src/api/**/*.ts"],
      "patterns": ["export (interface|class|function|const) [A-Z]"]
    }
  },
  "ignorePatterns": ["*.test.ts", "*.spec.ts", "dist/", "node_modules/"],
  "conventionalCommit": true,
  "outputFormat": "detailed"
}
```

## Exemplos Práticos

### Exemplo 1: Analisar um PR Local

```bash
# Suponha que você está em uma branch de feature e quer analisar as mudanças
git checkout feature/nova-api
diffsense analyze --base develop --head HEAD
```

Saída:

```
📊 DiffSense Analysis Results

Files analyzed: 5
- Modified: 3
- Added: 2
- Deleted: 0

🔍 Change Classifications:

🔴 BREAKING CHANGES (1):
  - src/api/user-service.ts: Changed return type of getUserProfile()

🟢 FEATURES (2):
  - src/api/post-service.ts: Added new exportable function createPost()
  - src/models/post.ts: Added new Post interface

🟡 FIXES (1):
  - src/utils/validation.ts: Fixed email validation regex

💬 Commit Suggestion:
feat(api): add post creation functionality

BREAKING CHANGE: getUserProfile now returns UserDetails instead of User
```

### Exemplo 2: Análise de Impacto em CI

Em um pipeline CI:

```yaml
- name: Run DiffSense Analysis
  run: |
    npm install -g @arthurcorreadev/diffsense
    diffsense analyze --base ${{ github.event.pull_request.base.sha }} --head ${{ github.event.pull_request.head.sha }} --format json > impact.json

- name: Check for Breaking Changes
  run: |
    BREAKING=$(cat impact.json | jq '.breakingChanges | length')
    if [[ $BREAKING -gt 0 ]]; then
      echo "⚠️ Breaking changes detected! Please review carefully."
      exit 1
    fi
```

### Exemplo 3: Análise com Filtros

```bash
# Analisar apenas arquivos JavaScript e TypeScript
diffsense analyze --base main --head HEAD --include "**/*.{js,ts}"

# Excluir arquivos de teste
diffsense analyze --base main --head HEAD --exclude "**/*.{spec,test}.{js,ts}"

# Analisar apenas uma pasta específica
diffsense analyze --base main --head HEAD --include "src/features/**/*"
```

## Integração com Outros Comandos

### Com Git

```bash
# Alias Git para analisar antes de commit
git config --global alias.diffsense '!diffsense analyze --local'

# Uso
git diffsense
```

### Com Husky (Git Hooks)

No arquivo `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx diffsense analyze --local --check-breaking
```

### Uso como Biblioteca

```typescript
import { analyze } from '@arthurcorreadev/diffsense';

async function runAnalysis() {
  const results = await analyze({
    base: 'main',
    head: 'HEAD',
    format: 'json'
  });
  
  console.log(`Found ${results.breakingChanges.length} breaking changes`);
}

runAnalysis();
```
