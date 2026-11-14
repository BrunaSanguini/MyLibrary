# Convenções do projeto

Como o código e o histórico deste repositório são organizados.

## Fluxo de trabalho

O projeto segue o **GitHub Flow**:

1. Crie uma branch a partir da `main` atualizada.
2. Faça commits pequenos, seguindo as regras abaixo.
3. Abra um pull request para a `main`.
4. Com os checks verdes, faça **squash merge**. O título do PR vira a mensagem do commit na `main`.

A `main` é protegida: só recebe mudanças por pull request, não aceita force push e mantém o histórico linear.

### Branches

Formato `<tipo>/<descricao-em-kebab-case>`, com os mesmos tipos dos commits:

```
feat/cadastro-livro
fix/toggle-tema
docs/adr-modelo-dominio
```

## Commits

Seguimos o [Conventional Commits 1.0](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```
<tipo>(<escopo>): <descrição>
```

| Tipo | Uso |
|---|---|
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `docs` | documentação |
| `refactor` | mudança de código sem alterar comportamento |
| `test` | testes |
| `perf` | desempenho |
| `style` | formatação, sem mudança de lógica |
| `build` | build e dependências |
| `ci` | pipelines do GitHub Actions |
| `chore` | manutenção que não se encaixa nos demais |
| `revert` | reverte um commit anterior |

**Escopos**

- Módulo de negócio: `books`, `reading`, `lists`, `goals`, `profile`, `images`, `openlibrary`, `shelf`.
- Área transversal: `backend`, `frontend`, `build`, `ci`, `deps`, `adr`.

**Descrição**

- Em português, no presente: "adiciona", "corrige", "remove".
- Letra minúscula, sem ponto final, até 72 caracteres.

**Breaking change:** `!` depois do tipo ou escopo (`feat(books)!: ...`) e rodapé `BREAKING CHANGE: <explicação>`.

Exemplos:

```
feat(books): adiciona cadastro de livro por ISBN
fix(frontend): corrige foco do menu de perfil
docs(adr): registra modelo de domínio
```

## Pull requests

- O título segue o mesmo formato dos commits, porque vira a mensagem do squash. O check `pr-title` valida o formato automaticamente.
- Preencha o template: o quê, por quê e como testar.
- Um PR por assunto. PRs pequenos são revisados melhor.
- Cumpra a [Definition of Done](docs/testes-e-qualidade.md#definition-of-done), que também está no checklist do template.

## Testes

Que tipo de teste escrever para cada camada, onde mocks são aceitos e as regras de cobertura e acessibilidade estão em [`docs/testes-e-qualidade.md`](docs/testes-e-qualidade.md).

### Hooks de Git

Depois de `npm ci` na raiz (e em `frontend/`), cada commit passa por:

- **pre-commit:** ESLint, Stylelint e Prettier nos arquivos do front-end que estão no commit (lint-staged). Erros que não têm correção automática barram o commit.
- **commit-msg:** commitlint, com os tipos e escopos acima. Uma mensagem fora do padrão é recusada.

A formatação do Java (Spotless) fica no CI, porque o Maven é lento demais para rodar a cada commit.

### Comandos do back-end

Rodados dentro de `backend/` (no Windows, `mvnw.cmd` no lugar de `./mvnw`):

| Comando | O que faz |
|---|---|
| `./mvnw spotless:apply` | Formata o código Java (palantir-java-format). Rode antes de cada commit. |
| `./mvnw verify` | Gera a interface, compila, roda os testes `*Test` e `*IT` e confere a cobertura mínima. |
| `./mvnw verify -Pskip-frontend` | O mesmo, sem gerar a interface (mais rápido para mexer só no back). |
| `./mvnw verify -Pci,skip-frontend` | O mesmo que o job `backend` do CI: inclui a checagem de formatação e o NullAway. |
| `./mvnw test -Dtest=OpenApiContractTest -Dopenapi.update=true` | Atualiza o contrato `docs/openapi.json` depois de mudar a API. A mudança entra no mesmo PR. |

### Comandos do front-end

Rodados dentro de `frontend/`:

| Comando | O que faz |
|---|---|
| `npm start` | Sobe a interface em `http://localhost:4200`, encaminhando `/api` para o back-end. |
| `npm run format` | Formata o código com o Prettier. Rode antes de cada commit. |
| `npm run lint` | ESLint (inclui as fronteiras entre pastas), Stylelint e checagem do Prettier, como no CI. |
| `npm test` | Testes em jsdom e, para `shared/ui`, no Chromium. |
| `npm run build` | Build de produção, com os budgets de tamanho. |
| `npm run e2e` | Testes E2E (Playwright no Chromium, com axe) contra o jar. Gere antes com `./mvnw package -DskipTests` em `backend/`. |
| `npm run api:types` | Gera os tipos da API a partir de `docs/openapi.json`. Roda sozinho antes de `start`, `test` e `build`. |

Para o modo navegador dos testes e para os E2E, instale os navegadores do Playwright uma vez: `npx playwright install chromium`.

## Idioma

| Onde | Idioma |
|---|---|
| Código e configuração: classes, métodos, variáveis, tabelas, endpoints, JSON, comentários e Javadoc | Inglês |
| Comunicação: commits, PRs, issues, ADRs, README e este guia | Português |
| Textos exibidos na interface | Português (pt-BR) |

Exceção: os PRs automáticos do Renovate têm a descrição em inglês.

## CI/CD

Pipelines, release, Renovate e configurações do repositório em [`docs/ci-cd.md`](docs/ci-cd.md).

## Nomenclatura

### Java

| Elemento | Padrão | Exemplo |
|---|---|---|
| Pacote base | `io.github.brunasanguini.minhalivraria` | |
| Módulos | um pacote por módulo | `.books`, `.reading`, `.lists`, `.goals`, `.profile`, `.images`, `.openlibrary`, `.shelf` |
| Classes | PascalCase | `Book`, `BookService`, `BookController` |
| DTOs (records) | sufixo `Request` ou `Response` | `CreateBookRequest`, `BookResponse` |
| Exceções | sufixo `Exception` | `BookNotFoundException` |
| Interfaces | sem prefixo `I`; `Impl` só com mais de uma implementação | `CoverStorage` |
| Métodos e variáveis | camelCase | `findByIsbn` |
| Constantes | UPPER_SNAKE_CASE | `MAX_COVER_SIZE` |
| Testes unitários | sufixo `Test` | `BookServiceTest` |
| Testes de integração | sufixo `IT` | `BookIT` |
| Métodos de teste | `should...When...` | `shouldThrowConflictWhenIsbnAlreadyExists` |

Maven: groupId `io.github.brunasanguini`, artifactId `minha-livraria`.

Organização de módulos e camadas, validação e tratamento de erros em [`docs/arquitetura-back-end.md`](docs/arquitetura-back-end.md).

### Angular

Segue o [style guide oficial](https://angular.dev/style-guide).

| Elemento | Padrão | Exemplo |
|---|---|---|
| Componentes, diretivas e serviços | arquivo kebab-case sem sufixo de tipo | `book-card.ts` → classe `BookCard`; `theme-store.ts` → `ThemeStore` |
| Componentes de rota | nome da tela + `Page` | `shelf-page.ts` → `ShelfPage` |
| Clientes da API | recurso + `Api`, em `core/api` | `books-api.ts` → `BooksApi` |
| Tipos da API | gerados do OpenAPI, com o sufixo do back | `BookCardResponse`, `BookRequest` |
| Guards, interceptors e pipes | tipo no nome do arquivo | `profile-guard.ts`, `reading-time-pipe.ts` |
| Seletores | prefixo `ml-` | `<ml-book-card>` |
| Pastas | por feature, uma pasta por componente | `features/books/book-page/` |
| Rotas | português, kebab-case | `/livros/:id/editar` |
| Tokens de CSS | prefixo `--ml-` | `--ml-color-accent`, `--ml-space-16` |

Estrutura, estado, API tipada, estilos e tema em [`docs/arquitetura-front-end.md`](docs/arquitetura-front-end.md).

### Banco de dados

Convenções de tabelas, colunas, constraints e migrations em [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md#convenções).

### API

Rotas, métodos, JSON, paginação e erros em [`docs/contrato-da-api.md`](docs/contrato-da-api.md). Todo código de erro novo entra em [`docs/erros.md`](docs/erros.md) no mesmo PR.

## Versionamento

[SemVer](https://semver.org/lang/pt-BR/) a partir da `0.1.0`, com tags `vX.Y.Z`. O CHANGELOG é gerado a partir dos commits.

## Decisões de arquitetura

Toda decisão relevante de arquitetura vira um ADR em [`docs/adr`](docs/adr/README.md).
