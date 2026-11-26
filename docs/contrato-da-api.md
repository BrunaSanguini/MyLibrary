# Contrato da API

Convenções e endpoints da API REST da Minha Livraria. As decisões e as alternativas descartadas estão no [ADR-0005](adr/0005-contrato-da-api.md). A fonte da verdade do contrato será a especificação OpenAPI em `docs/openapi.json`, gerada a partir do código quando o primeiro controller existir. Este documento explica o desenho e dá exemplos.

## Convenções

| Item | Padrão |
|---|---|
| Base | `http://127.0.0.1:8471/api/v1`. O prefixo é aplicado num lugar só (`PathMatchConfigurer`), e os controllers declaram só `/books`. |
| Rotas | substantivos em inglês, no plural, em kebab-case; no máximo dois níveis (`/readings/{id}/sessions/{sessionId}`) |
| Ações de domínio | `POST` num sub-recurso (`/readings/{id}/finish`), espelhando os métodos da entidade |
| Edição | `PUT` com o objeto completo do formulário |
| Liga/desliga | sub-recurso próprio: `PUT` liga, `DELETE` desliga (`/books/{id}/favorite`) |
| Formato | `application/json`; uploads em `multipart/form-data`, no campo `file` |
| Header obrigatório | `X-Requested-By: minha-livraria` em `POST`, `PUT`, `PATCH` e `DELETE` |
| Erros | Problem Details ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)), com os códigos de [`erros.md`](erros.md) |

### Status HTTP

| Situação | Status |
|---|---|
| Leitura | `200 OK` |
| Criação | `201 Created` + header `Location` |
| Ação de domínio (`/finish`, `/abandon`) | `200 OK` com o recurso atualizado |
| Edição (`PUT`) | `200 OK` com o recurso atualizado |
| Exclusão e liga/desliga | `204 No Content` |
| `PUT` que cria (upsert da resenha) | `201 Created`; `200 OK` quando já existia |

### JSON

- Campos em camelCase.
- Datas no formato ISO (`"2026-11-08"`); instantes em ISO UTC (`"2026-11-08T22:13:00Z"`).
- Enums com os mesmos valores do banco (`"READING"`, `"OWNED"`); o front traduz para o português.
- Campos opcionais vêm como `null`, nunca omitidos.
- Imagens vêm como URL pronta: `"coverUrl": "/api/v1/images/17"`.
- A nota é número decimal: `4.5`.

### Paginação e ordenação

Parâmetros: `page` (começa em 0), `size` (padrão 24, máximo 100) e `sort=campo,asc|desc`. Cada endpoint aceita só uma lista fixa de campos de ordenação; fora dela, a resposta é `400` com o código `request.invalid-sort`.

```json
{
  "content": [],
  "page": 0,
  "size": 24,
  "totalElements": 132,
  "totalPages": 6
}
```

A resposta usa o record próprio `PageResponse<T>`, e não a serialização do `Page` do Spring Data, que não é um formato estável.

## Tipos comuns

**`ShelfStatus`**: status do livro na estante, calculado a partir das leituras: `WANT_TO_READ`, `READING`, `READ`, `ABANDONED`.

**`ReadingStatus`**: status de uma leitura: `IN_PROGRESS`, `FINISHED`, `ABANDONED`.

**`Ownership`**: `OWNED`, `WISHLIST`, `NONE`.

**`BookCardResponse`**: o card de livro usado em todas as listagens.

```json
{
  "id": 42,
  "title": "A Sociedade do Anel",
  "authors": ["J. R. R. Tolkien"],
  "coverUrl": "/api/v1/images/17",
  "status": "READING",
  "progress": { "pagesRead": 120, "pageCount": 576, "percent": 20 },
  "rating": 4.5,
  "genres": ["Fantasia", "Alta fantasia"],
  "ownership": "OWNED",
  "favorite": true,
  "series": { "id": 3, "name": "O Senhor dos Anéis", "position": 1 }
}
```

- `progress` é `null` quando o livro não tem leitura em andamento. Dentro dele, `pageCount` é `null` e `percent` é `0` quando o livro não tem número de páginas.
- `rating` é `null` quando não há resenha.
- `series` é `null` quando o livro não pertence a uma série.

## Estante (`shelf`, somente leitura)

### `GET /shelf/books`

Listagem de cards usada pela Estante, pela busca, pelas seções da Home e pelas páginas de autor, série, gênero e lista.

| Parâmetro | Tipo | Observação |
|---|---|---|
| `q` | texto | busca sem acento em título, subtítulo e autores |
| `status` | `ShelfStatus` | pode repetir: `?status=READING&status=READ` |
| `ownership` | `Ownership` | |
| `favorite` | booleano | |
| `reread` | booleano | `true`: lido mais de uma vez ou com uma leitura marcada como releitura (a lista especial Releituras) |
| `genreId` | número | um gênero inclui os livros dos subgêneros dele |
| `authorId`, `publisherId`, `seriesId`, `listId` | número | |
| `wishlist` | booleano | `false`: deixa a wishlist de fora (o padrão da Minha Estante); `true`: só a wishlist |
| `sort` | texto | `title`, `author`, `addedAt` (padrão, `desc`), `rating`, `finishedAt`, `publishedYear`, `seriesPosition`, `listOrder` (só com `listId`) |

Resposta: `PageResponse<BookCardResponse>`.

**A Home não tem endpoint próprio.** O front faz as chamadas em paralelo: `?favorite=true` (favoritos), `?status=READING` (lendo agora), `/goals` e `/goals/deadlines` (metas) e `/lists` (listas).

### `GET /shelf/summary`

Os números das abas e dos chips da Minha Estante. Todos, menos `wishlist`, contam só os livros fora da wishlist; `shelf` é a soma dos quatro status.

```json
{ "shelf": 26, "reading": 2, "read": 15, "wantToRead": 7, "abandoned": 2, "wishlist": 4, "favorites": 6, "rereads": 1 }
```

### `GET /shelf/books/{id}/related`

```json
{
  "series": [ /* BookCardResponse, na ordem da série */ ],
  "similar": [ /* BookCardResponse, até 12, por subgêneros em comum */ ]
}
```

## Livros (`books`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `POST /books` | `BookRequest` | `201` `BookDetailResponse` |
| `GET /books/{id}` | | `200` `BookDetailResponse` |
| `PUT /books/{id}` | `BookRequest` | `200` `BookDetailResponse` |
| `DELETE /books/{id}` | | `204` |
| `PUT /books/{id}/favorite` · `DELETE /books/{id}/favorite` | | `204` |
| `PUT /books/{id}/ownership` | `{ "ownership": "WISHLIST" }` | `204` |
| `PUT /books/{id}/cover` · `PUT /books/{id}/banner` | multipart `file` | `200` `{ "coverUrl": "..." }` ou `{ "bannerUrl": "..." }` |
| `DELETE /books/{id}/cover` · `DELETE /books/{id}/banner` | | `204` |

Os sub-recursos de favorito e posse são atalhos para os cards e as tags da página do livro. O formulário de edição envia os mesmos campos no `PUT`.

**`BookRequest`**

```json
{
  "title": "A Sociedade do Anel",
  "subtitle": null,
  "isbn13": "9788595084742",
  "isbn10": null,
  "pageCount": 576,
  "publishedYear": 2019,
  "languageCode": "por",
  "synopsis": "...",
  "authorIds": [7],
  "publisherIds": [2],
  "genreIds": [1, 4],
  "seriesId": 3,
  "seriesPosition": 1,
  "ownership": "OWNED",
  "favorite": false
}
```

Autores, editoras, série e gêneros são referenciados por ID. Quando o usuário digita um nome novo no formulário, o front cria o registro antes (`POST /authors`, por exemplo) e usa o ID devolvido.

Todo livro tem pelo menos um autor (`authorIds` não pode vir vazio). Editoras (até 10, na ordem impressa no livro), série e gêneros são opcionais.

**`BookDetailResponse`**

```json
{
  "id": 42,
  "title": "A Sociedade do Anel",
  "subtitle": null,
  "authors": [{ "id": 7, "name": "J. R. R. Tolkien" }],
  "publishers": [{ "id": 2, "name": "HarperCollins Brasil" }],
  "series": { "id": 3, "name": "O Senhor dos Anéis", "position": 1, "totalVolumes": 3 },
  "genres": [
    { "id": 1, "name": "Fantasia", "parentId": null },
    { "id": 4, "name": "Alta fantasia", "parentId": 1 }
  ],
  "isbn13": "9788595084742",
  "isbn10": null,
  "pageCount": 576,
  "publishedYear": 2019,
  "languageCode": "por",
  "synopsis": "...",
  "ownership": "OWNED",
  "favorite": true,
  "coverUrl": "/api/v1/images/17",
  "bannerUrl": null,
  "openLibrary": {
    "workKey": "OL27448W",
    "editionKey": "OL51694024M",
    "url": "https://openlibrary.org/books/OL51694024M"
  },
  "createdAt": "2026-11-08T22:13:00Z",
  "updatedAt": "2026-11-08T22:13:00Z"
}
```

A posição na série é opcional: `seriesId` sem `seriesPosition` põe o livro na série sem número, e `series.position` vem ausente. Posição sem série devolve `422` (`book.position-without-series`). Livros sem posição ficam no fim da ordem da série.

O `BookDetailResponse` traz só os dados do livro. A página do livro busca as leituras em `/books/{id}/readings` e a resenha em `/books/{id}/review`.

### Importação da Open Library

A importação fica em `books` porque só esse módulo sabe o que já está no acervo. O módulo `openlibrary` é apenas o cliente HTTP.

| Método e rota | Uso | Resposta |
|---|---|---|
| `GET /books/import/search?q=` | busca por título ou autor | `200` lista de `ImportCandidateResponse` (até 20) |
| `GET /books/import/preview?isbn=` ou `?editionKey=` | dados completos de uma edição | `200` `ImportPreviewResponse` |
| `POST /books/import` | confirma a importação | `201` `BookDetailResponse` |

```json
{
  "editionKey": "OL51694024M",
  "workKey": "OL27448W",
  "title": "A Sociedade do Anel",
  "authors": ["J. R. R. Tolkien"],
  "publishedYear": 2019,
  "coverUrl": "https://covers.openlibrary.org/b/id/12345678-M.jpg",
  "libraryBookId": null
}
```

- `libraryBookId` vem preenchido quando a edição já está no acervo.
- O `ImportPreviewResponse` acrescenta subtítulo, editora, páginas, ISBNs, idioma e sinopse.
- Na pré-visualização, `coverUrl` aponta para a Open Library. A capa só é baixada para o disco na confirmação.

Corpo da confirmação (classificação opcional, já no momento da importação):

```json
{
  "editionKey": "OL51694024M",
  "ownership": "OWNED",
  "genreIds": [1, 4],
  "seriesId": 3,
  "seriesPosition": 1
}
```

Se a edição ou o ISBN já existir, a resposta é `409` (`book.edition-duplicated` ou `book.isbn-duplicated`), com a extensão `bookId` apontando para o livro existente.

## Catálogo (`books`)

| Recurso | Rotas | Corpo |
|---|---|---|
| Autores | `GET /authors` (paginado, `q`, `sort=name`) · `GET`/`PUT`/`DELETE /authors/{id}` · `POST /authors` | `{ "name": "..." }` |
| Editoras | `GET /publishers` · `GET`/`PUT`/`DELETE /publishers/{id}` · `POST /publishers` | `{ "name": "..." }` |
| Séries | `GET /series` · `GET`/`PUT`/`DELETE /series/{id}` · `POST /series` | `{ "name": "...", "totalVolumes": 3, "description": "..." }` (descrição opcional, até 2000 caracteres) |
| Gêneros | `GET /genres` (árvore, sem paginação) · `POST /genres` · `PUT`/`DELETE /genres/{id}` | `{ "name": "...", "parentId": null }` |

Nas listagens de autores, editoras e séries, cada item traz `bookCount` e até três `coverUrls` para os cards de Catálogos.

```json
[
  {
    "id": 1,
    "name": "Fantasia",
    "bookCount": 18,
    "subgenres": [{ "id": 4, "name": "Alta fantasia", "bookCount": 7 }]
  }
]
```

O `bookCount` de um gênero conta os livros distintos do gênero e dos subgêneros dele.

**Regras de exclusão:**
- Autor com livros: `409` (`author.has-books`).
- Gênero com subgêneros: `409` (`genre.has-subgenres`).
- Editora: os livros ficam sem editora.
- Série: os livros ficam sem série e sem posição.

## Leituras (`reading`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /books/{id}/readings` | | `200` lista de `ReadingResponse`, da mais recente para a mais antiga |
| `POST /books/{id}/readings` | `{ "status": "IN_PROGRESS", "startDate": "2026-11-01", "endDate": null, "reread": false }` | `201` `ReadingResponse` |
| `PUT /readings/{id}` | `{ "startDate": "...", "endDate": "...", "reread": true }` | `200` `ReadingResponse` |
| `POST /readings/{id}/finish` | `{ "endDate": "2026-11-08" }` | `200` `ReadingResponse` |
| `POST /readings/{id}/abandon` | `{ "endDate": "2026-11-08" }` | `200` `ReadingResponse` |
| `POST /readings/{id}/resume` | | `200` `ReadingResponse` |
| `DELETE /readings/{id}` | | `204` |

- O `POST` aceita `FINISHED` e `ABANDONED` para registrar leituras antigas; nesse caso, `endDate` é obrigatório.
- Criar uma leitura `IN_PROGRESS` quando já existe outra em andamento devolve `409` (`reading.in-progress-exists`).
- O status só muda pelas ações `finish`, `abandon` e `resume`, nunca pelo `PUT`.
- `resume` retoma uma leitura abandonada na mesma leitura: volta a `IN_PROGRESS`, sem fim e com o mesmo início. Leitura que não está abandonada: `409` (`reading.not-abandoned`); outra leitura do livro em andamento: `409` (`reading.in-progress-exists`).
- Mudar o período (pelo `PUT`, `finish` ou `abandon`) de um jeito que deixe uma sessão de fora devolve `422` (`session.out-of-period`).
- `progress.percent` é sempre `100` numa leitura `FINISHED`.
- `rating` é a nota do livro naquela leitura ("Nota nesta leitura"). Não há rota própria: salvar a resenha com nota grava a nota também na leitura mais recente, e apagar a resenha tira a nota dessa leitura.

```json
{
  "id": 9,
  "bookId": 42,
  "status": "IN_PROGRESS",
  "startDate": "2026-11-01",
  "endDate": null,
  "reread": false,
  "progress": { "pagesRead": 120, "pageCount": 576, "percent": 20 },
  "sessionCount": 5,
  "rating": 4.5
}
```

### Sessões

| Método e rota | Resposta |
|---|---|
| `GET /readings/{id}/sessions?from=&to=` | `200` lista de sessões, por data |
| `POST /readings/{id}/sessions` | `201` sessão |
| `PUT /readings/{id}/sessions/{sessionId}` | `200` sessão |
| `DELETE /readings/{id}/sessions/{sessionId}` | `204` |

Corpo do `POST` e do `PUT`:

```json
{ "date": "2026-11-08", "pagesRead": 25, "currentPage": null, "note": "Capítulo do Conselho de Elrond." }
```

Resposta:

```json
{ "id": 3, "date": "2026-11-08", "pagesRead": 25, "note": "Capítulo do Conselho de Elrond." }
```

- O corpo leva **exatamente um** entre `pagesRead` e `currentPage`, os dois modos do formulário. Com os dois ou nenhum, a resposta é `400` (`session.pages-mode`).
- `currentPage` é convertido em páginas lidas. Se a página informada não for maior que o progresso atual, a resposta é `422`.
- A resposta traz sempre `pagesRead`, já calculado.

### Resenha

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /books/{id}/review` | | `200` resenha ou `404` (`review.not-found`) |
| `PUT /books/{id}/review` | `{ "rating": 4.5, "content": "..." }` | `201` ao criar, `200` ao atualizar |
| `DELETE /books/{id}/review` | | `204` |
| `GET /reviews` | paginado, `sort=updatedAt` (padrão, `desc`) | `200` `PageResponse` de resenhas com `bookId`, `title`, `coverUrl`, `rating`, `excerpt` e `updatedAt` |

O front trata `review.not-found` como "sem resenha", sem exibir erro.

### Estatísticas

| Rota | Resposta |
|---|---|
| `GET /stats/overview?year=2026&month=11` | totais do mês e do ano, nota média, releituras, páginas no ano, sequência atual e maior sequência, dias com leitura, notas e o ano da primeira leitura |
| `GET /stats/daily-pages?from=&to=` | `[{ "date": "2026-11-08", "pages": 25 }]`, só os dias com leitura; período máximo de 366 dias |
| `GET /stats/books-time?from=&to=` | `[{ "bookId": 42, "title": "...", "coverUrl": "...", "days": 6, "pages": 210 }]` |
| `GET /stats/calendar?year=2026&month=11` | o mês do calendário: `finished` (leituras terminadas no mês) e `days`, os dias com sessão, início ou fim de leitura (sem sessão, `pages` é 0), cada um com os livros do dia (`pages`, `started`, `finished`, `abandoned`, autores e capa); `abandoned` marca o dia em que a leitura parou |

O mapa de calor e o "Esta semana" saem do `daily-pages`; a tabela de Ritmo sai do `overview`.

- `daily-pages` e `books-time` exigem `from` e `to`, com os dois dias incluídos. Fim antes do início: `400` (`stats.invalid-period`); mais de 366 dias: `400` (`stats.period-too-long`).
- Um dia com leitura é um dia com pelo menos uma sessão. A **sequência atual** termina hoje ou ontem (o dia de hoje ainda não acabou); a **maior sequência** considera todo o histórico.
- `overview` traz `finishedInMonth`, `finishedInYear`, `rereadsInYear` e `pagesInYear` com as mesmas regras das metas; `averageRating` é a média de todas as notas, com uma casa decimal, e fica ausente sem notas; `finishedLast30Days` conta hoje e os 29 dias anteriores; `fastestInYear` é a leitura concluída no ano em menos dias (início e fim incluídos), entre as que têm data de início; `readingDays` conta os dias com sessão de todo o histórico; `notes` conta as sessões com anotação; `readerSince` é o ano da primeira leitura ou sessão registrada e fica ausente antes dela.
- `books-time` ordena por dias e depois por páginas.

## Listas (`lists`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /lists` | `q`, `status`, `pinned`; paginado, `sort=name` ou `updatedAt` | `200` `PageResponse` de cards (campos abaixo) |
| `POST /lists` | `{ "name": "...", "description": "...", "color": "RUST" }` | `201`; `409` (`list.name-duplicated`) se outra lista já tiver o nome, ignorando maiúsculas e acentos |
| `GET /lists/{id}` · `PUT /lists/{id}` · `DELETE /lists/{id}` | | `200` / `200` / `204` |
| `PUT /lists/{id}/pin` · `DELETE /lists/{id}/pin` | | `204`; fixa a lista (desafixando a que estava fixada) / desafixa; os dois são idempotentes |
| `PUT /lists/{id}/books/{bookId}` | | `204`; adiciona no fim e é idempotente |
| `DELETE /lists/{id}/books/{bookId}` | | `204`; também idempotente |
| `PUT /lists/{id}/order` | `{ "bookIds": [5, 2, 9] }` | `204`; `422` (`list.invalid-order`) se não tiver exatamente os livros da lista, cada um uma vez |

Os livros de uma lista vêm de `GET /shelf/books?listId={id}&sort=listOrder,asc`. `listOrder` sem `listId` devolve `400` (`request.invalid-sort`).

**Filtros de `GET /lists`**, todos opcionais e combinados com E:
- `q` ignora maiúsculas e acentos e procura no nome (até 200 caracteres).
- `status` é `NOT_STARTED`, `IN_PROGRESS` ou `COMPLETED`.
- `pinned=true` devolve só a lista fixada; `pinned=false`, todas as outras.

`totalElements` já vem filtrado, então um filtro com `size=1` serve de contador.

**Campos do card:** `id`, `name`, `description`, `color`, `pinned`, `bookCount`, `readCount`, `wishlistCount`, `status`, até três `coverUrls` e `updatedAt`.

- `color` é `FOREST`, `PLUM`, `NIGHT`, `RUST`, `SEAL` ou `MOSS`. Sem cor, a lista nova é `PLUM` e uma lista editada mantém a que tinha.
- `readCount` conta os livros com ao menos uma leitura concluída.
- `wishlistCount` conta os livros da lista que estão na wishlist. Eles entram em `bookCount`.
- `status` vem de `readCount` e `bookCount`: nenhum livro lido (ou lista vazia) é `NOT_STARTED`; todos lidos é `COMPLETED`; o resto é `IN_PROGRESS`.
- `coverUrls` traz as capas dos três primeiros livros com capa, na ordem da lista.
- `updatedAt` muda ao editar a lista e ao adicionar, remover ou reordenar livros; fixar e desafixar não mudam.
- Excluir a lista não exclui os livros; excluir um livro o tira de todas as listas.

## Metas (`goals`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /goals?year=2026` | | `200` metas do ano (anuais e mensais), já com o progresso |
| `POST /goals` | `{ "type": "BOOKS", "period": "MONTH", "year": 2026, "month": 11, "target": 3 }` | `201`; `409` (`goal.duplicated`) se já houver meta do mesmo tipo e período |
| `PUT /goals/{id}` | `{ "target": 4, "enabled": false }` | `200`; sem `enabled`, a meta continua ligada ou desligada como estava |
| `DELETE /goals/{id}` | | `204` |

```json
{ "id": 1, "type": "BOOKS", "period": "YEAR", "year": 2026, "month": null, "target": 12, "current": 3, "percent": 25, "enabled": true }
```

- `type`: `BOOKS` (leituras concluídas no período, releituras incluídas), `PAGES` (páginas das sessões do período, mais o que faltava ao concluir uma leitura no período) e `REREADS` (leituras concluídas marcadas como releitura).
- `REREADS` só existe por ano. Meta mensal sem `month`, anual com `month` ou releituras por mês: `422` (`goal.invalid-period`).
- `percent` é arredondado para baixo e para em 100; `current` pode passar do alvo.
- Sem `year`, `GET /goals` usa o ano atual. A lista vem com as anuais primeiro e depois mês a mês.
- Só o alvo e o `enabled` mudam. Uma meta de tipo ou período errado é excluída e criada de novo.
- Desligada (`enabled: false`), a meta guarda o alvo, mas a Home não a mostra.
- A meta mensal muda sozinha a cada mês: no ano atual, `GET /goals` cria a meta do mês corrente quando ele ainda não tem uma, com o alvo e o `enabled` da última meta mensal do mesmo tipo.

### Metas com prazo (`goals/deadlines`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /goals/deadlines` | | `200` todas as metas com prazo (passadas, valendo e futuras), já com o progresso; a que termina primeiro vem primeiro |
| `POST /goals/deadlines` | `{ "type": "BOOKS", "target": 2, "startDate": "2026-08-11", "endDate": "2027-02-11", "genreId": 12 }` | `201`; `422` (`goal.invalid-dates`) com o fim antes do início; `404` (`genre.not-found`) com gênero inexistente |
| `PUT /goals/deadlines/{id}` | o mesmo corpo do `POST` | `200`; troca tudo na meta |
| `DELETE /goals/deadlines/{id}` | | `204` |

```json
{ "id": 7, "type": "BOOKS", "target": 2, "startDate": "2026-08-11", "endDate": "2027-02-11", "genre": { "id": 12, "name": "Não ficção" }, "current": 1, "percent": 50 }
```

- A leitora escolhe o começo e o fim; os dois dias contam. Uma meta de um dia só tem `startDate` igual a `endDate`.
- `type`, `current` e `percent` seguem as regras das metas por ano e mês, inclusive `REREADS`, aqui em qualquer período.
- Com `genreId`, contam só os livros do gênero e dos subgêneros dele; sem `genreId`, todos. `genre` vem nulo nesse caso.
- Excluir o gênero exclui as metas com prazo dele, que de outro jeito passariam a contar todos os livros sem avisar.
- Não há `enabled`: a Home mostra as metas com prazo que estão valendo hoje (início ≤ hoje ≤ fim).

## Destaques da Home (`featured`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /featured` | | `200` os livros em destaque, na ordem da Home (vazio até a usuária escolher) |
| `PUT /featured` | `{ "slots": [ { "bookId": 7, "imageFrom": 2 }, { "bookId": 3 } ] }` | `200` os destaques novos; `422` (`featured.duplicated-book`, `featured.book-not-owned`); `404` (`book.not-found`) |
| `PUT /featured/{slot}/image` | `multipart/form-data`, campo `file` | `200` o destaque com a imagem; `404` (`featured.not-found`) se a posição não tem livro |

```json
{ "slot": 1, "bookId": 7, "title": "A Sociedade do Anel", "authors": ["J. R. R. Tolkien"], "coverUrl": "/api/v1/images/12", "imageUrl": "/api/v1/images/31" }
```

- De 1 a 3 destaques, cada livro uma vez só, e só livros que a usuária tem (`ownership = OWNED`).
- A imagem é da posição, não do livro: `imageFrom` diz de qual posição de antes a nova herda a imagem. Sem `imageFrom`, a posição fica sem imagem até receber uma. As imagens que nenhuma posição herdou vão para a lixeira.
- Excluir o livro tira o destaque dele, e a imagem vai para a lixeira.

## Perfil (`profile`)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /profile` | | `200` `{ "displayName": "...", "avatarUrl": null, "theme": "SYSTEM", "readerSince": 2019 }` |
| `PUT /profile` | `{ "displayName": "...", "theme": "DARK", "readerSince": 2019 }` | `200` |
| `PUT /profile/avatar` | multipart `file` | `200` `{ "avatarUrl": "..." }` |
| `DELETE /profile/avatar` | | `204` |

- O nome tem até 80 caracteres; em branco, o perfil fica sem nome e o app cumprimenta sem ele.
- `readerSince` vai de 1900 até o ano atual; um ano depois do atual devolve `422` (`profile.reader-since-future`). O `PUT` troca o perfil inteiro: ausente, o campo fica vazio.
- O avatar segue as regras das capas (JPEG, PNG ou WebP até 5 MB, conferidos pelo conteúdo): `415` (`image.invalid-type`) e `413` (`image.too-large`). O avatar anterior vai para a lixeira.

## Imagens (`images`)

`GET /images/{id}` devolve o arquivo com:
- `Content-Type` da imagem;
- `Cache-Control: public, max-age=31536000, immutable`;
- `ETag` com o hash do conteúdo.

Se a imagem não existir, a resposta é `404`, e o front mostra a imagem padrão.

## OpenAPI

- O **springdoc** gera a especificação a partir dos controllers e DTOs. Descrições e resumos ficam em inglês, como o resto do código.
- O **Swagger UI** (`/swagger-ui.html`) só fica ligado no perfil `dev`.
- **`docs/openapi.json` é versionado:**
  - Um teste compara a especificação gerada com o arquivo e falha se estiverem diferentes.
  - Rodar o teste com `-Dopenapi.update=true` regrava o arquivo.
  - Toda mudança de contrato aparece no diff do PR.
- **O front gera os tipos TypeScript** a partir do `openapi.json` com o `openapi-typescript` (só tipos, nenhum código em runtime). Se o back mudar um campo, o front deixa de compilar até ser ajustado.

## Versionamento

O prefixo `/v1` segue a convenção de mercado. Front e back são distribuídos juntos no mesmo executável, então mudanças de contrato são coordenadas no mesmo PR. Uma `/v2` só faria sentido se surgisse um consumidor externo.
