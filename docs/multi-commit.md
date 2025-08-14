# Múltiplos Commits

Este documento descreve como usar o comando de commit para criar múltiplos commits de diferentes tipos em uma única execução.

## Sintaxe Básica

```bash
pnpm commit --tipo1 "descrição1" --tipo2 "descrição2" [--stop]
```

## Exemplos

```bash
# Commit de feature e fix na mesma execução
pnpm commit --feat "nova API de usuários" --fix "corrige problema de autenticação"

# Commit de múltiplos tipos e encerra
pnpm commit --feat "nova API" --docs "documentação atualizada" --fix "corrige bug" --stop
```

## Como Funciona

O comando processa cada tipo solicitado em sequência, verificando se existem arquivos classificados para cada tipo especificado. Se um tipo não tiver arquivos correspondentes, ele será ignorado com uma mensagem de aviso.

Isso é especialmente útil para:
1. Manter o histórico de commits limpo e organizado
2. Economizar tempo ao fazer múltiplos commits de diferentes tipos
3. Garantir que cada tipo de alteração seja commitado separadamente
