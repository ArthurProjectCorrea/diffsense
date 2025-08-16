import { createInterface } from 'readline';

// Função para exibir resumo das alterações classificadas
export const displayChangeSummary = (filesByType) => {
  const typesWithFiles = Object.keys(filesByType);
  
  if (typesWithFiles.length === 0) {
    console.log('\n\x1b[33m⚠️ Nenhuma alteração classificada encontrada para commit.\x1b[0m');
    return false;
  }
  
  console.clear();
  
  const typeColors = {
    feat: '\x1b[32m',    // Verde
    fix: '\x1b[31m',     // Vermelho
    docs: '\x1b[36m',    // Ciano
    style: '\x1b[35m',   // Magenta
    refactor: '\x1b[33m',// Amarelo
    test: '\x1b[34m',    // Azul
    chore: '\x1b[90m',   // Cinza
    default: '\x1b[37m'  // Branco
  };
  
  console.log('\n╭──────────────────────────────────────────────────────────────────╮');
  console.log('│                RESUMO DE ALTERAÇÕES CLASSIFICADAS                │');
  console.log('╰──────────────────────────────────────────────────────────────────╯');
  console.log(`\n✨ Encontrados arquivos para commit em ${typesWithFiles.length} categorias diferentes:\n`);
  
  // Mostrar todos os arquivos classificados por tipo
  for (const type of typesWithFiles.sort()) {
    const files = Array.from(filesByType[type]);
    const color = typeColors[type] || typeColors.default;
    console.log(`${color}┌─ ${type.toUpperCase()} (${files.length} arquivo(s))\x1b[0m`);
    
    for (const file of files) {
      console.log(`${color}│  └─ ${file}\x1b[0m`);
    }
    
    console.log(`${color}│\x1b[0m`);
  }
  
  console.log('╭──────────────────────────────────────────────────────────────────╮');
  console.log('│                       PRÓXIMAS ETAPAS                           │'); 
  console.log('╰──────────────────────────────────────────────────────────────────╯');
  
  return true;
};

// Função para confirmar se deseja prosseguir com os commits
export const confirmCommits = async () => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n');
  console.log('╭────────────────────────────────────────────────╮');
  console.log('│           CONFIRMAÇÃO DE COMMITS               │');
  console.log('╰────────────────────────────────────────────────╯');

  // Função para perguntar ao usuário
  const perguntarConfirmacao = () => {
    return new Promise((resolve) => {
      console.log('\n\x1b[33m🔄 Deseja prosseguir com os commits?\x1b[0m');
      console.log('   \x1b[36m[S] Sim\x1b[0m - Realizar commits agrupados por tipo');
      console.log('   \x1b[36m[N] Não\x1b[0m - Cancelar a operação');
      
      rl.question('\n\x1b[1m Sua escolha (S/n): \x1b[0m', (answer) => {
        const resposta = answer.trim().toLowerCase();
        if (resposta === '' || resposta === 's' || resposta === 'sim' || resposta === 'y' || resposta === 'yes') {
          resolve(true);
        } else {
          resolve(false);
        }
        rl.close();
      });
    });
  };
  
  const deveCommitar = await perguntarConfirmacao();
  
  if (!deveCommitar) {
    console.log('\n\x1b[31m❌ Operação cancelada pelo usuário.\x1b[0m');
    return false;
  }
  
  console.log('\n\x1b[32m✅ Confirmado! Realizando commits...\x1b[0m');
  return true;
};

// Função para obter descrição personalizada para o commit
export const getCustomCommitDescription = async (type) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const maxLength = 100;
  const typePrefix = `${type}: `;
  const remainingChars = maxLength - typePrefix.length;
  
  // Limpar tela
  console.clear();
  
  // Cabeçalho estilizado
  console.log('\n╭────────────────────────────────────────────────────────╮');
  console.log(`│                 COMMIT DO TIPO: ${type.toUpperCase().padEnd(19, ' ')} │`);
  console.log('╰────────────────────────────────────────────────────────╯');
  
  console.log('\n📏 Limite de caracteres para descrição: \x1b[36m' + remainingChars + '\x1b[0m');
  console.log('💡 Dica: Seja conciso e descreva o que foi feito, não como foi feito.');
  
  // Função para perguntar ao usuário
  const perguntarDescricao = () => {
    return new Promise((resolve) => {
      console.log('\n\x1b[1m╭─ Digite a descrição do commit ─╮\x1b[0m');
      rl.question('\x1b[32m│ > \x1b[0m', async (answer) => {
        const descricao = answer.trim();
        
        if (descricao.length === 0) {
          console.log('\x1b[31m\n⚠️  A descrição não pode estar vazia. Tente novamente.\x1b[0m');
          rl.close();
          resolve(await getCustomCommitDescription(type));
          return;
        }
        
        if (descricao.length > remainingChars) {
          console.log(`\x1b[31m\n⚠️  A descrição excede o limite de ${remainingChars} caracteres.\x1b[0m`);
          console.log(`   Você digitou \x1b[33m${descricao.length}\x1b[0m caracteres, \x1b[31m${descricao.length - remainingChars}\x1b[0m a mais que o permitido.`);
          rl.close();
          resolve(await getCustomCommitDescription(type));
          return;
        }
        
        rl.close();
        resolve(descricao);
      });
    });
  };
  
  return await perguntarDescricao();
};
