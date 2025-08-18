# Modo Auto-Complete do DiffSense

O modo Auto-Complete do DiffSense permite realizar commits automaticamente com descrições predefinidas baseadas na análise semântica das alterações detectadas.

## Uso

```bash
pnpm commit --autoComplete
# ou
pnpm commit -ac
```

## Funcionamento

Quando o modo Auto-Complete está ativado, o DiffSense:

1. Analisa semanticamente todas as alterações no repositório
2. Classifica os arquivos por tipo de alteração (`feat`, `fix`, `docs`, etc.)
3. Separa arquivos normais dos que contêm breaking changes
4. Gera descrições automáticas para cada grupo de alterações
5. Realiza commits separados para cada tipo, mantendo a organização

## Descrições Automáticas

### Commits Normais

| Tipo      | Descrição Automática                   |
|-----------|---------------------------------------|
| `feat`    | adiciona nova funcionalidade          |
| `fix`     | corrige problemas                     |
| `docs`    | atualiza documentação                 |
| `refactor`| melhora a estrutura do código         |
| `test`    | adiciona ou atualiza testes           |
| `chore`   | atualiza configurações e dependências |

### Breaking Changes

Para alterações identificadas como breaking changes, o sistema:

1. Usa o formato `tipo!: descrição` para o título do commit
2. Adiciona uma seção `BREAKING CHANGE: detalhes` no corpo do commit
3. Tenta extrair a razão específica do breaking change da análise

Descrições automáticas para breaking changes:

| Tipo      | Descrição do Breaking Change                               |
|-----------|-----------------------------------------------------------|
| `feat`    | altera API de forma incompatível com versões anteriores    |
| `fix`     | corrige bug de forma incompatível com versões anteriores   |
| `refactor`| altera a estrutura do código de forma incompatível         |
| `docs`    | atualiza documentação com mudanças incompatíveis           |
| `test`    | altera testes para refletir mudanças incompatíveis         |
| `chore`   | atualiza configurações com mudanças incompatíveis          |

## Exemplo de Saída

```
📦 Tipos de alteração normais: feat, fix
📦 Tipos de alteração com breaking changes: refactor

🔖 Processando alterações normais do tipo: feat - Nova funcionalidade
2 arquivos classificados como "feat"
Usando descrição automática: "adiciona nova funcionalidade"
✅ Commit realizado: feat: adiciona nova funcionalidade

🔖 Processando alterações normais do tipo: fix - Correção de bug
1 arquivo classificado como "fix"
Usando descrição automática: "corrige problemas"
✅ Commit realizado: fix: corrige problemas

⚠️ Processando alterações BREAKING CHANGE do tipo: refactor - Refatoração de código
1 arquivo classificado como "refactor" com breaking changes
Usando descrição automática: "melhora a estrutura do código"
Descrição do breaking change: "Removeu ou modificou API pública"
✅ Commit com breaking change realizado: refactor!: melhora a estrutura do código
```

## Quando Usar

O modo Auto-Complete é útil quando:

- Você precisa fazer commits rapidamente sem interação manual
- O projeto tem fluxos de CI/CD que dependem de commits semânticos
- Você está trabalhando em uma grande refatoração com muitos arquivos
- Você quer garantir que breaking changes sejam corretamente identificados e marcados

## Limitações

- As descrições automáticas são genéricas e podem não capturar nuances específicas das alterações
- Para commits com mensagens mais personalizadas, use o modo interativo padrão
