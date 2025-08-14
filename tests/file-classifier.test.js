/**
 * Testes para o classificador de arquivos
 */

import { expect } from 'chai';
import { classifyFile } from '../utils/file-classifier';

describe('File Classifier', () => {
  it('should classify new files correctly', async () => {
    const result = await classifyFile('new-file.js');
    expect(result).to.equal('feat');
  });
  
  it('should classify test files correctly', async () => {
    const result = await classifyFile('test-file.spec.js');
    expect(result).to.equal('test');
  });
});
