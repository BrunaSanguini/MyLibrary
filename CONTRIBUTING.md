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

- Módulo de negócio: `books`, `reading`, `lists`, `goals`, `profile`, `images`, `openlibrary`.
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

- O título segue o mesmo formato dos commits, porque vira a mensagem do squash.
- Preencha o template: o quê, por quê e como testar.
- Um PR por assunto. PRs pequenos são revisados melhor.

## Idioma

| Onde | Idioma |
|---|---|
| Código e configuração: classes, métodos, variáveis, tabelas, endpoints, JSON, comentários e Javadoc | Inglês |
| Comunicação: commits, PRs, issues, ADRs, README e este guia | Português |
| Textos exibidos na interface | Português (pt-BR) |

## Nomenclatura

### Java

| Elemento | Padrão | Exemplo |
|---|---|---|
| Pacote base | `io.github.brunasanguini.minhalivraria` | |
| Módulos | um pacote por módulo de negócio | `.books`, `.reading`, `.lists`, `.goals`, `.profile`, `.images` |
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
| Componentes, diretivas e serviços | arquivo kebab-case sem sufixo de tipo | `book-card.ts` → classe `BookCard` |
| Guards, interceptors e pipes | tipo no nome do arquivo | `profile-guard.ts`, `reading-time-pipe.ts` |
| Seletores | prefixo `ml-` | `<ml-book-card>` |
| Pastas | por feature | `features/books/` |

### Banco de dados

Convenções de tabelas, colunas, constraints e migrations em [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md#convenções).

### API

Será definida junto com o contrato da API.

## Versionamento

[SemVer](https://semver.org/lang/pt-BR/) a partir da `0.1.0`, com tags `vX.Y.Z`. O CHANGELOG é gerado a partir dos commits.

## Decisões de arquitetura

Toda decisão relevante de arquitetura vira um ADR em [`docs/adr`](docs/adr/README.md).
