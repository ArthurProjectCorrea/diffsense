# DiffSense

Framework inteligente para análise de alterações em código e commits semânticos automáticos.

## Visão Geral

O DiffSense é um framework para análise semântica de alterações em código-fonte, capaz de:

- Detectar mudanças entre commits ou branches
- Analisar semanticamente o código através de AST (Abstract Syntax Tree)
- Classificar alterações com base em regras configuráveis
- Avaliar impacto e severidade das mudanças
- Gerar sugestões de commits semânticos automaticamente
- Identificar breaking changes, novas funcionalidades, correções e mais

## Instalação

```bash
# Instalação global
npm install -g diffsense

# Instalação local
npm install diffsense
```

## Uso

### Linha de Comando (CLI)

```bash
# Analisar mudanças no branch atual em relação ao main
diffsense run

# Analisar mudanças entre dois commits/branches específicos
diffsense run --base origin/main --head feature/nova-funcionalidade

# Gerar relatório em formato JSON
diffsense run --format json > report.json

# Gerar relatório detalhado em formato Markdown
diffsense run --format markdown --verbose > changes.md

# Inicializar configuração padrão
diffsense config --init
```

### Como Biblioteca

```typescript
import { runAnalysis } from 'diffsense';

async function analisarMudancas() {
  const resultado = await runAnalysis('main', 'HEAD', {
    format: 'markdown',
    configPath: './my-rules.yaml'
  });
  
  console.log(resultado.report);
  
  // Acessar a sugestão de commit
  if (resultado.suggestedCommit) {
    const { type, scope, subject, breaking, body } = resultado.suggestedCommit;
    console.log(`Sugestão de commit: ${type}${scope ? `(${scope})` : ''}${breaking ? '!' : ''}: ${subject}`);
  }
}

analisarMudancas();
```

## Configuração

O DiffSense usa arquivos de configuração YAML para definir regras de análise. Você pode criar um arquivo `.diffsenserc.yaml` na raiz do seu projeto:

```yaml
# Regras para classificação de mudanças
rules:
  - id: tests
    match: "**/*.{spec,test}.{ts,js}"
    type: test
    reason: "Arquivo de teste"
    
  - id: docs
    match: "**/*.md"
    type: docs
    reason: "Arquivo de documentação"
    
  - id: public-api-remove
    match_ast: "exported.interface.* removedProperty"
    type: breaking
    reason: "Remoção de propriedade pública"
    
  - id: dto-change
    match_path: "src/api/contracts/**"
    heuristics:
      - if: "semantic.delta.containsDtoPropertyRemoved"
        set: breaking
      - if: "semantic.delta.containsDtoAddedOptional"
        set: feat
```

## Fluxo de Funcionamento

O DiffSense segue um fluxo de processamento bem definido:

1. **ChangeDetector**: Identifica arquivos alterados entre duas referências do git
2. **ContextCorrelator**: Adiciona contexto às mudanças (dependências, arquivos relacionados)
3. **SemanticAnalyzer**: Analisa o significado das alterações através de AST
4. **RulesEngine**: Aplica regras para classificar as mudanças
5. **ScoringSystem**: Pontua as mudanças por importância e impacto
6. **Reporter**: Gera relatórios e sugestões de commit

Para detalhes completos sobre a arquitetura, consulte [ARCHITECTURE.md](./ARCHITECTURE.md).

## Desenvolvimento

```bash
# Clonar o repositório
git clone https://github.com/ArthurProjectCorrea/diffsense.git
cd diffsense

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Compilar o código
npm run build

# Executar testes
npm test

# Analisar arquivos não commitados
npm run analyze

# Commitar alterações agrupadas por tipo (feat, fix, docs, etc.)
npm run commit
```

## Recursos Adicionais

### Commit por Tipo

DiffSense oferece a funcionalidade de agrupar e commitar alterações por seu tipo semântico:

```bash
# Usando a versão com interface melhorada (recomendada)
npm run commit

# Usando a versão com integração completa ao DiffSense
npm run commit-by-type
```

Este recurso:

1. Analisa as alterações não commitadas com uma interface amigável
2. Classifica os arquivos automaticamente por tipo semântico:
   - `feat`: Novas funcionalidades e implementações
   - `fix`: Correções de bugs e problemas
   - `docs`: Documentação e comentários
   - `test`: Testes unitários e de integração
   - `chore`: Configurações, dependências e arquivos de suporte
   - `style`: Arquivos de estilo (CSS, SCSS)
3. Cria commits separados para cada categoria com mensagens semânticas

A interface inclui barras de progresso visuais e um fluxo simplificado para uma experiência de desenvolvimento mais agradável. Isso mantém um histórico de commits mais limpo, semântico e organizado, facilitando a revisão de código e a geração de changelogs.

## Requisitos

- Node.js >=18.0.0
- Git instalado e disponível no PATH

## Licença

MIT
