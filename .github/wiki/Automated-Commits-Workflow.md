# Automated Commits em CI/CD com DiffSense

O DiffSense oferece funcionalidades especializadas para automação de commits em ambientes CI/CD, permitindo análise semântica e geração automática de mensagens de commit. Esta documentação foi atualizada para refletir as melhorias mais recentes nos workflows automatizados.

O DiffSense oferece funcionalidades especializadas para automação de commits em ambientes CI/CD, permitindo análise semântica de mudanças e geração de mensagens de commit significativas sem interação do usuário.

## Comando `workflow`

O DiffSense inclui um comando especial `workflow` projetado para pipelines CI/CD e outros ambientes automatizados:

```bash
diffsense workflow [options]
```

### Opções

| Opção | Descrição |
|-------|-----------|
| `--base <ref>` | Branch/commit base para comparação (default: "main") |
| `--head <ref>` | Branch/commit alvo para comparação (default: "HEAD") |
| `--prefix <prefix>` | Prefixo para a mensagem de commit (opcional) |
| `--scope <scope>` | Escopo para a mensagem de commit (opcional) |
| `--no-add` | Não adicionar arquivos automaticamente (git add .) |
| `--push` | Realizar push após o commit |

## Exemplos de Uso

### Em GitHub Actions

```yaml
name: Auto Commit Workflow

on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:

jobs:
  auto-commit:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build DiffSense
        run: npm run build
      
      - name: Configurar Git
        run: |
          git config --global user.name "DiffSense Bot"
          git config --global user.email "bot@diffsense.com"
      
      - name: Analisar e criar commit automático
        run: npm run workflow-commit -- --base ${{ github.event.pull_request.base.ref || 'main' }} --scope ci --push
```

### Em GitLab CI

```yaml
auto-commit:
  stage: analyze
  image: node:18
  script:
    - npm ci
    - npm run build
    - git config --global user.name "DiffSense Bot"
    - git config --global user.email "bot@diffsense.com"
    - npm run workflow-commit -- --base $CI_MERGE_REQUEST_DIFF_BASE_SHA --scope ci
```

### Em Jenkins

```groovy
stage('Auto Commit') {
    steps {
        sh 'npm ci'
        sh 'npm run build'
        sh 'git config --global user.name "DiffSense Bot"'
        sh 'git config --global user.email "bot@diffsense.com"'
        sh 'npm run workflow-commit -- --scope ci'
    }
}
```

## Casos de Uso

### 1. Sincronização de Wiki

O comando `workflow` pode automatizar commits durante processos de sincronização de wiki, gerando mensagens semânticas baseadas no tipo de alteração:

```yaml
- name: Analisar e commitar alterações na wiki
  run: |
    cd wiki
    git config user.name "Wiki Bot"
    git config user.email "wiki@example.com"
    npm run workflow-commit -- --prefix docs --scope wiki
```

### 2. Formatação Automática de Código

Integre o comando em pipelines que executam formatadores de código:

```yaml
- name: Format code
  run: npm run lint:fix
  
- name: Commit formatting changes
  run: npm run workflow-commit -- --prefix style --scope format
```

### 3. Atualização de Dependências

Automatize commits para atualizações de dependências:

```yaml
- name: Update dependencies
  run: npm update

- name: Commit dependency updates
  run: npm run workflow-commit -- --prefix chore --scope deps
```

### 4. Geração de Assets

Comite automaticamente arquivos gerados:

```yaml
- name: Generate assets
  run: npm run build:assets
  
- name: Commit generated assets
  run: npm run workflow-commit -- --prefix build --scope assets
```

## Workflows Integrados

O DiffSense inclui três workflows principais que utilizam commits automáticos:

### 1. DiffSense Commit Analyzer
- Analisa Pull Requests automaticamente
- Sugere mensagens de commit semânticas
- Pode realizar commits automáticos quando a label `auto-commit` está presente
- Arquivo: `.github/workflows/diffsense-commits.yml`

### 2. Wiki Sync
- Sincroniza documentação entre o repositório e a wiki
- Gera commits semânticos para mudanças na documentação
- Suporta documentação multilíngue
- Arquivo: `.github/workflows/diffsense-wiki-sync.yml`

### 3. Dependency Management
- Atualiza dependências automaticamente
- Executa testes após atualizações
- Cria commits semânticos para mudanças em dependências
- Arquivo: `.github/workflows/diffsense-dependencies.yml`

## Vantagens sobre Commit Manual

O comando `workflow` oferece vantagens significativas sobre comandos git manuais em ambientes CI/CD:

1. **Análise Semântica**: Analisa mudanças para entender seu significado e impacto
2. **Classificação Inteligente**: Categoriza alterações por tipo (feature, fix, etc.)
3. **Contexto Adequado**: Gera mensagens de commit que refletem o real significado das mudanças
4. **Convenções Consistentes**: Segue as convenções de commits semânticos automaticamente
5. **Automação Completa**: Não requer interação humana
6. **Histórico Significativo**: Melhora a qualidade do histórico de commits

## Configuração Personalizada

O comportamento do comando `workflow` pode ser personalizado através do arquivo `.diffsenserc.yaml`:

```yaml
# Configuração para o comando workflow
workflow:
  # Configurações de commit
  commit:
    # Prefixos padrão por tipo de arquivo
    prefixes:
      '**/*.md': docs
      '**/*.test.{js,ts}': test
      'package*.json': chore
    
    # Escopos padrão por diretório
    scopes:
      'src/api/': api
      'docs/': docs
      '.github/': github
      'tests/': test
    
    # Mensagem padrão quando não há análise semântica disponível
    defaultMessage: "atualiza arquivos do projeto"
```
