# Development Setup

Este guia ajuda desenvolvedores a configurar o ambiente para contribuir com o DiffSense.

## Requisitos de Sistema

- Node.js (versão 18.0.0 ou superior)
- npm (versão 7.0.0 ou superior)
- Git (versão 2.30.0 ou superior)
- Editor de código (recomendamos VS Code)

## Configuração Inicial

### 1. Clone o Repositório

```bash
# Clone o repositório
git clone https://github.com/arthurspk/diffsense.git

# Entre no diretório
cd diffsense
```

### 2. Instale as Dependências

```bash
# Instale as dependências do projeto
npm install
```

### 3. Configure Git Hooks

```bash
# Instale husky para git hooks
npm run prepare
```

### 4. Configure Tokens para Desenvolvimento

```bash
# Execute o script de configuração de tokens
node scripts/setup-tokens.js
```

### 5. Compile o Código

```bash
# Compile o código TypeScript
npm run build
```

### 6. Link para Desenvolvimento Local

```bash
# Crie um link simbólico para testar globalmente
npm link
```

## Scripts de Desenvolvimento

O DiffSense inclui vários scripts úteis para desenvolvimento:

```bash
# Executa testes unitários
npm test

# Executa testes com cobertura
npm run test:coverage

# Verifica lint
npm run lint

# Corrige problemas de lint
npm run lint:fix

# Executa build em modo watch
npm run build:watch

# Executa testes em modo watch
npm run test:watch

# Verifica instalação local
npm run test:install
```

## Estrutura do Projeto

```
diffsense/
├── src/                # Código fonte
│   ├── cli/            # Interface de linha de comando
│   ├── core/           # Lógica principal
│   ├── rules/          # Motor de regras
│   ├── ast/            # Análise de AST
│   └── utils/          # Utilitários
├── tests/              # Testes
│   ├── unit/           # Testes unitários
│   ├── integration/    # Testes de integração
│   ├── fixtures/       # Arquivos para testes
│   └── helpers/        # Helpers para testes
├── docs/               # Documentação
├── scripts/            # Scripts utilitários
├── .github/            # Configurações do GitHub
├── .vscode/            # Configurações do VS Code
└── dist/               # Código compilado (gerado)
```

## Configuração do VS Code

Para melhor experiência de desenvolvimento com VS Code, recomendamos as seguintes extensões:

- ESLint
- Prettier
- Jest Runner
- TypeScript Import Sorter
- GitLens

Um arquivo `settings.json` é fornecido em `.vscode/` para garantir configurações consistentes.

## Fluxo de Desenvolvimento

### 1. Crie uma Branch

```bash
# Atualize sua branch main
git checkout main
git pull

# Crie uma nova branch
git checkout -b feature/minha-funcionalidade
```

### 2. Desenvolvimento com TDD

1. Escreva testes para a nova funcionalidade
2. Implemente a funcionalidade
3. Verifique se os testes passam

```bash
# Execute testes em modo watch
npm run test:watch
```

### 3. Compile e Teste Localmente

```bash
# Compile o código
npm run build

# Teste a CLI localmente
./bin/diffsense.js analyze --help
```

### 4. Lint e Formatação

```bash
# Verifique e corrija problemas de lint
npm run lint:fix
```

### 5. Commit com Mensagens Convencionais

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Exemplos
git commit -m "feat: adiciona suporte para regras personalizadas"
git commit -m "fix: corrige detecção de breaking changes"
git commit -m "docs: atualiza documentação da API"
```

### 6. Push e Pull Request

```bash
# Envie para seu fork
git push origin feature/minha-funcionalidade

# Crie um Pull Request pelo GitHub
```

## Depuração

### Depurando com VS Code

Um arquivo `launch.json` é fornecido em `.vscode/` para facilitar a depuração:

1. Adicione breakpoints no código
2. Pressione F5 ou use o menu de depuração
3. Selecione a configuração de depuração apropriada

### Depurando Testes

Para depurar testes:

1. Abra o arquivo de teste
2. Use a extensão Jest Runner para executar testes individuais
3. Ou use "Debug Jest Tests" na configuração de depuração

### Logs de Depuração

O DiffSense usa o módulo `debug` para logs detalhados:

```bash
# No Linux/Mac
DEBUG=diffsense:* ./bin/diffsense.js analyze --base HEAD~1 --head HEAD

# No Windows
set DEBUG=diffsense:* & .\bin\diffsense.js analyze --base HEAD~1 --head HEAD
```

## Testando Instalação Local

Para testar como o pacote funcionaria quando instalado:

```bash
# Em uma pasta temporária
mkdir -p /tmp/diffsense-test
cd /tmp/diffsense-test
npm init -y

# Instale o pacote local
npm install /caminho/para/seu/diffsense

# Teste o comando
npx diffsense --version
```

## CI/CD para Desenvolvimento

O repositório inclui workflows de CI/CD que executam automaticamente:

- Testes para cada Pull Request
- Lint e verificação de estilo
- Verificação de tipos TypeScript
- Análise de cobertura de código

Certifique-se de que seu código passe em todos os checks antes de solicitar review.
