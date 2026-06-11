# 📚 My Library

Biblioteca digital pessoal para cadastrar, organizar e explorar sua coleção de livros.

## Sobre o projeto

My Library é um web app para catalogar livros com informações detalhadas, sistema de ranking multidimensional, resenhas pessoais, wish list e uma visualização de grafo interativo conectando livros por tags — inspirado no estilo do Obsidian.


## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 17+ · TailwindCSS · D3.js · Chart.js |
| Backend | Java · Spring Boot 3 · Spring Security · JWT |
| Banco | PostgreSQL (hospedado no Supabase) |
| Storage | Supabase Storage (capas de livros) |
| Deploy FE | Vercel / Netlify |
| Deploy BE | Railway / Render |

## Estrutura do repositório

```
my-library/
├── docs/                        # Documentação do projeto
│   ├── design-doc-v2.pdf        # Design system, arquitetura e mapa de telas
│   └── decisions/               # Decisões de arquitetura (ADRs)
├── frontend/                    # Projeto Angular
│   ├── src/
│   │   └── app/
│   │       ├── core/
│   │       │   ├── services/    # Regras de negócio do lado cliente
│   │       │   ├── repositories/# Comunicação com a API REST
│   │       │   └── models/      # Interfaces TypeScript
│   │       ├── features/        # Módulos por funcionalidade
│   │       └── shared/          # Componentes reutilizáveis
│   └── package.json
├── backend/                     # Projeto Spring Boot
│   └── src/main/java/com/mylibrary/
│       ├── controller/          # Endpoints REST
│       ├── service/             # Regras de negócio
│       ├── repository/          # Acesso ao banco (JPA)
│       ├── model/
│       │   ├── entity/          # Entidades JPA
│       │   └── dto/             # DTOs de request e response
│       └── security/            # Spring Security + JWT
├── supabase/
│   └── migrations/              # Scripts SQL versionados
├── .gitignore
└── README.md
```

## Funcionalidades

- **Biblioteca** — cadastro completo com busca automática por ISBN via Open Library API
- **Status** — marcar livros como Lido, Lendo, Quero ler ou Wish List
- **Ranking** — avaliação em 6 dimensões (Escrita, Enredo, Personagens, Ritmo, Imersão, Impacto) exibida como radar chart
- **Resenha pessoal** — anotações e resenhas privadas por livro
- **Catálogos** — navegação por Editora, Autor, Gênero e Subgênero
- **Grafo de tags** — visualização interativa estilo Obsidian conectando livros por tags em comum
- **Estatísticas** — dashboard com livros por mês, distribuição por gênero e meta anual
- **Dynamic theming** — cada página de livro adapta as cores ao tom dominante da capa

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Java 17+
- Maven 3.8+
- Conta gratuita no [Supabase](https://supabase.com)

### Backend

```bash
cd backend

# Copiar e preencher as variáveis de ambiente
cp .env.example .env

# Rodar
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Copiar e preencher as variáveis de ambiente
cp .env.example .env

# Rodar
ng serve
```

A aplicação estará disponível em `http://localhost:4200`.

## Variáveis de ambiente

Crie um arquivo `.env` em cada pasta com base no `.env.example` correspondente. **Nunca suba o `.env` real para o repositório.**

### Backend (`backend/.env.example`)

```
DB_URL=jdbc:postgresql://<host-supabase>:5432/postgres
DB_USERNAME=postgres
DB_PASSWORD=sua-senha
JWT_SECRET=chave-secreta-longa-e-aleatoria
JWT_EXPIRATION=86400000
```

### Frontend (`frontend/.env.example`)

```
API_URL=http://localhost:8080
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
```

## Banco de dados

As migrations ficam em `supabase/migrations/` como arquivos SQL numerados:

```
001_create_users.sql
002_create_books.sql
003_create_authors.sql
...
```

Para aplicar as migrations, use o [Supabase CLI](https://supabase.com/docs/guides/cli) ou execute os scripts diretamente no painel do Supabase.

## Documentação

O arquivo `docs/design-doc-v2.pdf` contém o design system completo, arquitetura, mapa de telas e decisões técnicas do projeto.

---

> Projeto pessoal em desenvolvimento. 🚧
