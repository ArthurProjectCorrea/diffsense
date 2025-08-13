/**
 * Configurações avançadas do pnpm para o projeto DiffSense
 */

module.exports = {
  // Especificar hooks para os scripts do pnpm
  hooks: {
    // Executar testes de linting antes de publicar
    prepublishOnly: 'pnpm run lint && pnpm run test',
  },
  
  // Ignorar certos padrões de audit, se necessário
  // auditConfig: {
  //   ignoreCves: ['CVE-123']
  // },
  
  // Configurações para CI/CD
  ciConfig: {
    // Reduzir a verbosidade em ambientes de CI
    logLevel: 'warn',
  }
};
