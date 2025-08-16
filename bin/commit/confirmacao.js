// Funções para interação com o usuário
import { createInterface } from 'readline';

// Função para pedir confirmação ao usuário
export async function pedirConfirmacao(options) {
  if (options.dryRun) {
    console.log('\n🔍 Modo dry-run: os comandos serão exibidos, mas não executados.');
    return true;
  }

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
  
  if (deveCommitar) {
    console.log('\n✅ Confirmado! Realizando commits...');
    return true;
  } else {
    console.log('\n❌ Operação cancelada pelo usuário.');
    return false;
  }
}
