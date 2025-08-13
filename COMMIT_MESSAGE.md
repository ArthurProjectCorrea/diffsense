# Melhoria no Sistema de Classificação do DiffSense

Este commit implementa uma distinção clara entre arquivos relevantes e não relevantes para o versionamento semântico no sistema de commit do DiffSense.

## Alterações principais:

1. **Lista de Arquivos Não Relevantes**: Adicionada uma lista `NON_VERSIONING_FILES` que define padrões de arquivos que não devem impactar o versionamento semântico.

2. **Função `isRelevantForVersioning()`**: Implementada uma função que verifica se um arquivo deve ser considerado para classificações de versionamento como `feat`, `fix` ou breaking changes.

3. **Classificação Forçada como `chore`**: Arquivos não relevantes como `.lock`, `.gitignore`, etc., agora são sempre classificados como `chore` com peso baixo, independente do conteúdo.

4. **Prevenção de Breaking Changes em Arquivos Irrelevantes**: Evita a detecção de breaking changes em arquivos que não afetam a API pública.

Esta melhoria garante que o histórico de commits possa ser usado de forma mais confiável para versionamento automático, já que apenas alterações em arquivos que realmente afetam a API pública serão classificadas como `feat`, `fix` ou breaking changes.
