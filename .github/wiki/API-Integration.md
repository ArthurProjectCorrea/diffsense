# API Integration

Este guia explica como integrar o DiffSense em suas aplicações e ferramentas através da API JavaScript/TypeScript.

## Instalação como Dependência

```bash
npm install --save @arthurcorreadev/diffsense
```

## Importação

```typescript
// ESM
import { analyze, commitSuggestion, groupByType } from '@arthurcorreadev/diffsense';

// CommonJS
const { analyze, commitSuggestion, groupByType } = require('@arthurcorreadev/diffsense');
```

## API Principal

### Análise de Alterações

```typescript
import { analyze } from '@arthurcorreadev/diffsense';

async function runAnalysis() {
  const result = await analyze({
    // Base para comparação (commit SHA, tag, branch)
    base: 'main',
    
    // Head para comparação (commit SHA, tag, branch, ou local para workspace)
    head: 'feature/nova-funcionalidade',
    
    // Formato de saída ('json', 'object', 'markdown', 'console')
    format: 'object',
    
    // Filtros opcionais
    include: ['src/**/*.ts', 'src/**/*.js'],
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    
    // Configuração personalizada (sobrescreve .diffsenserc.json)
    config: {
      rules: {
        /* regras personalizadas */
      }
    }
  });
  
  // Acesso aos resultados
  console.log(`Found ${result.breakingChanges.length} breaking changes`);
  console.log(`Found ${result.features.length} new features`);
  console.log(`Found ${result.fixes.length} bug fixes`);
  
  // Acessando classificações detalhadas
  result.classifications.forEach(classification => {
    console.log(`${classification.file}: ${classification.type} - ${classification.description}`);
  });
}
```

### Sugestão de Commit

```typescript
import { commitSuggestion } from '@arthurcorreadev/diffsense';

async function generateCommit() {
  const suggestion = await commitSuggestion({
    base: 'HEAD~1',
    head: 'HEAD',
    
    // Formato do commit ('conventional', 'simple', 'detailed')
    commitFormat: 'conventional',
    
    // Incluir breaking changes no corpo da mensagem
    includeBody: true,
    
    // Inferir escopo automaticamente (package, module, path)
    inferScope: true
  });
  
  console.log('Commit Title:', suggestion.title);
  console.log('Commit Body:', suggestion.body);
  console.log('Breaking Changes:', suggestion.breakingChanges);
  
  // Aplicar automaticamente a sugestão
  if (suggestion.breakingChanges.length === 0) {
    await suggestion.apply();
  }
}
```

### Agrupamento por Tipo

```typescript
import { groupByType } from '@arthurcorreadev/diffsense';

async function groupChanges() {
  const groups = await groupByType({
    base: 'main',
    head: 'HEAD',
    
    // Tipos personalizados para agrupar
    types: ['feat', 'fix', 'docs', 'refactor', 'custom-type']
  });
  
  // Acesso aos grupos
  Object.entries(groups).forEach(([type, changes]) => {
    console.log(`\n--- ${type} changes ---`);
    changes.forEach(change => {
      console.log(`- ${change.file}: ${change.description}`);
    });
  });
  
  // Criar commits separados para cada tipo
  if (process.env.AUTO_COMMIT === 'true') {
    await groups.commitByType();
  }
}
```

## Exemplos de Integração

### Integração com Outras Ferramentas

#### Integração com Lerna (Monorepos)

```typescript
import { analyze } from '@arthurcorreadev/diffsense';
import * as lerna from '@lerna/project';

async function analyzeMonorepo() {
  // Obter pacotes do Lerna
  const project = new lerna.Project('.');
  const packages = await project.getPackages();
  
  // Analisar cada pacote
  const results = await Promise.all(
    packages.map(async pkg => {
      const result = await analyze({
        base: 'main',
        head: 'HEAD',
        include: [`${pkg.location}/**/*`],
        format: 'object'
      });
      
      return {
        package: pkg.name,
        results: result
      };
    })
  );
  
  // Sugerir atualizações de versão para cada pacote
  results.forEach(({ package, results }) => {
    let bumpType = 'none';
    
    if (results.breakingChanges.length > 0) {
      bumpType = 'major';
    } else if (results.features.length > 0) {
      bumpType = 'minor';
    } else if (results.fixes.length > 0) {
      bumpType = 'patch';
    }
    
    console.log(`${package}: Suggested version bump: ${bumpType}`);
  });
}
```

#### Plugin de Ferramentas de CI

```typescript
import { analyze } from '@arthurcorreadev/diffsense';

export async function ciPlugin(options) {
  const { base, head, reportPath } = options;
  
  // Executar análise
  const results = await analyze({
    base,
    head,
    format: 'object'
  });
  
  // Verificar alterações que quebram compatibilidade
  if (results.breakingChanges.length > 0) {
    console.warn('⚠️ Breaking changes detected!');
    
    // Falhar o build ou adicionar flag
    if (options.failOnBreaking) {
      process.exit(1);
    }
  }
  
  // Gerar relatório
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      breaking: results.breakingChanges.length,
      features: results.features.length,
      fixes: results.fixes.length,
      refactors: results.refactors.length
    }
  };
  
  // Salvar relatório
  if (reportPath) {
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
  
  return report;
}
```

### Hook de Pré-Release

```typescript
import { analyze } from '@arthurcorreadev/diffsense';
import * as semver from 'semver';
import * as fs from 'fs';

async function preReleaseHook() {
  // Carregar package.json
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const currentVersion = pkg.version;
  
  // Obter último release
  const { execSync } = require('child_process');
  const lastTag = execSync('git describe --tags --abbrev=0').toString().trim();
  
  // Analisar mudanças desde o último release
  const results = await analyze({
    base: lastTag,
    head: 'HEAD',
    format: 'object'
  });
  
  // Determinar tipo de bump
  let bumpType = null;
  
  if (results.breakingChanges.length > 0) {
    bumpType = 'major';
  } else if (results.features.length > 0) {
    bumpType = 'minor';
  } else if (results.fixes.length > 0) {
    bumpType = 'patch';
  }
  
  if (bumpType) {
    // Calcular nova versão
    const newVersion = semver.inc(currentVersion, bumpType);
    console.log(`Sugestão de versão: ${currentVersion} -> ${newVersion}`);
    
    // Atualizar package.json se confirmado
    if (process.argv.includes('--apply')) {
      pkg.version = newVersion;
      fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
      
      // Gerar changelog
      const changelog = results.generateChangelog();
      fs.writeFileSync('./CHANGELOG.md', changelog, { flag: 'a' });
      
      console.log(`✅ Versão atualizada para ${newVersion}`);
    }
  } else {
    console.log('Nenhuma mudança significativa detectada.');
  }
}

preReleaseHook().catch(console.error);
```

## Referência Completa da API

### Opções da Função `analyze()`

```typescript
interface AnalyzeOptions {
  // Obrigatórios
  base: string;           // Commit, tag ou branch base para comparação
  head: string;           // Commit, tag ou branch cabeça para comparação (ou 'local')
  
  // Opcionais
  format?: 'json' | 'object' | 'markdown' | 'console';
  include?: string[];     // Padrões glob para inclusão
  exclude?: string[];     // Padrões glob para exclusão
  config?: DiffSenseConfig; // Configuração personalizada
  repoPath?: string;      // Caminho para o repositório Git
}

interface AnalyzeResult {
  breakingChanges: Change[];
  features: Change[];
  fixes: Change[];
  refactors: Change[];
  docs: Change[];
  styles: Change[];
  tests: Change[];
  chores: Change[];
  classifications: Classification[];
  stats: {
    breaking: number;
    features: number;
    fixes: number;
    refactors: number;
    docs: number;
    styles: number;
    tests: number;
    chores: number;
  };
  
  // Método para gerar changelog
  generateChangelog: (options?: ChangelogOptions) => string;
}
```

Consulte a [documentação da API completa](https://github.com/arthurspk/diffsense/blob/main/docs/API.md) para mais detalhes.
