/**
 * Este arquivo contém funções refactor auxiliares para refatoração
 * Usado para melhorar a organização do código sem adicionar funcionalidades
 */

// Função helper para formatar strings
function formatString(str) {
  return str.trim().toLowerCase();
}

// Helper para normalizar nomes de arquivos
function normalizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

// Essas funções são apenas helpers internos para refatoração
// refactor: renomeação de funções existentes
