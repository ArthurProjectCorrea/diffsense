# Publicando o DiffSense no NPM

Este guia descreve os passos necessários para publicar uma nova versão do DiffSense no npm.

## Pré-requisitos

1. Você precisa ter uma conta no [npm](https://www.npmjs.com/)
2. Você deve estar autorizado como colaborador/mantenedor do pacote diffsense
3. Certifique-se de ter o Node.js >=18.0.0 instalado

## Preparação

1. Certifique-se de que todas as alterações estão commitadas e o repositório está limpo
2. Verifique se os testes estão passando:
   ```bash
   npm test
   ```
3. Teste a instalação local do pacote:
   ```bash
   npm run test:install
   ```

## Atualização de Versão

O DiffSense segue o [Versionamento Semântico](https://semver.org/):

- **Patch (1.0.x)**: Para correções de bugs que não quebram compatibilidade
- **Minor (1.x.0)**: Para novos recursos que não quebram compatibilidade
- **Major (x.0.0)**: Para mudanças que quebram compatibilidade

Para atualizar a versão, use um dos comandos abaixo:

```bash
# Correções de bugs
npm version patch

# Novos recursos
npm version minor

# Mudanças que quebram compatibilidade
npm version major
```

Esses comandos:
1. Executam os testes automaticamente
2. Incrementam a versão no package.json
3. Criam um commit com a nova versão
4. Criam uma tag git com a versão
5. Enviam as alterações e tags para o repositório

## Publicação

Para publicar no npm, execute:

```bash
npm publish
```

Certifique-se de estar autenticado no npm:

```bash
# Autenticar no npm
npm login
```

## Verificação Pós-publicação

Após a publicação, verifique se o pacote está disponível:

1. Verifique a [página do pacote](https://www.npmjs.com/package/@arthurcorreadev/diffsense)
2. Teste a instalação do pacote:
   ```bash
   # Em um diretório temporário
   mkdir test-diffsense
   cd test-diffsense
   npm init -y
   npm install @arthurcorreadev/diffsense
   npx diffsense --version
   ```

## Problemas Comuns

- **403 Forbidden**: Verifique se você está autenticado e tem permissões para publicar o pacote.
- **Version already exists**: A versão já existe, você precisa incrementar a versão.
- **Unclean working directory**: Commite todas as alterações antes de publicar.

## Atualização da Documentação

Após a publicação:

1. Atualize o CHANGELOG.md com as alterações da nova versão
2. Verifique se o README.md está atualizado com exemplos da versão atual
3. Atualize a documentação no site do projeto ou wiki, se necessário
