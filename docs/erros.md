# Catálogo de erros

Códigos de erro devolvidos pela API no formato Problem Details ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)). O campo `code` da resposta é estável e é ele que o front usa para decidir o que fazer. O campo `type` aponta para a linha correspondente deste catálogo.

**Regra do link:** o `code` com pontos trocados por hífens vira a âncora. Por exemplo, `book.isbn-duplicated` aponta para `erros.md#book-isbn-duplicated`.

As mensagens exibidas ao usuário ficam no `messages.properties` do back-end. A coluna "Quando" abaixo descreve a situação para quem desenvolve.

Este catálogo cresce junto com o código: todo `code` novo entra aqui no mesmo PR.

## Requisição

| Código | HTTP | Quando |
|---|---|---|
| <a id="validation"></a>`validation` | 400 | Um ou mais campos não passaram na validação de formato. A resposta traz `errors: [{ field, message }]`. |
| <a id="request-malformed"></a>`request.malformed` | 400 | JSON inválido ou parâmetro com tipo errado. |
| <a id="request-invalid-sort"></a>`request.invalid-sort` | 400 | Campo de ordenação fora da lista permitida pelo endpoint. |
| <a id="request-invalid"></a>`request.invalid` | 400 | Outra requisição inválida que não se encaixa nos códigos acima (ex.: parâmetro obrigatório ausente). |
| <a id="request-missing-header"></a>`request.missing-header` | 403 | Requisição de alteração sem o header `X-Requested-By`. |
| <a id="request-invalid-host"></a>`request.invalid-host` | 403 | Header `Host` diferente de `127.0.0.1` ou `localhost`. |
| <a id="request-invalid-token"></a>`request.invalid-token` | 403 | Pedido de encerramento sem o header `X-MyCollection-Token` ou com token errado. |
| <a id="resource-not-found"></a>`resource.not-found` | 404 | Rota inexistente, ou encerramento pedido sem token configurado. |
| <a id="request-method-not-allowed"></a>`request.method-not-allowed` | 405 | Método HTTP não suportado pela rota. |
| <a id="request-unsupported-media-type"></a>`request.unsupported-media-type` | 415 | `Content-Type` não aceito pela rota (a API recebe `application/json`). |

## Livros e catálogo

| Código | HTTP | Quando |
|---|---|---|
| <a id="book-not-found"></a>`book.not-found` | 404 | Livro inexistente. |
| <a id="book-isbn-duplicated"></a>`book.isbn-duplicated` | 409 | Já existe um livro com o mesmo ISBN-13. A resposta traz `bookId`. |
| <a id="book-edition-duplicated"></a>`book.edition-duplicated` | 409 | A edição da Open Library já foi importada. A resposta traz `bookId`. |
| <a id="book-series-position-required"></a>`book.series-position-required` | 422 | Série informada sem posição, ou posição sem série. |
| <a id="author-not-found"></a>`author.not-found` | 404 | Autor inexistente. |
| <a id="author-has-books"></a>`author.has-books` | 409 | Tentativa de excluir um autor que ainda tem livros. |
| <a id="publisher-not-found"></a>`publisher.not-found` | 404 | Editora inexistente. |
| <a id="publisher-name-duplicated"></a>`publisher.name-duplicated` | 409 | Já existe uma editora com o mesmo nome normalizado. |
| <a id="series-not-found"></a>`series.not-found` | 404 | Série inexistente. |
| <a id="series-name-duplicated"></a>`series.name-duplicated` | 409 | Já existe uma série com o mesmo nome normalizado. |
| <a id="genre-not-found"></a>`genre.not-found` | 404 | Gênero inexistente. |
| <a id="genre-name-duplicated"></a>`genre.name-duplicated` | 409 | Já existe um gênero ou subgênero com o mesmo nome normalizado. |
| <a id="genre-invalid-parent"></a>`genre.invalid-parent` | 422 | O pai informado já é um subgênero (máximo de dois níveis). |
| <a id="genre-has-subgenres"></a>`genre.has-subgenres` | 409 | Tentativa de excluir um gênero que tem subgêneros. |

## Leituras

| Código | HTTP | Quando |
|---|---|---|
| <a id="reading-not-found"></a>`reading.not-found` | 404 | Leitura inexistente. |
| <a id="reading-in-progress-exists"></a>`reading.in-progress-exists` | 409 | O livro já tem uma leitura em andamento. |
| <a id="reading-not-in-progress"></a>`reading.not-in-progress` | 409 | Ação de concluir ou abandonar numa leitura que não está em andamento. |
| <a id="reading-end-before-start"></a>`reading.end-before-start` | 422 | Data de fim anterior à data de início. |
| <a id="reading-end-date-required"></a>`reading.end-date-required` | 422 | Leitura concluída ou abandonada sem data de fim. |
| <a id="session-not-found"></a>`session.not-found` | 404 | Sessão inexistente. |
| <a id="session-pages-mode"></a>`session.pages-mode` | 400 | A sessão não informou exatamente um entre `pagesRead` e `currentPage`. |
| <a id="session-page-count-required"></a>`session.page-count-required` | 422 | O livro não tem número de páginas cadastrado. |
| <a id="session-out-of-period"></a>`session.out-of-period` | 422 | Data da sessão fora do período da leitura. |
| <a id="session-exceeds-page-count"></a>`session.exceeds-page-count` | 422 | A soma das páginas lidas passaria do total do livro. |
| <a id="session-page-not-ahead"></a>`session.page-not-ahead` | 422 | A página atual informada não é maior que o progresso atual. |
| <a id="review-not-found"></a>`review.not-found` | 404 | O livro ainda não tem resenha. O front trata como "sem resenha". |
| <a id="review-empty"></a>`review.empty` | 422 | Resenha sem nota e sem texto. |

## Listas, metas e perfil

| Código | HTTP | Quando |
|---|---|---|
| <a id="list-not-found"></a>`list.not-found` | 404 | Lista inexistente. |
| <a id="list-name-duplicated"></a>`list.name-duplicated` | 409 | Já existe uma lista com o mesmo nome normalizado. |
| <a id="list-invalid-order"></a>`list.invalid-order` | 422 | A nova ordem não contém exatamente os livros da lista. |
| <a id="goal-not-found"></a>`goal.not-found` | 404 | Meta inexistente. |
| <a id="goal-duplicated"></a>`goal.duplicated` | 409 | Já existe meta do mesmo tipo e período. |
| <a id="goal-invalid-period"></a>`goal.invalid-period` | 422 | Período inválido para o tipo (ex.: releituras por mês) ou mês ausente numa meta mensal. |

## Imagens

| Código | HTTP | Quando |
|---|---|---|
| <a id="image-not-found"></a>`image.not-found` | 404 | Imagem inexistente ou arquivo ausente no disco. |
| <a id="image-invalid-type"></a>`image.invalid-type` | 415 | O conteúdo do arquivo não é JPEG, PNG nem WebP. |
| <a id="image-too-large"></a>`image.too-large` | 413 | Arquivo acima de 5 MB. |

## Open Library

| Código | HTTP | Quando |
|---|---|---|
| <a id="openlibrary-not-found"></a>`openlibrary.not-found` | 404 | ISBN ou edição não encontrados na Open Library. |
| <a id="openlibrary-bad-response"></a>`openlibrary.bad-response` | 502 | A Open Library respondeu com erro ou com dados inválidos. |
| <a id="openlibrary-unavailable"></a>`openlibrary.unavailable` | 503 | Sem conexão com a Open Library. O cadastro manual continua disponível. |
| <a id="openlibrary-timeout"></a>`openlibrary.timeout` | 504 | A Open Library não respondeu a tempo. |

## Erro inesperado

| Código | HTTP | Quando |
|---|---|---|
| <a id="internal-error"></a>`internal.error` | 500 | Falha não prevista. A resposta traz só uma mensagem genérica; os detalhes ficam no log. |
