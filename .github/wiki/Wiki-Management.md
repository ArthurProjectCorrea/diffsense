# Documentação da Wiki do DiffSense

Este documento descreve a estrutura e as diretrizes para a documentação do DiffSense mantida na wiki do GitHub.

## Princípios Fundamentais da Documentação

1. **Documentação Exclusiva na Wiki**: Toda a documentação DEVE ser mantida exclusivamente dentro do diretório `.github/wiki/`. Qualquer arquivo de documentação encontrado fora deste diretório (exceto arquivos README) DEVE ser removido ou migrado para a wiki.

2. **Pesquisa Abrangente**: Antes de adicionar nova documentação, leia toda a wiki para determinar o local adequado para seu conteúdo. Não crie novas páginas se o tópico já estiver coberto em outro lugar.

3. **Reflexão do Estado Atual**: A wiki DEVE sempre refletir o estado atual do projeto. Quando recursos são atualizados ou alterados, a documentação correspondente DEVE ser atualizada imediatamente.

4. **Sem Duplicação**: A duplicação de conteúdo é estritamente proibida. Use referências cruzadas para vincular informações relacionadas entre as páginas da wiki.

5. **Referências Cruzadas**: Todas as páginas da wiki DEVEM incluir referências apropriadas para outras páginas relacionadas usando a sintaxe de links markdown adequada.

6. **Inglês Técnico**: Toda a documentação DEVE ser escrita em inglês técnico claro e conciso, usando terminologia apropriada.

7. **Exceções Permitidas**: Os ÚNICOS arquivos de documentação permitidos fora do diretório wiki são:
   - Arquivos `README.md` (raiz do projeto e subdiretórios)
   - Arquivos de licença
   - Diretrizes de contribuição
   - Código de conduta

## Estrutura da Wiki

A wiki segue esta estrutura organizacional para melhor descoberta:

```
.github/wiki/
├── Home.md                    # Página inicial da wiki e navegação
├── Getting-Started/           # Documentação de introdução
│   ├── Installation.md
│   ├── Configuration.md
│   └── Quick-Start.md
├── Architecture/              # Documentação de design do sistema
│   ├── Overview.md
│   ├── Core-Components.md
│   └── Data-Flow.md
├── User-Guide/                # Documentação para usuários finais
│   ├── CLI-Commands.md
│   └── Configuration-Options.md
├── Developer-Guide/           # Documentação para desenvolvedores
│   ├── Contributing.md
│   ├── Code-Style.md
│   └── Testing.md
├── API-Reference/             # Documentação da API
│   └── [Module]-API.md
└── Maintenance/               # Manutenção do projeto
    ├── Release-Process.md
    └── Wiki-Management.md
```

## Processo de Gerenciamento da Wiki

1. **Adicionando Novo Conteúdo**:
   - Identifique a seção apropriada com base no tipo de conteúdo
   - Crie um novo arquivo com um nome descritivo em formato kebab-case
   - Adicione uma referência à nova página no Home.md ou na página pai apropriada

2. **Atualizando Conteúdo Existente**:
   - Localize a página relevante usando a estrutura da wiki
   - Mantenha o formato e estilo existentes ao atualizar informações
   - Atualize referências cruzadas se páginas relacionadas forem afetadas

3. **Removendo Conteúdo Obsoleto**:
   - Nunca exclua informações sem garantir que estejam realmente obsoletas
   - Atualize referências cruzadas para conteúdo removido

4. **Sincronização da Wiki**:
   - Após fazer alterações, use o comando `pnpm run wiki:sync` para sincronizar com o GitHub

## Aplicação

Qualquer documentação encontrada fora do diretório wiki (exceto arquivos explicitamente permitidos) DEVE ser migrada para o local apropriado na wiki e o arquivo original removido. A consistência na documentação é um requisito crítico do projeto.
