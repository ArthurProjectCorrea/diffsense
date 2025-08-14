# Commit Semântico com DiffSense

O DiffSense agora oferece uma funcionalidade avançada para geração automática de commits semânticos baseados em análise inteligente das mudanças de código.

## Funcionalidades Implementadas

1. **Análise automática de mudanças de código** - DiffSense analisa semanticamente as alterações para entender o tipo, escopo e impacto das mudanças.

2. **Geração de commits semânticos** - Com base na análise, gera automaticamente mensagens de commit que seguem a convenção do [Conventional Commits](https://www.conventionalcommits.org/).

3. **Detecção de breaking changes** - Identifica automaticamente mudanças que podem quebrar compatibilidade e marca os commits adequadamente.

4. **Integração com GitHub Actions** - Workflows para análise automática de PRs e commits.

## Uso Local

### Sugerir Mensagem de Commit

```bash
# Analisar mudanças entre o commit atual e o anterior
npm run suggest-commit

# Analisar mudanças em stage
npm run suggest-commit -- --staged

# Analisar mudanças em relação a uma branch específica
npm run suggest-commit -- --branch main

# Analisar mudanças entre commits específicos
npm run suggest-commit -- --from <commit-sha> --to <commit-sha>
```

### Criar Commit Diretamente

```bash
# Utilizar a análise semântica para criar um commit diretamente
npm run commit
```

## Uso em Workflows CI/CD

O DiffSense está integrado ao pipeline CI/CD do projeto através de dois workflows principais:

### 1. Análise de PRs

O workflow `diffsense-commits.yml` é executado automaticamente quando um PR é aberto ou atualizado:

- Analisa as mudanças no PR
- Comenta no PR com um resumo da análise e uma sugestão de mensagem de commit semântico
- Destaca mudanças de alto impacto e breaking changes

### 2. Geração de Commits Semânticos

O workflow `ci.yml` inclui um job `semantic-commit` que:

- Usa DiffSense para analisar as mudanças entre commits
- Gera automaticamente uma mensagem de commit semântico baseada na análise
- Cria um novo commit com a mensagem gerada (quando apropriado)

## Exemplos de Commits Gerados

```
feat(core): Adicionar sistema de análise semântica para expressões regulares

fix(cli): Corrigir bug na detecção de argumentos com espaços

docs(wiki): Atualizar documentação de uso da API

refactor(analyzer): Melhorar desempenho da análise de dependências

feat(api)!: BREAKING CHANGE: Alterar formato de retorno da API de análise
```

## Configuração Personalizada

Para personalizar o comportamento da geração de commits, você pode ajustar os thresholds no arquivo `scripts/suggest-commit.js`:

```javascript
// Exemplo: Configurar threshold para breaking changes
const breakingChanges = changes.filter(c => c.impactScore > 0.8);
```

## Considerações de Segurança

- O DiffSense não cria commits automaticamente em ambientes de produção sem aprovação
- Todos os commits gerados automaticamente são claramente identificados como tal
- Breaking changes são sempre destacados para revisão manual
