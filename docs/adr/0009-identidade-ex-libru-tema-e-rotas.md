# ADR-0009: Identidade Ex·Libru, tema escuro padrão e rotas no singular

- **Status:** Aceito
- **Data:** 2026-11-19

## Contexto

O front-end passa a seguir a especificação de design "Ex·Libru" (paleta Arcana, Cinzel nos títulos, cabeçalho e rodapé novos, rotas por tela). A adoção é feita em PRs pequenos, tela por tela. Os dois primeiros mudaram o tema e a paleta sem que isso fosse registrado, e o terceiro muda as rotas.

O [ADR-0006](0006-arquitetura-do-front-end.md) trata de duas coisas que mudam:

- o tema claro como padrão, com a primeira visita tratada como `SYSTEM` (item 12), que deixa de valer;
- as rotas em português (item 8), que continuam em português, mas cujos exemplos (`CONTRIBUTING.md`, `docs/arquitetura-front-end.md`) usam o plural e o recurso na frente, como `/livros/7`, e passam a seguir a especificação.

O restante do ADR-0006 continua valendo: estrutura por funcionalidade, tokens `--ml-`, CSS puro, `data-theme` no `<html>` e o script que resolve o tema antes da primeira pintura.

## Decisão

1. **Nome na tela: Ex·Libru.**
   - Aparece no cabeçalho, no rodapé, no título da aba e nos textos que citam o app.
   - O repositório, o zip (`minha-livraria-{versão}-windows-x64.zip`), o pacote do front e a variável `MINHA_LIVRARIA_SHUTDOWN_TOKEN` continuam "Minha Livraria": são identificadores técnicos, e trocá-los quebraria o My Collection e as instalações existentes.
2. **Tema escuro é o padrão.**
   - Só existem os temas claro ("pergaminho") e escuro ("noite arcana"). O botão do cabeçalho alterna entre os dois.
   - O escuro também vale em `:root`, então a página tem cor mesmo sem `data-theme`.
   - O valor `SYSTEM` continua aceito pela API, mas o front o trata como escuro. A opção "Igual ao do sistema" saiu do formulário de perfil.
   - Sem preferência salva, a primeira visita abre no escuro.
3. **Tokens da identidade** ficam só em `tokens.css`, como no ADR-0006. O brasão do cabeçalho e do selo usa tokens fixos (`--ml-color-crest-*`), iguais nos dois temas.
4. **Fonte Cinzel** (`@fontsource-variable/cinzel`) para títulos, junto com Cormorant Garamond e Mulish. Em Cinzel, minúsculas já saem em versalete; não se usa `text-transform`.
5. **Rotas: listagem no plural, página de um item no singular.** As rotas continuam em português (ADR-0006).

   | Rota nova | Rota antiga |
   |---|---|
   | `/estante/novo` | `/livros/novo` |
   | `/estante/importar` | `/livros/importar` |
   | `/livro/:id` | `/livros/:id` |
   | `/livro/:id/editar` | `/livros/:id/editar` |
   | `/livro/:id/leitura` | `/livros/:id/leitura` |
   | `/lista/:id` | `/listas/:id` |
   | `/autor/:id` | `/autores/:id` |
   | `/serie/:id` | `/series/:id` |

   - `/estante`, `/listas`, `/catalogos`, `/calendario`, `/perfil`, `/metas`, `/generos/:id` e `/editoras/:id` não mudam por enquanto.
   - As rotas antigas ficam como redirecionamento (`redirectTo` com `pathMatch: 'full'`), para favoritos e links já salvos continuarem abrindo. O `:id`, a query string e o fragmento são mantidos (`/livros/7#titulo-resenha` vai para `/livro/7#titulo-resenha`). Um teste cobre cada par.
   - O cadastro e a importação ficam sob `/estante`, porque nascem da Estante. O arquivo `books.routes.ts` deixa de existir; todas as rotas ficam em `app.routes.ts`.
6. **Fica para depois, nas telas que mudam:**
   - `/catalogos/:aba` no lugar de `/catalogos?tipo=`, junto com a revisão das abas de Catálogos (a especificação remove as abas Subgêneros e Listas).
   - `/configuracoes`, que absorve `/metas`.
   - A importação da Open Library dentro do cadastro, o que elimina `/estante/importar`.
   - Quando cada uma dessas rotas mudar, o PR dela atualiza este ADR por um novo, no mesmo formato.

## Consequências

**Positivas**
- Os endereços seguem a especificação e leem melhor: `/livro/7` é o livro 7; `/estante` é a coleção.
- Nenhum link salvo quebra, e as rotas antigas podem ser removidas depois sem mudar o resto do código.
- O tema deixa de depender do sistema operacional, e a tela fica igual em qualquer computador, como no design.

**Negativas / riscos**
- Os redirecionamentos acrescentam uma navegação nos links antigos e ficam no `app.routes.ts` enquanto houver link salvo em uso.
- Quem usava `SYSTEM` passa a ver o tema escuro, mesmo com o sistema no claro. O botão do cabeçalho troca na hora e a escolha é salva no perfil.
- Durante a adoção, partes das telas ainda têm o visual antigo e textos "Minha Livraria", até a PR de cada tela.

## Alternativas consideradas

- **Manter as rotas no plural:** descartado; a especificação usa o singular, e alinhar agora evita mudar de novo a cada tela.
- **Remover as rotas antigas sem redirecionar:** descartado; links e favoritos já salvos deixariam de abrir.
- **Trocar também `/catalogos?tipo=` por `/catalogos/:aba` neste momento:** descartado; as abas mudam na tela de Catálogos, e trocar a rota duas vezes não ajuda ninguém.
- **Manter `SYSTEM` como opção visível:** descartado; a especificação só tem os dois temas.
- **Renomear repositório, zip e token para "Ex·Libru":** descartado; quebraria o My Collection e as instalações existentes sem ganho para quem usa o app.
