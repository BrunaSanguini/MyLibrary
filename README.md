# Minha Livraria

Biblioteca pessoal para desktop: catálogo do acervo, registro de leitura, resenhas, listas e metas, com dados dos livros importados da [Open Library](https://openlibrary.org/developers/api).

> **Status:** planejamento técnico concluído; implementação começando pelo Marco 0. Acompanhe pelo [roadmap](docs/roadmap.md).

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

### Back-end

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

No Windows (cmd ou PowerShell), use `mvnw.cmd` no lugar de `./mvnw`.

A API sobe em `http://127.0.0.1:8471/api/v1`. No perfil `dev`, os dados ficam em `backend/.local-data/` e a documentação interativa da API fica em `http://127.0.0.1:8471/swagger-ui.html`.

### Front-end

```bash
cd frontend
npm ci
npm start
```

A interface abre em `http://localhost:4200`. As chamadas para `/api` vão para o back-end em `127.0.0.1:8471`, que precisa estar rodando.

## Estrutura

```
backend/   API REST e build do executável (Spring Boot)
frontend/  Interface (Angular)
docs/adr/  Decisões de arquitetura
```

## Documentação

- [Roadmap](docs/roadmap.md)
- [Decisões de arquitetura (ADRs)](docs/adr/README.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Arquitetura do back-end](docs/arquitetura-back-end.md)
- [Contrato da API](docs/contrato-da-api.md) e [catálogo de erros](docs/erros.md)
- [Arquitetura do front-end](docs/arquitetura-front-end.md)
- [Testes e qualidade](docs/testes-e-qualidade.md)
- [CI/CD](docs/ci-cd.md)
- [Convenções do projeto](CONTRIBUTING.md)

## Licença

Distribuído sob a licença [MIT](LICENSE).
