# Documentação DiffSense - Wiki

Esta pasta contém toda a documentação da wiki do GitHub para o projeto DiffSense.

## Diretrizes para manter a documentação

Para manter toda a documentação centralizada na wiki do GitHub:

1. **Adicione novos arquivos de documentação nesta pasta** (.github/wiki)
2. **Use formato Markdown (.md)** para todos os arquivos
3. **Sincronize as alterações** usando o comando `pnpm run wiki:sync`

## Estrutura recomendada

- `Home.md` - Página inicial da wiki
- `Installation.md` - Guia de instalação
- `Quick-Start-Guide.md` - Guia de início rápido
- Adicione arquivos específicos para cada recurso/tópico

## Processo de atualização

1. Faça as alterações nos arquivos desta pasta
2. Execute `pnpm run wiki:sync` para enviar as alterações para a wiki
3. Verifique as alterações na [wiki do GitHub](https://github.com/ArthurProjectCorrea/DiffSense/wiki)

## Dicas de formatação

- Use cabeçalhos adequados (##, ###)
- Inclua exemplos de código com blocos de código (\```js)
- Adicione imagens quando necessário
- Mantenha os links internos funcionando corretamente

## Documentação obsoleta

Arquivos de documentação encontrados fora desta pasta serão ignorados pelo processo de sincronização.
A documentação deve ser mantida exclusivamente na wiki para centralização e melhor manutenção.
