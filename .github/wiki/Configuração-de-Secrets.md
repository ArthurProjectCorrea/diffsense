# Configuração de Secrets no GitHub

Este guia explica como configurar os secrets necessários no GitHub para os workflows do DiffSense funcionarem corretamente.

## Secrets Necessários

Os seguintes secrets são necessários para os workflows do GitHub Actions:

1. **GH_TOKEN** - Token do GitHub para automação de workflows
2. **NPM_TOKEN** - Token do NPM para publicação de pacotes
3. **SONAR_TOKEN** - Token para análises SonarCloud (opcional)
4. **CODECOV_TOKEN** - Token para relatórios de cobertura de código (opcional)

## Passos para Configuração

### 1. Criar o GitHub Personal Access Token (GH_TOKEN)

1. Acesse [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Clique em "Generate new token" > "Generate new token (classic)"
3. Nome: `DiffSense GitHub Actions`
4. Expiração: Escolha uma data (recomendado 90 dias)
5. Selecione as seguintes permissões:
   - `repo` (todas)
   - `workflow`
   - `write:packages`
   - `delete:packages` (opcional)
6. Clique em "Generate token"
7. **IMPORTANTE**: Copie o token gerado - ele não será mostrado novamente!

### 2. Criar o NPM Token (NPM_TOKEN)

1. Acesse [npmjs.com](https://www.npmjs.com/)
2. Clique no seu avatar > "Access Tokens"
3. Clique em "Generate New Token"
4. Token Type: "Automation"
5. Copie o token gerado

### 3. Criar o SonarCloud Token (SONAR_TOKEN) - Opcional

1. Acesse [SonarCloud](https://sonarcloud.io/)
2. Vá para "My Account" > "Security"
3. Gere um novo token e copie-o

### 4. Criar o Codecov Token (CODECOV_TOKEN) - Opcional

1. Acesse [Codecov](https://codecov.io/)
2. Selecione seu repositório
3. Vá para "Settings" > "Repository Upload Token"
4. Copie o token gerado

## Adicionar Secrets ao Repositório GitHub

1. No GitHub, acesse seu repositório DiffSense
2. Vá para "Settings" > "Secrets and variables" > "Actions"
3. Clique em "New repository secret"
4. Adicione cada um dos secrets:

   | Nome | Valor |
   |------|-------|
   | GH_TOKEN | [seu token do GitHub] |
   | NPM_TOKEN | [seu token do NPM] |
   | SONAR_TOKEN | [seu token do SonarCloud] |
   | CODECOV_TOKEN | [seu token do Codecov] |

5. Clique em "Add secret" para cada um

## Verificação

Após configurar todos os secrets, você pode verificar se eles estão funcionando corretamente:

1. Vá para a aba "Actions" no seu repositório
2. Execute manualmente o workflow "CI" usando o botão "Run workflow"
3. Verifique se o workflow é concluído sem erros relacionados a secrets

## Nota de Segurança

Nunca compartilhe ou exponha seus tokens. O arquivo `.env` com seus tokens já está no `.gitignore` para evitar que seja acidentalmente commitado para o repositório.
