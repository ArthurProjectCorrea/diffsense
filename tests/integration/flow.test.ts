import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../../src/index';

describe('Fluxo de análise completo', () => {
  it('deve executar o fluxo sem erros', async () => {
    // Este é apenas um teste de exemplo para garantir que o fluxo básico funcione
    await expect(runAnalysis('main', 'HEAD')).resolves.not.toThrow();
  });
});
