# Custom Rules

O DiffSense permite a criação de regras personalizadas para classificar mudanças de código de acordo com suas necessidades específicas.

## Estrutura de Regras

As regras são definidas em um arquivo de configuração (`.diffsenserc.json` ou `.diffsenserc.yml`) na raiz do projeto:

```json
{
  "rules": {
    "breaking-change": {
      "paths": ["src/api/**/*.ts", "src/public/**/*.ts"],
      "patterns": ["export (interface|class|function|const) [A-Z]"],
      "severity": "major",
      "description": "Mudanças em APIs públicas"
    },
    "feature": {
      "paths": ["src/**/*.ts"],
      "patterns": ["export", "function", "class"],
      "exclude": ["**/*.spec.ts", "**/*.test.ts"],
      "severity": "minor",
      "description": "Novos recursos e funcionalidades"
    },
    "bugfix": {
      "paths": ["src/**/*.ts"],
      "patterns": ["fix:", "resolver:", "corrigir:"],
      "severity": "patch",
      "description": "Correções de bugs"
    }
  }
}
```

## Componentes de uma Regra

Cada regra contém:

1. **paths**: Array de padrões glob para identificar arquivos
2. **patterns**: Expressões regulares ou strings para identificar conteúdo
3. **exclude** (opcional): Padrões glob para arquivos a serem ignorados
4. **severity**: Nível de impacto (`major`, `minor`, `patch`)
5. **description**: Descrição humana da regra

## Criando Regras Personalizadas

### Regras Baseadas em Caminho

Para detectar mudanças em áreas específicas do código:

```json
"ui-component": {
  "paths": ["src/components/**/*.tsx", "src/styles/**/*.css"],
  "severity": "minor",
  "description": "Alterações em componentes de UI"
}
```

### Regras Baseadas em Conteúdo

Para detectar padrões específicos no conteúdo dos arquivos:

```json
"database-schema": {
  "paths": ["src/db/**/*.ts"],
  "patterns": ["schema\\.", "createTable", "addColumn", "removeColumn"],
  "severity": "major",
  "description": "Alterações no esquema do banco de dados"
}
```

### Regras Baseadas em Commits

Para detectar mudanças com base em mensagens de commit:

```json
"performance": {
  "commitPatterns": ["perf:", "performance:", "optimize:", "otimiza:"],
  "severity": "minor",
  "description": "Melhorias de performance"
}
```

## Priorização de Regras

Quando múltiplas regras correspondem a uma alteração, a regra com maior severidade tem prioridade:

1. `major` (breaking changes)
2. `minor` (novos recursos)
3. `patch` (correções)

## Extensão de Regras

Você pode estender regras base:

```json
"critical-api": {
  "extends": "breaking-change",
  "paths": ["src/core/api/**/*.ts"],
  "severity": "critical",
  "description": "Mudanças em APIs críticas"
}
```

## Exemplos de Regras Comuns

### Detecção de Breaking Changes

```json
"breaking-api": {
  "paths": ["src/api/**/*.ts"],
  "patterns": [
    "export\\s+(interface|type|class|function|const)\\s+[A-Z]",
    "public\\s+[a-zA-Z]+\\s*\\(",
    "@public"
  ],
  "severity": "major"
}
```

### Detecção de Novos Recursos

```json
"new-feature": {
  "paths": ["src/features/**/*.ts"],
  "patterns": ["export class", "export function", "@feature"],
  "severity": "minor"
}
```

### Detecção de Correções

```json
"bugfix": {
  "paths": ["src/**/*.ts"],
  "patterns": ["fix:", "fixes:", "@bugfix"],
  "commitPatterns": ["fix:", "bugfix:", "corrige:"],
  "severity": "patch"
}
```
