/**
 * Módulo para exibir os tipos de commit suportados
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import { ChangeType, CHANGE_PRIORITY } from '../../dist/types/index.js';
import { getChangeTypeDescription } from '../../dist/index.js';

/**
 * Exibe a lista de tipos de commit disponíveis
 */
export function showCommitTypes() {
  // Cabeçalho
  console.log(chalk.cyan('===================================================='));
  console.log(chalk.cyan.bold('DiffSense - Tipos de Commit Semântico'));
  console.log(chalk.cyan('===================================================='));
  
  console.log(chalk.bold('\n📋 TIPOS DE COMMIT SUPORTADOS:\n'));
  
  // Criar tabela para os tipos de commit
  const typesTable = new Table({
    head: [
      chalk.cyan('Tipo'), 
      chalk.cyan('Descrição'), 
      chalk.cyan('Prioridade'),
      chalk.cyan('Uso')
    ],
    style: { head: [], border: [] },
    colWidths: [12, 30, 15, 35],
    wordWrap: true
  });
  
  // Adicionar cada tipo na tabela, ordenados por prioridade
  Object.entries(CHANGE_PRIORITY)
    .sort(([, priorityA], [, priorityB]) => priorityA - priorityB)
    .forEach(([type, priority]) => {
      const changeType = type;
      const description = getChangeTypeDescription(changeType);
      
      let usageExample;
      switch (changeType) {
        case ChangeType.FEAT:
          usageExample = 'feat: adiciona nova funcionalidade X';
          break;
        case ChangeType.FIX:
          usageExample = 'fix: corrige bug na função Y';
          break;
        case ChangeType.REFACTOR:
          usageExample = 'refactor: melhora implementação de Z';
          break;
        case ChangeType.DOCS:
          usageExample = 'docs: atualiza documentação da API';
          break;
        case ChangeType.TEST:
          usageExample = 'test: adiciona testes para componente W';
          break;
        case ChangeType.CHORE:
          usageExample = 'chore: atualiza dependências';
          break;
      }
      
      typesTable.push([
        chalk.green(changeType),
        description,
        `${priority} ${getPriorityIcon(priority)}`,
        chalk.dim(usageExample)
      ]);
    });
  
  console.log(typesTable.toString());
  
  // Informação adicional sobre quebra de compatibilidade
  console.log(chalk.bold('\n⚠️  QUEBRAS DE COMPATIBILIDADE:\n'));
  
  const breakingTable = new Table({
    head: [
      chalk.cyan('Sintaxe'), 
      chalk.cyan('Descrição'), 
      chalk.cyan('Exemplo')
    ],
    style: { head: [], border: [] },
    colWidths: [20, 40, 30],
    wordWrap: true
  });
  
  breakingTable.push([
    chalk.yellow('tipo!:'), 
    'Indica uma quebra de compatibilidade (breaking change) que exige incremento de versão maior', 
    chalk.dim('feat!: remove suporte para Node 14')
  ]);
  
  breakingTable.push([
    chalk.yellow('tipo(escopo)!:'), 
    'Breaking change em um escopo específico', 
    chalk.dim('refactor(api)!: altera formato de resposta')
  ]);
  
  console.log(breakingTable.toString());
  
  // Informações sobre o corpo do commit para breaking changes
  console.log(chalk.bold('\n🛑 FORMATO DO CORPO DE COMMIT PARA BREAKING CHANGES:\n'));
  
  const bodyTable = new Table({
    style: { head: [], border: [] },
    colWidths: [90],
    wordWrap: true
  });
  
  bodyTable.push([
    chalk.dim('tipo!: resumo da alteração\n\n') +
    chalk.red('BREAKING CHANGE: ') + chalk.dim('descrição detalhada da alteração incompatível')
  ]);
  
  console.log(bodyTable.toString());
  
  // Exemplo completo de um commit com breaking change
  console.log(chalk.bold('\n📝 EXEMPLO COMPLETO:\n'));
  
  const exampleTable = new Table({
    style: { head: [], border: [] },
    colWidths: [90],
    wordWrap: true
  });
  
  exampleTable.push([
    chalk.green('feat!: implementa novo sistema de autenticação\n\n') +
    chalk.red('BREAKING CHANGE: ') + chalk.dim('remove suporte para tokens de acesso v1, todos os clientes precisam migrar para v2')
  ]);
  
  console.log(exampleTable.toString());
  
  // Referência às convenções de commits semânticos
  console.log(chalk.bold('\n📚 REFERÊNCIA:\n'));
  console.log(`Convenções de Commit Semântico: ${chalk.blue('https://www.conventionalcommits.org/')}`);
}

/**
 * Retorna um ícone baseado na prioridade
 * @param {number} priority Valor da prioridade
 * @returns {string} Ícone correspondente
 */
function getPriorityIcon(priority) {
  switch(priority) {
    case 1: return chalk.red('(Mais alta)');
    case 2: return chalk.magenta('(Alta)');
    case 3: return chalk.yellow('(Média)');
    case 4: return chalk.blue('(Moderada)');
    case 5: return chalk.cyan('(Baixa)');
    case 6: return chalk.green('(Mais baixa)');
    default: return '';
  }
}
