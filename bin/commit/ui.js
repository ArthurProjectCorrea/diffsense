import { createInterface } from 'readline';

// Função para exibir resumo das alterações classificadas
export const displayChangeSummary = (filesByType) => {
  const typesWithFiles = Object.keys(filesByType);
  
  if (typesWithFiles.length === 0) {
    console.log('⚠️ Nenhuma alteração classificada encontrada para commit.');
    return false;
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO DE ALTERAÇÕES CLASSIFICADAS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Encontrados arquivos para commit em ${typesWithFiles.length} categorias diferentes:`);
  console.log('');
  
  // Mostrar todos os arquivos classificados por tipo
  for (const type of typesWithFiles.sort()) {
    const files = Array.from(filesByType[type]);
    console.log(`📁 ${type.toUpperCase()} (${files.length} arquivo(s)):`);
    console.log(files.map(file => `   - ${file}`).join('\n'));
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return true;
};

// Função para confirmar se deseja prosseguir com os commits
export const confirmCommits = async () => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Função para perguntar ao usuário
  const perguntarConfirmacao = () => {
    return new Promise((resolve) => {
      rl.question('\n🔄 Deseja prosseguir com os commits? (S/n): ', (answer) => {
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
    console.log('\n❌ Operação cancelada pelo usuário.');
    return false;
  }
  
  console.log('\n✅ Confirmado! Realizando commits...');
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
  
  console.log(`\n📝 Commit do tipo: ${type.toUpperCase()}`);
  console.log(`ℹ️ Você tem ${remainingChars} caracteres disponíveis para a descrição`);
  
  // Função para perguntar ao usuário
  const perguntarDescricao = () => {
    return new Promise((resolve) => {
      rl.question(`\n📋 Digite a descrição do commit: `, async (answer) => {
        const descricao = answer.trim();
        
        if (descricao.length === 0) {
          console.log('⚠️ A descrição não pode estar vazia. Tente novamente.');
          rl.close();
          resolve(await getCustomCommitDescription(type));
          return;
        }
        
        if (descricao.length > remainingChars) {
          console.log(`⚠️ A descrição excede o limite de ${remainingChars} caracteres. Tente novamente.`);
          console.log(`   Você digitou ${descricao.length} caracteres, ${descricao.length - remainingChars} a mais que o permitido.`);
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
