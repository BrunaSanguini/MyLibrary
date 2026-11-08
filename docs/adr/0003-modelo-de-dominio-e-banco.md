# ADR-0003: Modelo de domínio e banco de dados

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

O ADR-0001 definiu um monólito modular com H2 em arquivo, Flyway e imagens em disco. O ADR-0002 definiu Spring Data JPA e Spring Modulith. As telas do design pedem catálogo de livros com autores, editoras, séries, gêneros e subgêneros; leituras com sessões diárias, releituras, nota e resenha; listas; metas; perfil; e uma página de Catálogos que agrupa tudo isso.

O detalhamento das tabelas e das regras está em [`docs/modelo-de-dados.md`](../modelo-de-dados.md).

## Decisão

1. **Módulos:**

   | Módulo | Entidades |
   |---|---|
   | `books` | `Book`, `Author`, `Publisher`, `Series`, `Genre` |
   | `reading` | `Reading`, `ReadingSession`, `Review` |
   | `lists` | `BookList`, `BookListItem` |
   | `goals` | `Goal` |
   | `profile` | `Profile` |
   | `images` | `Image` |

2. **Fronteiras:** associações JPA só dentro do módulo. Entre módulos, a referência é pelo ID. O banco mantém as FKs, com `ON DELETE CASCADE` onde excluir o livro deve levar junto os dados dependentes.
3. **Livro é uma edição:** ISBN, páginas e editora pertencem à edição. As chaves de obra e edição da Open Library são guardadas, e os dados importados ficam salvos localmente.
4. **Posse como enum único:** `OWNED`, `WISHLIST` ou `NONE`, porque "Tenho" e "Wishlist" se excluem.
5. **Editora como entidade,** reaproveitada pelo nome normalizado, para permitir o agrupamento em Catálogos.
6. **Gênero e subgênero na mesma tabela,** com `parent_id` e máximo de dois níveis.
7. **Série com posição decimal** (aceita 2,5) e total de volumes opcional.
8. **Leitura:**
   - Status `IN_PROGRESS`, `FINISHED` ou `ABANDONED`, com no máximo uma em andamento por livro.
   - Releitura como flag marcada pelo usuário.
   - Cada sessão guarda as páginas lidas no dia.
9. **Status do livro calculado** a partir das leituras (Lendo, Lido, Abandonado, Quero ler), sem coluna própria.
10. **Resenha única por livro,** com nota geral de 1 a 5 que aceita meio ponto, e texto.
11. **Metas:**
    - Tipos `BOOKS` e `PAGES` (por ano ou mês) e `REREADS` (por ano).
    - Releituras contam em `BOOKS`.
    - O progresso é calculado e não armazenado.
12. **Valores derivados não são armazenados:** progresso, estatísticas do Perfil e livros relacionados são calculados por consulta.
13. **Busca sem acento** por coluna normalizada no livro (título, subtítulo e autores).
14. **Convenções de banco:**
    - IDs `BIGINT` identity.
    - snake_case, tabelas no singular e constraints nomeadas.
    - Enums como texto com `CHECK`.
    - `VARCHAR` com limite explícito.
    - Schema só pelo Flyway, com `ddl-auto=validate`.
15. **Backup automático** do banco antes de aplicar migrations pendentes, mantendo as 5 últimas cópias.
16. **Imagens registradas em tabela própria:**
    - Arquivo imutável com nome UUID.
    - Validação pelo conteúdo.
    - Exclusão do arquivo só depois do commit.
    - Reconciliação com o disco no startup.

## Consequências

**Positivas**
- Os módulos ficam desacoplados no código e íntegros no banco.
- Nenhum valor derivado pode ficar dessincronizado: status, progresso e metas sempre refletem as leituras.
- A nota e as metas podem evoluir sem quebrar o que existe: critérios de nota entram em tabela própria, e novos tipos de meta entram como novo valor do enum.
- A busca funciona com ou sem acento, sem depender de recurso específico do banco.
- Upgrades do H2 e migrations problemáticas têm um caminho de volta pelo backup.

**Negativas / riscos**
- Status e estatísticas exigem consultas com agregação. Se a estante crescer muito, pode ser preciso uma view ou um cache.
- A coluna normalizada de busca precisa ser recalculada quando o livro ou o nome de um autor muda.
- Regras como "soma das páginas não passa do total" ficam no serviço, não no banco.

## Alternativas consideradas

- **UUID como chave:** descartado; sem benefício em app local de usuário único e com URLs menos legíveis.
- **Status armazenado no livro:** descartado; duplicaria a informação das leituras e poderia ficar dessincronizado.
- **Tabelas separadas para gênero e subgênero:** descartado; duas tabelas de vínculo para a mesma ideia de classificação.
- **Editora como texto no livro:** descartado; impede o agrupamento confiável em Catálogos.
- **Nota por critérios ligados ao gênero** (código anterior): adiada; o design atual usa nota única.
- **Sessão guardando a página final:** descartado; editar ou excluir uma sessão mudaria o cálculo das seguintes.
- **Caminho da imagem direto na entidade:** descartado; espalharia validação e limpeza de arquivos por vários módulos.
- **Locking otimista (`@Version`):** descartado por ora; com usuário único, o conflito só ocorreria com duas abas abertas.
