/**
 * Teste para o comando de commit com a flag --stop
 * Este é um arquivo de nova funcionalidade
 */

// Nova funcionalidade para testar a flag --stop
export function testStopFlag() {
  console.log("Esta é uma nova funcionalidade para testar a flag --stop");
  return true;
}

export const featureInfo = {
  name: "stop-flag",
  description: "Feature para testar o flag --stop no comando de commit"
};

export default testStopFlag;
