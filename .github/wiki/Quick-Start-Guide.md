# Quick Start Guide

Este guia rápido ajudará você a começar a usar o DiffSense em seu projeto.

## Instalação

```bash
# Instalação global
npm install -g @arthurcorreadev/diffsense

# Instalação local
npm install --save-dev @arthurcorreadev/diffsense
```

## Uso Básico

O DiffSense pode ser usado para analisar diferenças entre duas referências Git:

```bash
# Analisar diferenças entre o HEAD atual e a branch main
diffsense analyze --base main --head HEAD

# Gerar um relatório em formato JSON
diffsense analyze --base main --head HEAD --format json > report.json

# Gerar sugestões de commit semântico
diffsense commit --base main --head HEAD
```

## Integração com Git Hooks

Para usar o DiffSense como um hook pre-commit no Git:

1. Instale o husky:

```bash
npm install --save-dev husky
npm pkg set scripts.prepare="husky install"
npm run prepare
```

2. Crie um hook pre-commit:

```bash
npx husky add .husky/pre-commit "npx diffsense validate"
git add .husky/pre-commit
```

## Configuração Básica

Crie um arquivo `.diffsenserc.json` na raiz do seu projeto:

```json
{
  "rules": {
    "breaking-change": {
      "paths": ["src/api/**/*.ts"],
      "patterns": ["export (interface|class|function|const) [A-Z]"]
    },
    "feature": {
      "paths": ["src/**/*.ts"],
      "patterns": ["export", "public"]
    },
    "documentation": {
      "paths": ["docs/**/*.md", "**/*.md"],
      "patterns": []
    }
  }
}
```

## Próximos Passos

- Explore a [Arquitetura](Arquitetura) para entender os componentes internos
- Aprenda como [Publicar](Publicação) novas versões
- Configure [Secrets](Configuração-de-Secrets) para integração contínua
