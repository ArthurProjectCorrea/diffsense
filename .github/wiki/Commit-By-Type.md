# Commit By Type

O DiffSense oferece funcionalidades avançadas para classificar e agrupar commits de acordo com o tipo de alteração. Este guia explica como usar essas funcionalidades.

## Visão Geral

A funcionalidade "Commit By Type" analisa as alterações de código e as organiza em categorias semânticas, seguindo o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- **feat**: Novas funcionalidades
- **fix**: Correções de bugs
- **docs**: Alterações em documentação
- **style**: Alterações de formatação que não afetam o código
- **refactor**: Refatorações de código
- **perf**: Melhorias de performance
- **test**: Adição ou correção de testes
- **build**: Alterações no sistema de build
- **ci**: Alterações na configuração de CI
- **chore**: Outras alterações

## Comandos Básicos

### Análise e Agrupamento

```bash
# Agrupar alterações por tipo
diffsense group --base main --head feature/my-feature

# Gerar múltiplos commits, um por tipo
diffsense commit-by-type --base main --head feature/my-feature

# Usar o comando pnpm para commits organizados por tipo
pnpm commit
```

### Gerando Commits Automáticos

```bash
# Analisar e criar commits separados automaticamente
diffsense auto-commit --base main --head HEAD

# Visualizar o que seria feito sem realmente commitar
diffsense auto-commit --base main --head HEAD --dry-run
```

## Exemplo Prático

Suponha que você tenha feito diversas alterações em sua branch de feature:

- Adicionou uma nova API endpoint
- Corrigiu um bug de validação
- Atualizou a documentação
- Refatorou código legado

Com um único comando, você pode organizar essas alterações em commits semânticos:

```bash
diffsense commit-by-type --base main --head HEAD --apply
```

Isso resultaria em uma série de commits como:

```
feat: add new user profile API endpoint
fix: correct email validation pattern
docs: update API documentation with new endpoints
refactor: simplify authentication workflow
```

## Configuração Avançada

Você pode personalizar o comportamento em `.diffsenserc.json`:

```json
{
  "commitByType": {
    "enabled": true,
    "templates": {
      "feat": "feat({{scope}}): {{message}}",
      "fix": "fix({{scope}}): {{message}}",
      "docs": "docs: {{message}}",
      "custom": "custom-prefix: {{message}}"
    },
    "scopeDetection": "file-path",
    "customTypes": [
      {
        "name": "security",
        "pattern": ["auth", "password", "crypt", "token"]
      }
    ]
  }
}
```

## Usando o Comando pnpm commit

O DiffSense oferece um comando `pnpm commit` que simplifica o processo de criação de commits organizados por tipo. Este comando:

1. Analisa todas as alterações pendentes no repositório
2. Classifica os arquivos por tipo (feat, fix, docs, etc.)
3. Para cada tipo de alteração, solicita uma mensagem de commit
4. Cria commits separados para cada tipo usando a flag `--only` do Git

### Como usar

```bash
# Execute no diretório raiz do projeto
pnpm commit
```

O comando irá guiá-lo através de um processo interativo:

1. Primeiro, ele analisará suas alterações e mostrará quais arquivos foram classificados em cada tipo
2. Em seguida, solicitará uma mensagem descritiva para cada tipo de alteração
3. Finalmente, criará commits separados para cada tipo, incluindo apenas os arquivos relevantes em cada commit

### Exemplo de fluxo

```
$ pnpm commit

⚠️ ATENÇÃO ⚠️

Cada tipo de alteração será commitado separadamente.
Você fornecerá uma descrição para cada tipo de alteração.
Arquivos serão adicionados ao Git de acordo com sua classificação.

? Informe a descrição das modificações feat (2 arquivos) (max 100 caracteres): adicionar nova API de usuários
? Informe a descrição das modificações fix (1 arquivo) (max 100 caracteres): corrigir validação de email
? Informe a descrição das modificações docs (3 arquivos) (max 100 caracteres): atualizar documentação da API

✅ Commit realizado: feat: adicionar nova API de usuários
✅ Commit realizado: fix: corrigir validação de email
✅ Commit realizado: docs: atualizar documentação da API

3 commits realizados com sucesso!
```

### Opções avançadas

Para casos específicos, você pode usar opções adicionais:

```bash
# Usar referências específicas para comparação
pnpm commit -- -b main -h HEAD

# Ativar modo de depuração para solução de problemas
pnpm commit -- -d
```

## Integração com Git Hooks

Para usar com husky, adicione ao arquivo `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Oferece sugestão de commits por tipo
npx diffsense group --local --suggest
```

## Estratégias de Uso

### Desenvolvimento em Equipe

Em equipes, a abordagem "commit-by-type" ajuda a:

1. Manter histórico de commits mais organizado e significativo
2. Facilitar revisões de código focadas por tipo de alteração
3. Gerar changelogs automaticamente
4. Melhorar rastreabilidade de alterações

### Durante Refatorações Grandes

Durante refatorações grandes:

```bash
# Trabalhe normalmente, sem preocupação com organização de commits
git add .

# No final, organize automaticamente
diffsense auto-commit --local --scope project
```

### Em Integração Contínua

Em pipelines CI/CD:

```yaml
# Em .github/workflows/semantic-pr.yml
name: Semantic PR

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install DiffSense
        run: npm install -g @arthurcorreadev/diffsense
      
      - name: Analyze PR by type
        run: |
          diffsense group \
            --base ${{ github.event.pull_request.base.sha }} \
            --head ${{ github.event.pull_request.head.sha }} \
            --format json > type-analysis.json
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const analysis = JSON.parse(fs.readFileSync('type-analysis.json', 'utf8'));
            
            let comment = '## 🔍 Change Type Analysis\n\n';
            
            for (const type in analysis.types) {
              const changes = analysis.types[type];
              if (changes.length > 0) {
                comment += `### ${getEmoji(type)} ${type} (${changes.length})\n\n`;
                changes.slice(0, 5).forEach(change => {
                  comment += `- \`${change.file}\`: ${change.description}\n`;
                });
                if (changes.length > 5) {
                  comment += `- _... and ${changes.length - 5} more_\n`;
                }
                comment += '\n';
              }
            }
            
            function getEmoji(type) {
              const map = {
                feat: '✨',
                fix: '🐛',
                docs: '📝',
                style: '💄',
                refactor: '♻️',
                perf: '⚡️',
                test: '✅',
                build: '🔧',
                ci: '👷',
                chore: '🔨'
              };
              return map[type] || '🔍';
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## Dicas de Uso Eficiente

1. **Commits Frequentes**: Faça commits pequenos e frequentes sem se preocupar com a mensagem
2. **Organização Final**: Use `diffsense auto-commit` no final para organizar tudo
3. **Escopos Consistentes**: Use escopos (ex: `feat(auth):`) para agrupar alterações relacionadas
4. **Changelogs**: Gere changelogs facilmente com `diffsense changelog --since last-tag`
