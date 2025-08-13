import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../../src/index';

describe('Fluxo de análise completo', () => {
  it('deve executar o fluxo sem erros', async () => {
    // This is just an example test to ensure the basic flow works
    await expect(runAnalysis('main', 'HEAD')).resolves.not.toThrow();
  });
});
