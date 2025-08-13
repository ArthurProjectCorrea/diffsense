# DiffSense

Intelligent framework for code change analysis and automatic semantic commits.

[![npm version](https://badge.fury.io/js/diffsense.svg)](https://www.npmjs.com/package/diffsense)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

DiffSense is a framework for semantic analysis of source code changes, capable of:

- Detecting changes between commits or branches
- Semantically analyzing code through AST (Abstract Syntax Tree)
- Classifying changes based on configurable rules
- Evaluating impact and severity of changes
- Generating semantic commit suggestions automatically
- Identifying breaking changes, new features, fixes and more
- Grouping commits by semantic type

> **Note:** All documentation for this project is maintained in the [GitHub Wiki](https://github.com/ArthurProjectCorrea/DiffSense/wiki). Please refer to the wiki for comprehensive guides and documentation.

## Installation

```bash
# Global installation
npm install -g @arthurcorreadev/diffsense

# Local installation as a development dependency
npm install --save-dev @arthurcorreadev/diffsense

# Using Yarn
yarn add @arthurcorreadev/diffsense --dev

# Using pnpm
pnpm add -D @arthurcorreadev/diffsense
```

## Usage

### Command Line Interface (CLI)

```bash
# Get detailed help
diffsense help

# Analyze changes in current branch compared to main
diffsense run

# Analyze changes between specific branches/commits
diffsense run --base origin/main --head feature/new-feature

# Generate report in JSON format
diffsense run --format json > report.json

# Gera relatório detalhado em formato Markdown
diffsense run --format markdown --verbose > changes.md

# Comita alterações agrupadas por tipo semântico (interface interativa)
diffsense commit

# Comita alterações usando interface simplificada
diffsense commit --simple

# Apenas visualiza as alterações sem commitar
diffsense commit --show-only

# Sugere mensagem de commit para mudanças staged
diffsense suggest --staged

# Sugere commit baseado em alterações entre commits específicos
diffsense suggest --from HEAD~3 --to HEAD

# Commit automático para pipelines CI/CD
diffsense workflow --push

# Commit automático com prefixo e escopo personalizado
diffsense workflow --prefix feat --scope api --push

# Inicializa configuração padrão
diffsense config --init

# Mostra configuração atual
diffsense config --show
```

### Através dos scripts NPM

O DiffSense também pode ser executado através dos scripts definidos no package.json:

```bash
# Analisa alterações
npm run analyze

# Commit por tipo semântico (interface interativa)
npm run commit-by-type

# Commit por tipo semântico (interface simplificada) 
npm run commit

# Apenas sugere mensagem de commit
npm run suggest-commit

# Commit automático para workflows CI/CD
npm run workflow-commit -- --push
```

### As a Library

```typescript
import { runAnalysis } from '@arthurcorreadev/diffsense';

async function analyzeChanges() {
  const result = await runAnalysis('main', 'HEAD', {
    format: 'markdown',
    configPath: './my-rules.yaml'
  });
  
  console.log(result.report);
  
  // Access commit suggestion
  if (result.suggestedCommit) {
    const { type, scope, subject, breaking, body } = result.suggestedCommit;
    console.log(`Commit suggestion: ${type}${scope ? `(${scope})` : ''}${breaking ? '!' : ''}: ${subject}`);
  }
}

analyzeChanges();
```

## Configuration

DiffSense uses YAML configuration files to define analysis rules. You can create a `.diffsenserc.yaml` file in the root of your project:

```yaml
# Rules for change classification
rules:
  - id: tests
    match: "**/*.{spec,test}.{ts,js}"
    type: test
    reason: "Test file"
    
  - id: docs
    match: "**/*.md"
    type: docs
    reason: "Documentation file"
    
  - id: public-api-remove
    match_ast: "exported.interface.* removedProperty"
    type: breaking
    reason: "Public property removed"
    
  - id: dto-change
    match_path: "src/api/contracts/**"
    heuristics:
      - if: "semantic.delta.containsDtoPropertyRemoved"
        set: breaking
      - if: "semantic.delta.containsDtoAddedOptional"
        set: feat
```

## Processing Flow

DiffSense follows a well-defined processing flow:

1. **ChangeDetector**: Identifies changed files between two git references
2. **ContextCorrelator**: Adds context to changes (dependencies, related files)
3. **SemanticAnalyzer**: Analyzes the meaning of changes through AST
4. **RulesEngine**: Applies rules to classify changes
5. **ScoringSystem**: Scores changes by importance and impact
6. **Reporter**: Generates reports and commit suggestions

For complete details on the architecture, see the [Architecture](https://github.com/ArthurProjectCorrea/diffsense/wiki/Arquitetura) documentation in our Wiki.

## Development

```bash
# Clone the repository
git clone https://github.com/ArthurProjectCorrea/diffsense.git
cd diffsense

# Install dependencies
npm install

# Run in development mode
npm run dev

# Compile the code
npm run build

# Run tests
npm test

# Analyze uncommitted files
npm run analyze

# Configure tokens for GitHub Actions workflows
npm run setup-tokens
npm run setup-github-secrets

# Commit changes grouped by type (feat, fix, docs, etc.)
npm run commit
```

## Additional Features

### Commit by Type

DiffSense offers functionality to group and commit changes by their semantic type:

```bash
# Using the version with improved interface (recommended)
npm run commit

# Using the version with full DiffSense integration
npm run commit-by-type
```

This feature:

1. Analyzes uncommitted changes with a friendly interface
2. Classifies files automatically by semantic type:
   - `feat`: New features and implementations
   - `fix`: Bug fixes and issue resolutions
   - `docs`: Documentation and comments
   - `test`: Unit and integration tests
   - `chore`: Configurations, dependencies, and support files
   - `style`: Style files (CSS, SCSS)
3. Creates separate commits for each category with semantic messages

The interface includes visual progress bars and a simplified flow for a more pleasant development experience. This maintains a cleaner, semantic, and organized commit history, facilitating code review and changelog generation.

## Requirements

- Node.js >=18.0.0
- Git installed and available in PATH

## Documentation

Complete project documentation is available in the [GitHub Wiki](https://github.com/ArthurProjectCorrea/diffsense/wiki).

- [Quick Start Guide](https://github.com/ArthurProjectCorrea/diffsense/wiki/Quick-Start-Guide)
- [Installation](https://github.com/ArthurProjectCorrea/diffsense/wiki/Installation)
- [API Integration](https://github.com/ArthurProjectCorrea/diffsense/wiki/API-Integration)
- [Custom Rules](https://github.com/ArthurProjectCorrea/diffsense/wiki/Custom-Rules)
- [CI/CD Integration](https://github.com/ArthurProjectCorrea/diffsense/wiki/CI-CD-Integration)

## Configuração e Tokens

O DiffSense utiliza diversos serviços para automação de CI/CD, publicação de pacotes e atualização de dependências, que requerem tokens de acesso:

### Configuração de Tokens Locais

```bash
# Configurar tokens de ambiente interativamente
npm run setup-tokens

# OU

# Editar manualmente o arquivo .env
# (Use .env.example como modelo)
```

### Configuração de Secrets no GitHub

Para que os workflows do GitHub Actions funcionem corretamente, você precisa configurar os secrets:

```bash
# Configurar secrets do GitHub a partir dos tokens locais
npm run setup-github-secrets
```

Ou configurar manualmente no GitHub:
1. Acesse seu repositório > Settings > Secrets and variables > Actions
2. Adicione os secrets necessários (`NPM_TOKEN`, `SONAR_TOKEN`, `CODECOV_TOKEN`)

Para mais detalhes, consulte:
- [Configuração de Secrets](https://github.com/ArthurProjectCorrea/diffsense/wiki/Configuração-de-Secrets)
- [Secret Configuration](https://github.com/ArthurProjectCorrea/diffsense/wiki/Secret-Configuration)

## Contribution and Publishing

### Contributing to the project

```bash
# Fork and clone the repository
git clone https://github.com/your-username/diffsense.git
cd diffsense

# Install dependencies
npm install

# Configure tokens for development
npm run setup-tokens

# Create branch for your feature
git checkout -b feature/new-functionality

# Implement changes and test
npm test

# Submit pull request
```

### Publishing to npm

If you are a project maintainer, follow these steps for publication:

```bash
# Test local package installation
npm run test:install

# Publish a new version (automatically updates version and creates git tags)
npm version patch  # For bug fixes (x.x.X)
npm version minor  # For new features (x.X.x)
npm version major  # For breaking changes (X.x.x)

# Publish to npm
npm publish
```

## Documentation

For complete documentation, please refer to our [GitHub Wiki](https://github.com/ArthurProjectCorrea/DiffSense/wiki).

### Key Documentation Sections:
- [Quick Start Guide](https://github.com/ArthurProjectCorrea/DiffSense/wiki/Quick-Start-Guide)
- [Installation](https://github.com/ArthurProjectCorrea/DiffSense/wiki/Installation)
- [Custom Rules](https://github.com/ArthurProjectCorrea/DiffSense/wiki/Custom-Rules)
- [Semantic Commits](https://github.com/ArthurProjectCorrea/DiffSense/wiki/Semantic-Commits)
- [Development Setup](https://github.com/ArthurProjectCorrea/DiffSense/wiki/Development-Setup)

## License

MIT
