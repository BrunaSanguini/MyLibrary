# Fixtures da Open Library

Respostas reais da API, gravadas em 15/11/2026 e usadas pelos testes do módulo `openlibrary`.

Para caber no repositório, listas longas (`subjects`, `source_records`, `links`...) foram cortadas e textos longos de `description` foram encurtados. Chaves, formatos e os demais valores estão como a API devolveu.

| Arquivo | Origem | O que cobre |
|---|---|---|
| `edition-OL29823759M.json` | `/isbn/9788595084742.json` | descrição como texto, data ISO (`2019-07-15`), idioma `/languages/por` |
| `edition-OL7604539M.json` | `/books/OL7604539M.json` | data em texto livre (`1 Deccember 2021`, com o erro de digitação original), subtítulo, sem descrição |
| `edition-OL33891995M.json` | `/books/OL33891995M.json` | descrição como objeto `{ type, value }`, edição sem autores |
| `work-OL27482W.json` | `/works/OL27482W.json` | obra que empresta descrição e autores às edições |
| `author-OL26320A.json` | `/authors/OL26320A.json` | nome do autor |
| `search.json` | `/search.json` | formato da busca com a edição dentro de cada obra |

O `search.json` é a exceção: a busca não pôde ser gravada (o `robots.txt` da Open Library bloqueia a ferramenta usada para gravar). Ele foi montado à mão no formato documentado em <https://openlibrary.org/dev/docs/api/search>, com as chaves reais das fixtures acima.
