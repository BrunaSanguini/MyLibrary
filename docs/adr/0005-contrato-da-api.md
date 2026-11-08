# ADR-0005: Contrato da API

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

O ADR-0004 definiu a arquitetura interna do back-end. Falta definir o contrato REST que o Angular consome: rotas, métodos, formato do JSON, paginação, erros, documentação e como manter front e back sincronizados.

Ao detalhar as telas, apareceu um problema de fronteira. O card de livro, usado na Estante, na busca, na Home e nas páginas de autor, série, gênero e lista, junta dados de `books` (título, autores, capa), de `reading` (status e progresso) e da resenha (nota). Os filtros por status também cruzam essas tabelas. Se essa consulta ficasse em `books`, criaria uma dependência de `books` para `reading`, o que fecharia um ciclo com `reading` → `books`.

Os endpoints e exemplos estão em [`docs/contrato-da-api.md`](../contrato-da-api.md), e os códigos de erro em [`docs/erros.md`](../erros.md).

## Decisão

1. **Módulo de consulta `shelf`** (complementa o ADR-0004).
   - Só leitura: monta os cards, os filtros, a busca e os livros relacionados.
   - É o único módulo autorizado a fazer SQL atravessando tabelas de outros módulos.
   - Não grava nada e nenhum módulo depende dele.
2. **Nova dependência `lists` → `reading`** (complementa o ADR-0004), para o card de lista mostrar quantos livros já foram lidos.
3. **Rotas:**
   - Prefixo `/api/v1` aplicado num lugar só.
   - Substantivos em inglês, no plural, em kebab-case, com no máximo dois níveis.
   - A rota segue o recurso, e o controller fica no módulo dono da regra (ex.: `/books/{id}/readings` em `reading`).
4. **Métodos:**
   - `PUT` com o objeto completo para edição.
   - Sub-recurso com `PUT`/`DELETE` para liga/desliga (favorito, posse).
   - `POST` em sub-recurso para ações de domínio (`/finish`, `/abandon`).
   - Upsert por `PUT` para a resenha.
5. **Status HTTP:** 200 em leituras, edições e ações; 201 com `Location` em criações; 204 em exclusões e liga/desliga.
6. **JSON:**
   - camelCase.
   - Datas ISO e instantes em UTC.
   - Enums com os valores do banco, traduzidos no front.
   - Campos opcionais sempre presentes como `null`.
   - Imagens como URL pronta.
7. **Paginação** com o record próprio `PageResponse<T>` (`content`, `page`, `size`, `totalElements`, `totalPages`). Padrão de 24 itens, máximo 100. Ordenação só por campos de uma lista permitida por endpoint.
8. **Filtros por query params** e busca pelo parâmetro `q`, sem acento.
9. **Home sem endpoint agregado:** o front faz as chamadas das seções em paralelo.
10. **Importação em `/books/import`** (busca, pré-visualização e confirmação), no módulo `books`, que sabe o que já está no acervo. O módulo `openlibrary` é só cliente HTTP, sem controller.
11. **Sessão de leitura com exatamente um** entre `pagesRead` e `currentPage`, os dois modos do formulário.
12. **Catálogo de erros** em `docs/erros.md`, com âncora por código. O `type` do Problem Details aponta para a linha do código.
13. **OpenAPI:**
    - springdoc gera a especificação a partir do código; Swagger UI só no perfil `dev`.
    - `docs/openapi.json` é versionado e verificado por um teste: o CI falha se estiver desatualizado.
14. **Tipos do front gerados** a partir do `openapi.json` com o `openapi-typescript` (só tipos).
15. **Versionamento pela URL** (`/v1`). Front e back são distribuídos juntos, então mudanças de contrato são coordenadas no mesmo PR.

## Consequências

**Positivas**
- O ciclo entre `books` e `reading` não existe, e a exceção ao isolamento de tabelas fica concentrada num único módulo declarado.
- Um único formato de card serve todas as listagens, e o front tem um só componente para ele.
- Mudanças de contrato aparecem no diff do PR e quebram a compilação do front até ele ser ajustado.
- O front decide o comportamento pelo `code` do erro, sem interpretar texto.

**Negativas / riscos**
- O SQL do `shelf` conhece tabelas de outros módulos: uma mudança de schema em `books` ou `reading` exige revisar as consultas do `shelf`. Os testes de integração precisam cobrir essas consultas.
- A Home faz várias chamadas em vez de uma. Num servidor local, o custo é desprezível.
- Manter o `openapi.json` atualizado exige rodar o teste de atualização a cada mudança de contrato.

## Alternativas consideradas

- **Consulta dos cards no módulo `books`:** descartada; criaria um ciclo escondido com `reading`.
- **Endpoint agregado para a Home (BFF):** descartado; acoplaria a API ao layout de uma tela.
- **GraphQL:** descartado; um único cliente, distribuído junto com o back, não precisa de consultas flexíveis.
- **HATEOAS (Spring HATEOAS):** descartado; o front conhece as rotas pelo contrato tipado.
- **`PATCH` com JSON Merge Patch:** descartado; distinguir campo ausente de campo nulo em records exige código extra, e o formulário sempre envia o objeto completo.
- **Serializar o `Page` do Spring Data:** descartado; o formato não é estável entre versões.
- **Paginação por cursor:** descartada; a estante tem tamanho pessoal, e a navegação por página é mais simples.
- **Contract-first (OpenAPI escrito à mão e código gerado):** descartado; o code-first com o arquivo versionado dá a mesma garantia com menos ferramentas.
- **Cliente Angular gerado pelo OpenAPI Generator:** descartado; gera muito código. Só os tipos já garantem a sincronia, e as chamadas ficam com o `HttpClient`.
- **Versionamento nativo do Spring 7 por header:** descartado; o prefixo na URL é mais simples de ler e de depurar.
