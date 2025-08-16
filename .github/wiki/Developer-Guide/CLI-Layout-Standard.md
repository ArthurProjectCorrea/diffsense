# DiffSense CLI - Guia de Desenvolvimento

Este documento descreve o padrão de desenvolvimento para os scripts CLI do DiffSense.

## Estrutura Padronizada

Todos os scripts CLI do DiffSense devem seguir uma estrutura padronizada para garantir consistência, manutenção facilitada e experiência de usuário unificada.

### Arquivos Base

- `bin/cli-template.js` - Contém funções utilitárias compartilhadas para criação de CLI
- `bin/commit.js` - Interface unificada para análise e commits

### Padrão de Layout

1. **Importações**: Organize as importações em grupos lógicos
   ```js
   // Utilitários e templates
   import { createCLI, showBanner, handleError } from './cli-template.js';
   
   // Funcionalidades principais
   import { ... } from '../dist/...';
   
   // Bibliotecas de terceiros
   import chalk from 'chalk';
   ```

2. **Inicialização do CLI**: Use a função `createCLI` para configuração consistente
   ```js
   const program = createCLI(
     'nome-do-comando',
     'Descrição clara do comando',
     'versão'
   );
   ```

3. **Configuração de Opções**: Adicione opções usando métodos encadeados
   ```js
   program
     .option('-a, --alias <valor>', 'Descrição clara', 'valorPadrao')
     .option('-b, --outra-opcao', 'Descrição clara');
   ```

4. **Ação Principal**: Defina a função principal dentro do método `.action()`
   ```js
   program
     .action(async (options) => {
       try {
         // Lógica principal aqui
       } catch (error) {
         handleError(error, options.verbose);
       }
     });
   ```

5. **Interface Visual**: Use banners e formatação consistente
   ```js
   if (!options.silentMode) {
     showBanner('Título', 'Subtítulo opcional');
   }
   ```

6. **Tratamento de Erros**: Use a função `handleError` para tratamento consistente
   ```js
   try {
     // código
   } catch (error) {
     handleError(error, options.verbose);
   }
   ```

## Boas Práticas

- **Consistência Visual**: Use cores e formatos consistentes para feedback
  - Erro: Vermelho (`chalk.red`)
  - Sucesso: Verde (`chalk.green`)
  - Informação: Ciano (`chalk.cyan`)
  - Aviso: Amarelo (`chalk.yellow`)

- **Mensagens de Progresso**: Informe claramente o que está acontecendo
  ```js
  console.log('🔍 Analisando alterações...');
  ```

- **Feedback de Conclusão**: Sempre forneça feedback claro ao finalizar
  ```js
  console.log(chalk.green('✅ Operação concluída com sucesso!'));
  ```

## Extensões e Novos Comandos

Ao criar novos comandos:

1. Sempre importe e use as funções do `cli-template.js`
2. Mantenha a estrutura visual consistente
3. Adicione documentação adequada
4. Atualize os scripts no `package.json`

## Exemplo Completo

```js
#!/usr/bin/env node

import { createCLI, showBanner, handleError } from './cli-template.js';
import { minhaFuncao } from '../dist/meu-modulo.js';
import chalk from 'chalk';

const program = createCLI('meu-comando', 'Descrição do meu comando');

program
  .option('-o, --opcao <valor>', 'Descrição da opção', 'valorPadrao')
  .action(async (options) => {
    try {
      if (!options.silentMode) {
        showBanner('Meu Comando', 'Executa uma função específica');
      }
      
      console.log('🔍 Processando...');
      const resultado = await minhaFuncao(options);
      console.log(chalk.green('✅ Concluído com sucesso!'));
      
    } catch (error) {
      handleError(error, options.verbose);
    }
  });

program.parse(process.argv);
```
