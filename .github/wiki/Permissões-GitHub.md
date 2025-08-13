# Configuração de Permissões no GitHub

Este documento explica como configurar as permissões necessárias para os workflows do GitHub Actions funcionarem corretamente.

## Permissões Necessárias nos Workflows

Para que todos os workflows funcionem sem problemas, é necessário configurar as permissões adequadas.

### 1. Permissões de Repositório

No seu repositório GitHub, acesse:
`Settings > Actions > General > Workflow permissions`

Configure:
- ✅ **Read and write permissions** - Permite que os workflows modifiquem o repositório
- ✅ **Allow GitHub Actions to create and approve pull requests** - Permite automação de PRs

### 2. Secrets Necessários

No seu repositório GitHub, acesse:
`Settings > Secrets and variables > Actions`

Adicione os seguintes secrets:

| Nome | Descrição | Obrigatório |
|------|-----------|-------------|
| `NPM_TOKEN` | Token para publicação no npm | Sim, para publicação |
| `SONAR_TOKEN` | Token para análises SonarCloud | Não, opcional |
| `CODECOV_TOKEN` | Token para cobertura de código | Não, opcional |

### 3. Configuração do GITHUB_TOKEN

O `GITHUB_TOKEN` é fornecido automaticamente pelo GitHub e já está disponível em todos os workflows. Para workflows que precisam de acesso a outros repositórios ou permissões adicionais, você pode configurar um Personal Access Token (PAT) e adicioná-lo como secret.

#### Permissões do GITHUB_TOKEN

Por padrão, o GITHUB_TOKEN tem as seguintes permissões nos nossos workflows:

- ✅ **Contents**: write - Para commits, tags e releases
- ✅ **Issues**: write - Para gerenciamento de issues
- ✅ **Pull Requests**: write - Para gerenciamento de PRs
- ✅ **Packages**: write - Para publicação de pacotes
- ✅ **Pages**: write - Para deploy de GitHub Pages (se usado)

## Configuração Específica por Workflow

### Workflow de Publicação (publish.yml)

Este workflow requer:
- Acesso de escrita ao conteúdo do repositório (para criar tags)
- Acesso ao token NPM para publicação
- Permissão para criar releases

### Workflow de Dependências (dependencies.yml)

Este workflow requer:
- Permissão para criar branches
- Permissão para criar Pull Requests
- Acesso ao token do GitHub para operações de branch

### Workflow de Análise de Código (codeql.yml)

Este workflow requer:
- Permissão para acessar o conteúdo do repositório
- Permissão para submeter resultados de análise de segurança

### Workflow de Issues (stale.yml)

Este workflow requer:
- Permissão para acessar e modificar issues
- Permissão para adicionar comentários

## Configuração Avançada

### Criação de PAT (Personal Access Token)

Para casos em que o GITHUB_TOKEN padrão não é suficiente:

1. Acesse [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Clique em "Generate new token" > "Generate new token (classic)"
3. Dê um nome descritivo, ex: "DiffSense Workflows"
4. Selecione as permissões necessárias (geralmente `repo`, `workflow`, `packages`)
5. Gere o token e adicione como secret no repositório (ex: `GH_PAT`)

### Uso do PAT em Workflows

```yaml
- name: Checkout repository
  uses: actions/checkout@v3
  with:
    token: ${{ secrets.GH_PAT }}
```

## Segurança e Melhores Práticas

1. **Princípio do privilégio mínimo**: Configure apenas as permissões estritamente necessárias para cada workflow.

2. **Rotação de tokens**: Regenere periodicamente seus tokens, especialmente PATs.

3. **Monitoramento**: Revise regularmente os logs de execução dos workflows para detectar comportamentos anômalos.

4. **Branch protection**: Configure proteções para branches principais (requerimento de aprovação de PR, verificações de status, etc.)

5. **Limites de escopo**: Use ambientes GitHub para controlar onde segredos específicos podem ser usados.

## Solução de Problemas

### Erros comuns de permissão:

1. **resource not accessible by integration**
   - Problema: GITHUB_TOKEN não tem permissões suficientes
   - Solução: Configurar "Read and write permissions" em Workflow Permissions

2. **refusing to allow a GitHub App to create or update workflow**
   - Problema: Tentativa de modificar arquivos de workflow via API
   - Solução: Usar PAT com escopo `workflow`

3. **Resource not accessible by integration**
   - Problema: Tentando acessar outro repositório
   - Solução: Usar PAT com escopo `repo`
