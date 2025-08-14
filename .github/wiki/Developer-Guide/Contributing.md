# Contributing

Obrigado pelo interesse em contribuir com o projeto DiffSense! Este guia explica como você pode participar no desenvolvimento.

## Primeiros Passos

### Pré-requisitos

1. Node.js (versão 18.0.0 ou superior)
2. npm (versão 7.0.0 ou superior)
3. Git

### Configuração do Ambiente

1. Faça um fork do repositório DiffSense
2. Clone seu fork:
   ```bash
   git clone https://github.com/SEU_USUARIO/diffsense.git
   cd diffsense
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Configure o repositório remoto upstream:
   ```bash
   git remote add upstream https://github.com/arthurspk/diffsense.git
   ```

## Processo de Desenvolvimento

### Branches

- `main`: Branch principal, sempre estável
- `develop`: Branch de desenvolvimento
- `feature/*`: Para novas funcionalidades
- `bugfix/*`: Para correções de bugs
- `docs/*`: Para alterações na documentação

### Workflow Recomendado

1. Crie uma nova branch a partir de `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/minha-nova-funcionalidade
   ```

2. Desenvolva e teste sua alteração:
   ```bash
   npm test
   npm run lint
   ```

3. Commit suas alterações:
   ```bash
   git commit -m "feat: adiciona nova funcionalidade X"
   ```
   
   > Nota: Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/)

4. Envie para seu fork:
   ```bash
   git push origin feature/minha-nova-funcionalidade
   ```

5. Abra um Pull Request para a branch `develop` do repositório original

## Padrões de Código

### Estilo de Código

Seguimos o estilo de código [StandardJS](https://standardjs.com/) com algumas modificações:

- Usamos ponto e vírgula
- Usamos tipos TypeScript
- Máximo de 100 caracteres por linha

### Testes

Todos os novos recursos devem vir acompanhados de testes:

```typescript
describe('MeuComponente', () => {
  it('deve funcionar corretamente', () => {
    // Arrange
    const input = 'teste';
    
    // Act
    const resultado = meuComponente(input);
    
    // Assert
    expect(resultado).toBe('teste processado');
  });
});
```

### Documentação

Documente seu código com JSDoc:

```typescript
/**
 * Processa uma entrada e retorna o resultado formatado
 * @param {string} input - A entrada a ser processada
 * @returns {string} A entrada processada
 */
function processar(input: string): string {
  // implementação
}
```

## Pull Requests

### Checklist para PR

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Mensagens de commit seguem o padrão Conventional Commits
- [ ] PR referencia uma issue aberta

### Processo de Review

1. Os mantenedores revisarão seu código
2. Feedback será fornecido em comentários
3. Após aprovação, seu código será mesclado

## Reportando Bugs

Se você encontrar um bug:

1. Verifique se o bug já foi reportado nas [issues](https://github.com/arthurspk/diffsense/issues)
2. Se não encontrar, [abra uma nova issue](https://github.com/arthurspk/diffsense/issues/new)
   - Use o modelo de bug report
   - Inclua passos detalhados para reproduzir
   - Adicione informações sobre seu ambiente

## Sugerindo Melhorias

Para sugerir melhorias:

1. [Abra uma issue](https://github.com/arthurspk/diffsense/issues/new)
   - Use o modelo de feature request
   - Descreva claramente a funcionalidade
   - Explique por que seria útil

## Licença

Ao contribuir para este repositório, você concorda que suas contribuições serão licenciadas sob a mesma [licença do projeto](../LICENSE).
