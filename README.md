# Minha Livraria

Biblioteca pessoal para desktop: catálogo do acervo, registro de leitura, resenhas, listas e metas, com dados dos livros importados da [Open Library](https://openlibrary.org/developers/api).

> **Status:** planejamento técnico. O código ainda não foi iniciado.

## Sobre

- Aplicação 100% local e de usuário único, sem servidor remoto.
- Distribuída como um único executável, iniciado pelo hub **My Collection**.
- Interface em português, com tema claro e escuro.

## Stack

| Camada | Tecnologias |
|---|---|
| Back-end | Java 25 · Spring Boot 4.1 · Spring Data JPA · H2 · Flyway · springdoc-openapi |
| Front-end | Angular 22 · TypeScript 6 · Signals · Vitest · Playwright |
| Build e entrega | Maven · frontend-maven-plugin · jpackage · GitHub Actions |

## Pré-requisitos

- JDK 25 (Eclipse Temurin)
- Node.js 26 LTS, apenas para desenvolver o front-end (o build Maven instala a própria versão)

## Como rodar

Será documentado junto com o primeiro código do back-end e do front-end.

## Estrutura

```
backend/   API REST e build do executável (Spring Boot)
frontend/  Interface (Angular)
docs/adr/  Decisões de arquitetura
```

## Documentação

- [Decisões de arquitetura (ADRs)](docs/adr/README.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Arquitetura do back-end](docs/arquitetura-back-end.md)
- [Contrato da API](docs/contrato-da-api.md) e [catálogo de erros](docs/erros.md)
- [Convenções do projeto](CONTRIBUTING.md)

## Licença

Distribuído sob a licença [MIT](LICENSE).
