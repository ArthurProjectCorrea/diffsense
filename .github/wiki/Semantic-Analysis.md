# Semantic Analysis

O DiffSense usa análise semântica avançada para entender o verdadeiro significado das alterações de código.

## O que é Análise Semântica?

Análise semântica vai além da simples detecção de linhas adicionadas ou removidas. O DiffSense constrói uma representação abstrata do código (AST - Abstract Syntax Tree) para entender:

- Quais identificadores foram adicionados, alterados ou removidos
- Se uma alteração afeta APIs públicas ou apenas implementações internas
- O impacto potencial de uma alteração em outros módulos
- A natureza da alteração (adição de funcionalidade, correção, refatoração)

## Componentes da Análise Semântica

### 1. Análise de AST (Árvore Sintática Abstrata)

O DiffSense utiliza bibliotecas como `ts-morph` e `@typescript-eslint/typescript-estree` para construir ASTs e analisar:

- Declarações de interfaces e tipos
- Assinaturas de funções e métodos
- Propriedades de classes e objetos
- Modificadores de acesso (public, private, protected)
- Valores padrão e tipos opcionais

### 2. Detecção de Breaking Changes

Detecta automaticamente alterações que quebram compatibilidade:

- Remoção de métodos ou propriedades públicas
- Alteração de tipos de parâmetros ou retornos
- Adição de parâmetros obrigatórios
- Renomeação de identificadores exportados

### 3. Análise de Dependências

Verifica como as mudanças afetam outros arquivos:

- Rastreamento de importações/exportações
- Mapeamento de dependentes (arquivos que importam o código alterado)
- Avaliação do impacto em cascata

### 4. Histórico de Commits

Utiliza histórico do Git para contextualizar mudanças:

- Padrões de alterações anteriores
- Mudanças frequentes vs. estáveis
- Intenção do desenvolvedor baseada em mensagens de commit

## Processo de Análise Semântica

1. **Extração de AST**: Parseia o código para construir a representação abstrata
2. **Comparação de ASTs**: Compara ASTs entre versões para detectar mudanças estruturais
3. **Classificação**: Categoriza as alterações com base em seu impacto semântico
4. **Propagação**: Avalia como as alterações afetam outros módulos
5. **Pontuação**: Atribui pesos às alterações com base no impacto potencial

## Exemplos

### Detecção de Breaking Change

**Antes:**
```typescript
export function processData(input: string): string[] {
  return input.split(',');
}
```

**Depois:**
```typescript
export function processData(input: string, delimiter: string): string[] {
  return input.split(delimiter);
}
```

DiffSense identifica: Adição de parâmetro obrigatório `delimiter` sem valor padrão = **Breaking Change**

### Detecção de Nova Funcionalidade

**Antes:**
```typescript
export class DataProcessor {
  process(data: string): void {
    // processamento
  }
}
```

**Depois:**
```typescript
export class DataProcessor {
  process(data: string): void {
    // processamento
  }
  
  processAsync(data: string): Promise<void> {
    // processamento assíncrono
  }
}
```

DiffSense identifica: Adição de novo método público `processAsync` = **Nova Funcionalidade**

### Detecção de Refatoração Segura

**Antes:**
```typescript
function internalHelper(x: number): number {
  return x * 2;
}

export function calculate(value: number): number {
  return internalHelper(value);
}
```

**Depois:**
```typescript
function enhancedHelper(x: number): number {
  return x * 2; // mesmo comportamento, nome diferente
}

export function calculate(value: number): number {
  return enhancedHelper(value);
}
```

DiffSense identifica: Alteração interna sem impacto na API pública = **Refatoração Segura**

## Configuração da Análise Semântica

A sensibilidade da análise semântica pode ser ajustada no arquivo de configuração:

```json
{
  "semanticAnalysis": {
    "breakingChangeDetection": "strict",
    "privateAPIChanges": "ignore",
    "testFileChanges": "ignore",
    "commentChanges": "minor",
    "thresholds": {
      "minorChange": 5,
      "majorChange": 15
    }
  }
}
```

## Limitações Atuais

- Análise semântica completa para TypeScript e JavaScript
- Análise parcial para Python, Java e C#
- Detecção básica (baseada em regex) para outras linguagens
