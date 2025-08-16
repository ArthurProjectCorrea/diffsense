import { createInterface } from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import inquirer from 'inquirer';

// Função para exibir resumo das alterações classificadas
export const displayChangeSummary = (filesByType) => {
  const typesWithFiles = Object.keys(filesByType);
  
  if (typesWithFiles.length === 0) {
    console.log('\n' + chalk.yellow('⚠️ Nenhuma alteração classificada encontrada para commit.'));
    return false;
  }
  
  console.clear();
  
  const typeColors = {
    feat: chalk.green,
    fix: chalk.red,
    docs: chalk.cyan,
    style: chalk.magenta,
    refactor: chalk.yellow,
    test: chalk.blue,
    chore: chalk.gray,
    default: chalk.white
  };
  
  const typeEmojis = {
    feat: '✨',
    fix: '🐛',
    docs: '📚',
    style: '💅',
    refactor: '🔧',
    test: '🧪',
    chore: '🔨',
    default: '📋'
  };
  
  const titulo = boxen(chalk.bold('RESUMO DE ALTERAÇÕES CLASSIFICADAS'), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue',
    backgroundColor: '#222'
  });
  
  console.log(titulo);
  
  console.log(chalk.bold(`✨ Encontrados arquivos para commit em ${typesWithFiles.length} categorias diferentes:\n`));
  
  // Mostrar todos os arquivos classificados por tipo
  for (const type of typesWithFiles.sort()) {
    const files = Array.from(filesByType[type]);
    const colorize = typeColors[type] || typeColors.default;
    const emoji = typeEmojis[type] || typeEmojis.default;
    
    console.log(boxen(
      colorize.bold(`${emoji} ${type.toUpperCase()} (${files.length} arquivo(s))\n`) +
      files.map(file => colorize(`• ${file}`)).join('\n'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: type === 'feat' ? 'green' : 
                     type === 'fix' ? 'red' : 
                     type === 'docs' ? 'cyan' : 
                     type === 'style' ? 'magenta' :
                     type === 'refactor' ? 'yellow' :
                     type === 'test' ? 'blue' : 'gray'
      }
    ));
    console.log(''); // Espaçamento entre os tipos
  }
  
  console.log(boxen(chalk.blue.bold('PRÓXIMAS ETAPAS'), {
    padding: 1,
    margin: { top: 1 },
    borderStyle: 'round',
    borderColor: 'blue'
  }));
  
  return true;
};

// Função para confirmar se deseja prosseguir com os commits
export const confirmCommits = async () => {
  console.log('\n');
  
  const confirmacaoBox = boxen(chalk.bold('CONFIRMAÇÃO DE COMMITS'), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'yellow',
    backgroundColor: '#222'
  });
  
  console.log(confirmacaoBox);

  // Usar inquirer para uma interface de usuário mais amigável
  const { confirma } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirma',
      message: chalk.yellow('🔄 Deseja prosseguir com os commits?'),
      choices: [
        {
          name: chalk.green('✅ Sim - Realizar commits agrupados por tipo'),
          value: true
        },
        {
          name: chalk.red('❌ Não - Cancelar a operação'),
          value: false
        }
      ],
      default: true
    }
  ]);
  
  if (!confirma) {
    console.log('\n' + boxen(chalk.red.bold('❌ Operação cancelada pelo usuário.'), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'red'
    }));
    return false;
  }
  
  console.log('\n' + boxen(chalk.green.bold('✅ Confirmado! Realizando commits...'), {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'green'
  }));
  return true;
};

// Função para obter descrição personalizada para o commit
export const getCustomCommitDescription = async (type) => {
  const maxLength = 100;
  const typePrefix = `${type}: `;
  const remainingChars = maxLength - typePrefix.length;
  
  // Limpar tela
  console.clear();
  
  // Cabeçalho estilizado com boxen
  const titulo = boxen(chalk.bold(`COMMIT DO TIPO: ${type.toUpperCase()}`), {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: type === 'feat' ? 'green' : 
                 type === 'fix' ? 'red' : 
                 type === 'docs' ? 'cyan' : 
                 type === 'style' ? 'magenta' :
                 type === 'refactor' ? 'yellow' :
                 type === 'test' ? 'blue' : 'gray',
    backgroundColor: '#222'
  });
  
  console.log(titulo);
  
  console.log(chalk.blue(`📏 Limite de caracteres para descrição: ${chalk.cyan(remainingChars)}`));
  console.log(chalk.yellow('💡 Dica: Seja conciso e descreva o que foi feito, não como foi feito.'));
  
  // Usar inquirer para obter a descrição com validação
  let resposta;
  let descricaoValida = false;
  
  while (!descricaoValida) {
    resposta = await inquirer.prompt([
      {
        type: 'input',
        name: 'descricao',
        message: chalk.green('Digite a descrição do commit:'),
        validate: (input) => {
          if (input.trim().length === 0) {
            return chalk.red('⚠️ A descrição não pode estar vazia. Tente novamente.');
          }
          
          if (input.trim().length > remainingChars) {
            return chalk.red(`⚠️ A descrição excede o limite de ${remainingChars} caracteres.\n  Você digitou ${chalk.yellow(input.length)} caracteres, ${chalk.red(input.length - remainingChars)} a mais que o permitido.`);
          }
          
          return true;
        }
      }
    ]);
    
    descricaoValida = true;
  }
  
  return resposta.descricao.trim();
};
