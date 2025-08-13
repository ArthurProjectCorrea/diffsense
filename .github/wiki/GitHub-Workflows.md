# GitHub Actions Workflows

O DiffSense utiliza dois workflows principais para gerenciar o ciclo de vida do projeto:

## 1. Pipeline CI/CD (`pipeline.yml`)

Pipeline principal que gerencia validação, testes, análise e publicação do pacote.

### Jobs:

#### `validate`
- Executa em todos os pushes e PRs
- Lint e verificação de tipos
- Testes automatizados
- Build do projeto

#### `analyze`
- Executa apenas em PRs
- Análise DiffSense das mudanças
- Comentários automáticos no PR
- Commits automáticos (com label `auto-commit`)

#### `publish`
- Executa apenas no push para `main`
- Publica o pacote no NPM

## 2. Manutenção (`maintenance.yml`)

Workflow de manutenção automatizada do repositório.

### Jobs:

#### `update-dependencies`
- Atualização automática de dependências
- Executa toda segunda-feira
- Inclui atualizações de segurança
- Cria commits semânticos para mudanças

#### `clean-stale`
- Gerencia issues e PRs inativos
- Marca como stale após 60 dias
- Fecha após 7 dias de inatividade
- Respeita labels de exceção

#### `sync-wiki`
- Sincroniza documentação com wiki
- Mantém documentação atualizada
- Cria commits semânticos

### Execução Manual

Você pode executar tarefas de manutenção manualmente através da interface do GitHub:

1. Acesse "Actions" no repositório
2. Selecione "Repository Maintenance"
3. Clique em "Run workflow"
4. Escolha a tarefa desejada:
   - `dependencies`: Atualiza dependências
   - `stale`: Limpa issues/PRs inativos
   - `wiki`: Sincroniza documentação

## Configuração

Os workflows utilizam as seguintes secrets:

- `NPM_TOKEN`: Para publicação no NPM
- `GITHUB_TOKEN`: Fornecido automaticamente pelo GitHub

## DiffSense Integration

Todos os workflows que geram commits utilizam o comando `workflow` do DiffSense para:

1. Análise semântica de mudanças
2. Geração de mensagens de commit significativas
3. Commits automáticos com contexto apropriado

### Exemplo de Uso em Workflow:

```yaml
- name: Create semantic commit
  run: |
    npm run workflow-commit -- \
      --prefix chore \
      --scope deps \
      --push \
      --message "Update dependencies [automated]"
```
