import { describe, it, expect } from 'vitest';

describe('Testes do DiffSense', () => {
  it('deve verificar a configuração do projeto', () => {
    expect(true).toBe(true);
    // Aqui podemos adicionar verificações básicas do ambiente
    
    // Verificar se os principais arquivos existem
    const fs = require('fs');
    expect(fs.existsSync('./package.json')).toBe(true);
    expect(fs.existsSync('./tsconfig.json')).toBe(true);
    
    // Verificar dependências importantes
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies['simple-git']).toBeDefined();
    expect(packageJson.dependencies['ts-morph']).toBeDefined();
  });
});
