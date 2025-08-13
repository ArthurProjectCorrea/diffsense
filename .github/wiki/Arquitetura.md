# Arquitetura de Referência – DiffSense

Este documento descreve a arquitetura de referência para o framework DiffSense, detalhando o fluxo de dados, os módulos principais e como eles interagem.

```
           ┌───────────────────┐
           │       CLI/API      │
           │  (User Interface)  │
           └───────┬───────────┘
                   │
                   ▼
        ┌───────────────────────┐
        │   Change Detector      │
        │ (simple-git / FS diff) │
        └─────────┬─────────────┘
                  │
                  ▼
        ┌────────────────────────────┐
        │   Context Correlator        │
        │ (Relaciona arquivos e       │
        │  dependências afetadas)     │
        └─────────┬──────────────────┘
                  │
                  ▼
        ┌────────────────────────────┐
        │  Semantic Analyzer          │
        │  (AST Parsing com ts-morph, │
        │   heurísticas, histórico)   │
        └─────────┬──────────────────┘
                  │
                  ▼
        ┌────────────────────────────┐
        │     Rules Engine            │
        │  (Classificação por tipo    │
        │   e escopo, YAML rules)     │
        └─────────┬──────────────────┘
                  │
                  ▼
        ┌────────────────────────────┐
        │     Impact Scoring          │
        │ (Avalia severidade:         │
        │  breaking / feat / fix)     │
        └─────────┬──────────────────┘
                  │
                  ▼
        ┌────────────────────────────┐
        │     Reporter / Committer    │
        │ (Gera relatório, commits    │
        │  automáticos ou sugestões)  │
        └────────────────────────────┘
```

## 1. CLI / API Layer

**Função**: Interface para rodar o framework via terminal ou como biblioteca Node.

**Responsabilidades**:
- Interpretar parâmetros (`--base`, `--head`, `--format=json`).
- Expor métodos da API (`runAnalysis()`, `getReport()`).

**Tecnologias**: `commander`, `yargs` ou `oclif`.

## 2. Change Detector

**Função**: Captura todos os arquivos modificados entre duas refs do Git.

**Responsabilidades**:
- Usar `simple-git` ou `isomorphic-git` para obter diffs.
- Classificar em **added**, **modified**, **deleted**, **renamed**.

**Saída**: Lista bruta de arquivos modificados com metadados.

## 3. Context Correlator

**Função**: Entender o contexto dos arquivos.

**Responsabilidades**:
- Mapear dependências usando `ts-morph` ou AST para saber o que é importado/exportado.
- Descobrir arquivos relacionados (DTOs, testes, configs).
- Entender escopo do monorepo (projeto X, Y, Z).

**Saída**: Pacote de informações enriquecidas para cada arquivo.

## 4. Semantic Analyzer

**Função**: Analisar significado da modificação.

**Responsabilidades**:
- AST diff para saber se algo público foi alterado.
- Detecção de breaking changes (remoção de método exportado, mudança de tipo).
- Identificar refactors, novos recursos, correções.

**Tecnologias**: `ts-morph`, `@typescript-eslint/typescript-estree`.

## 5. Rules Engine

**Função**: Aplicar regras configuráveis.

**Responsabilidades**:
- Interpretar regras de `default-rules.yaml`.
- Usar match por path, extensão, ou padrões AST.
- Suporte a regras customizadas do usuário.

**Formato**: YAML ou JSON.

## 6. Impact Scoring

**Função**: Classificar severidade e prioridade.

**Responsabilidades**:
- Basear score em:
  - Número de arquivos afetados.
  - Nível de propagação da mudança.
  - Peso das regras aplicadas.
- Decidir se é `breaking`, `feat`, `fix`, `chore`, etc.

## 7. Reporter / Committer

**Função**: Produzir resultados consumíveis.

**Responsabilidades**:
- Formatos: JSON, Markdown, CLI output.
- Gerar commit automático ou sugestão de commit semântico.
- Enviar para pipelines CI/CD se necessário.

## Fluxo Resumido

1. **CLI** recebe parâmetros →
2. **Change Detector** pega diffs →
3. **Context Correlator** adiciona informações de impacto →
4. **Semantic Analyzer** interpreta significado →
5. **Rules Engine** aplica padrões →
6. **Impact Scoring** mede severidade →
7. **Reporter/Committer** entrega resultado.
