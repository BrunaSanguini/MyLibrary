# Arquitetura do back-end

Como o código do back-end é organizado, com exemplos de cada camada. As decisões e as alternativas descartadas estão no [ADR-0004](adr/0004-arquitetura-do-back-end.md). O modelo de dados está em [`modelo-de-dados.md`](modelo-de-dados.md).

## Módulos

```
io.github.brunasanguini.minhalivraria
├─ MinhaLivrariaApplication.java
├─ shared/        base de entidade, normalização de texto, erros, segurança local, configuração
├─ books/
├─ reading/
├─ lists/
├─ goals/
├─ profile/
├─ images/
├─ openlibrary/
└─ shelf/         somente leitura: cards, filtros, busca e relacionados
```

- O **pacote base** de cada módulo é a API pública dele. Os **subpacotes** são internos: o Spring Modulith falha o build se outro módulo acessar um subpacote.
- O `shared` é um módulo aberto (`@ApplicationModule(type = Type.OPEN)`), usado por todos.

| Módulo | Depende de |
|---|---|
| `books` | `images`, `openlibrary` |
| `reading` | `books` |
| `lists` | `books`, `reading` |
| `goals` | `reading` |
| `profile` | `images` |
| `shelf` | `books`, só o enum `Ownership` |
| `images`, `openlibrary` | nenhum módulo de negócio |

**Módulo `shelf`:** é o lado de leitura do CQRS leve. Monta os cards de livro, que juntam dados de `books` e `reading`, com consultas SQL via `JdbcClient`. É o único módulo autorizado a ler tabelas de outros módulos. Não grava nada, e nenhum módulo depende dele ([ADR-0005](adr/0005-contrato-da-api.md)).

De código, `shelf` só importa o enum `Ownership`, que é da API pública de `books`. O enum aparece tanto no filtro da Estante quanto no cadastro, e dois tipos iguais no contrato deixariam o front com dois enums para o mesmo valor. Regra de negócio nenhuma atravessa essa fronteira: o resto o `shelf` lê das tabelas.

Um único teste garante as fronteiras e a ausência de ciclos:

```java
class ModularityTest {

    @Test
    void respectsModuleBoundaries() {
        ApplicationModules.of(MinhaLivrariaApplication.class).verify();
    }
}
```

**Comunicação entre módulos:** chamadas síncronas à API pública. Eventos só quando o módulo de origem não deve conhecer quem reage. No MVP, o único caso é o descarte de imagens depois do commit.

## Estrutura de um módulo

```
books/
├─ package-info.java            @NullMarked
├─ BookCatalog.java             API pública (usada por reading e lists)
├─ BookSummary.java             record exposto pela API
├─ web/
│  └─ BookController.java
├─ application/
│  ├─ BookService.java          casos de uso; implementa BookCatalog
│  ├─ BookQueries.java          consultas de leitura (estante, busca)
│  ├─ CreateBookRequest.java    DTO de entrada (record com validação)
│  ├─ BookResponse.java         DTO de saída (record)
│  └─ BookMapper.java
└─ domain/
   ├─ Book.java
   ├─ Author.java
   ├─ BookRepository.java
   └─ DuplicateIsbnException.java
```

| Subpacote | Conteúdo | Regra |
|---|---|---|
| `web` | controllers | só HTTP: recebe o DTO, chama o serviço e devolve a resposta |
| `application` | serviços, consultas, DTOs e mappers | `@Transactional` aqui; o mapeamento para DTO acontece dentro da transação |
| `domain` | entidades, repositórios e exceções | as invariantes ficam dentro das entidades |

A dependência é sempre `web` → `application` → `domain`. Como o `open-in-view` está desligado, mapear para DTO dentro da transação evita `LazyInitializationException`.

**Convenções**

- Injeção por construtor.
- `public` só quando outro subpacote do mesmo módulo precisa. O Modulith já impede o acesso de outros módulos.
- Um `package-info.java` com `@NullMarked` em **cada** pacote, porque a anotação não vale para subpacotes.
- `Clock` injetado em vez de `LocalDate.now()`, para testar regras que dependem da data.
- Cada consulta busca o que a tela precisa (`JOIN FETCH` ou `@EntityGraph`), evitando N+1.

## Camadas

### API pública do módulo

```java
public interface BookCatalog {

    Optional<BookSummary> findSummary(long bookId);

    List<BookSummary> findSummaries(Collection<Long> bookIds);
}

public record BookSummary(
        long id,
        String title,
        List<String> authors,
        @Nullable Integer pageCount,
        @Nullable Long coverImageId) {}
```

### `web`

```java
@RestController
@RequestMapping("/api/v1/books")
class BookController {

    private final BookService bookService;

    BookController(BookService bookService) {
        this.bookService = bookService;
    }

    @PostMapping
    ResponseEntity<BookResponse> create(@Valid @RequestBody CreateBookRequest request) {
        BookResponse created = bookService.create(request);
        URI location = URI.create("/api/v1/books/" + created.id());
        return ResponseEntity.created(location).body(created);
    }
}
```

### `application`

```java
@Service
@Transactional(readOnly = true)
public class BookService implements BookCatalog {

    private final BookRepository books;
    private final BookMapper mapper;

    public BookService(BookRepository books, BookMapper mapper) {
        this.books = books;
        this.mapper = mapper;
    }

    @Transactional
    public BookResponse create(CreateBookRequest request) {
        if (request.isbn13() != null && books.existsByIsbn13(request.isbn13())) {
            throw new DuplicateIsbnException(request.isbn13());
        }
        Book book = books.save(mapper.toEntity(request));
        return mapper.toResponse(book);
    }
}
```

DTOs são records, com a validação de formato nos componentes:

```java
public record CreateBookRequest(
        @NotBlank @Size(max = 500) String title,
        @Size(max = 500) @Nullable String subtitle,
        @Isbn13 @Nullable String isbn13,
        @Isbn10 @Nullable String isbn10,
        @Positive @Nullable Integer pageCount,
        @NotEmpty List<@NotNull Long> authorIds) {}

public record ReviewRequest(
        @DecimalMin("1.0") @DecimalMax("5.0") @HalfPoint @Nullable BigDecimal rating,
        @Size(max = 20000) @Nullable String content) {}
```

`@Isbn13`, `@Isbn10` e `@HalfPoint` são constraints próprias, no `shared`. As duas de ISBN validam o dígito verificador.

### `domain`

As entidades protegem as próprias regras. Não há setters para campos que têm regra.

```java
@Entity
public class Reading extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    private long bookId;

    @Enumerated(EnumType.STRING)
    private ReadingStatus status;

    private @Nullable LocalDate startDate;
    private @Nullable LocalDate endDate;
    private boolean reread;

    protected Reading() {
        // JPA
    }

    public void finish(LocalDate endDate) {
        if (status != ReadingStatus.IN_PROGRESS) {
            throw new BusinessRuleException("reading.not-in-progress");
        }
        if (startDate != null && endDate.isBefore(startDate)) {
            throw new BusinessRuleException("reading.end-before-start");
        }
        this.status = ReadingStatus.FINISHED;
        this.endDate = endDate;
    }
}
```

`Reading` guarda `bookId` (um `long`) em vez de uma associação com `Book`, porque `Book` pertence a outro módulo.

### Consultas de leitura

Estante, busca, catálogos, estatísticas e mapa de calor não carregam entidades. Elas usam projeções em record, via JPQL ou `JdbcClient`:

```java
@Repository
class ReadingStatsQueries {

    private final JdbcClient jdbc;

    ReadingStatsQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    List<DailyPages> pagesPerDay(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        SELECT session_date, SUM(pages_read) AS pages
                        FROM reading_session
                        WHERE session_date BETWEEN :from AND :to
                        GROUP BY session_date
                        ORDER BY session_date
                        """)
                .param("from", from)
                .param("to", to)
                .query(DailyPages.class)
                .list();
    }
}

record DailyPages(LocalDate sessionDate, long pages) {}
```

## Validação

| Nível | Onde | Exemplos | HTTP |
|---|---|---|---|
| Formato | DTO (Bean Validation) | `@NotBlank`, `@Size`, `@Isbn13`, `@HalfPoint` | 400 |
| Regra de negócio | entidade ou serviço | uma leitura em andamento por livro; páginas ≤ total; sessão dentro do período | 409 (conflito com o estado atual) ou 422 (regra violada) |
| Integridade | banco | `UNIQUE`, `CHECK`, FK | 409, identificado pelo nome da constraint |

## Erros

As respostas de erro seguem o Problem Details ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)).

```java
public abstract sealed class DomainException extends RuntimeException
        permits NotFoundException, ConflictException, BusinessRuleException {

    private final String code;
    private final Object[] args;

    protected DomainException(String code, Object... args) {
        super(code);
        this.code = code;
        this.args = args;
    }

    public String code() { return code; }

    public Object[] args() { return args; }
}
```

Um único `@RestControllerAdvice`, que estende `ResponseEntityExceptionHandler`, converte tudo em `ProblemDetail`. Como a hierarquia é selada, o `switch` cobre todos os casos e o compilador avisa se faltar algum:

```java
HttpStatus status = switch (exception) {
    case NotFoundException e -> HttpStatus.NOT_FOUND;
    case ConflictException e -> HttpStatus.CONFLICT;
    case BusinessRuleException e -> HttpStatus.UNPROCESSABLE_CONTENT;
};
```

| Situação | HTTP |
|---|---|
| JSON malformado ou validação de formato | 400, com `errors: [{ field, message }]` |
| Recurso inexistente | 404 |
| Conflito (ISBN duplicado, leitura já em andamento, autor com livros) | 409 |
| Regra de negócio violada | 422 |
| Open Library: resposta inválida / sem conexão / tempo esgotado | 502 / 503 / 504 |
| Erro inesperado | 500, com mensagem genérica; detalhes só no log |

- **`DataIntegrityViolationException`:** o nome da constraint violada (ex.: `uk_book_isbn13`) é traduzido para o `code` correspondente.
- **Mensagens:** em português, no `messages.properties`, buscadas pelo `code`. As mensagens padrão do Bean Validation já vêm em português.
- **`type`:** aponta para a linha do código no [catálogo de erros](erros.md).
- **Stack trace:** nunca vai na resposta.

```json
{
  "type": "https://github.com/BrunaSanguini/MyLibrary/blob/main/docs/erros.md#book-isbn-duplicated",
  "title": "ISBN já cadastrado",
  "status": 409,
  "detail": "Já existe um livro com o ISBN 9788595084742.",
  "instance": "/api/v1/books",
  "code": "book.isbn-duplicated"
}
```

## Cliente da Open Library

Interface declarativa do Spring 7, registrada com `@ImportHttpServices` no grupo `openlibrary`. URL base, timeouts e `User-Agent` são configurados no grupo:

```java
@HttpExchange(accept = "application/json")
interface OpenLibraryApi {

    @GetExchange("/search.json")
    SearchResponse search(
            @RequestParam("q") String query,
            @RequestParam("fields") String fields,
            @RequestParam("limit") int limit);

    @GetExchange("/isbn/{isbn}.json")
    EditionResponse findEdition(@PathVariable String isbn);

    @GetExchange("/works/{workId}.json")
    WorkResponse findWork(@PathVariable String workId);

    @GetExchange("/authors/{authorId}.json")
    AuthorResponse findAuthor(@PathVariable String authorId);
}
```

**Camada anticorrupção:** os DTOs da Open Library (`SearchResponse`, `EditionResponse`...) ficam em subpacote interno. A API pública do módulo expõe só os nossos records (`OpenLibraryBook`, `OpenLibraryAuthor`). A conversão trata as inconsistências da API:

- `description` às vezes vem como texto e às vezes como objeto `{ "type", "value" }`.
- `publish_date` é texto livre (`"1954"`, `"July 29, 1954"`) e vira ano.
- Idiomas vêm como `/languages/por` e viram `por`.

**Capas:** sempre pelo ID da capa, `https://covers.openlibrary.org/b/id/{coverId}-L.jpg?default=false`. Por ISBN o acesso é limitado a 100 requisições a cada 5 minutos, e `default=false` devolve 404 em vez de uma imagem em branco.

**Resiliência**

| Recurso | Configuração |
|---|---|
| Timeouts | 3 s para conectar, 10 s para ler |
| Retry | `@Retryable` do Spring 7 (com `@EnableResilientMethods`): 2 novas tentativas com espera crescente, só em GET e só para 5xx, timeout e 429 |
| Limite de taxa | limitador próprio com intervalo mínimo entre chamadas: 3 req/s com contato no `User-Agent`, 1 req/s sem |
| Cache | Caffeine em memória, 1 hora: a confirmação da importação reaproveita o que a pré-visualização buscou |

**`User-Agent`:** `MinhaLivraria/{versão} (+https://github.com/BrunaSanguini/MyLibrary; {contato})`. O contato vem de `app.open-library.contact`, que fica vazio no repositório e é preenchido no arquivo de configuração local.

**Importação em dois passos**

1. **Pré-visualização:** busca por ISBN ou por título e autor. Devolve os candidatos sem salvar nada.
2. **Confirmação:**
   - A capa é baixada fora da transação.
   - Livro, autores e editora são salvos numa transação só. Autores e editora são reaproveitados pelo nome normalizado.
   - Se o salvamento falhar, a capa baixada vai para a lixeira.

A série é sempre preenchida à mão. Sem internet, o cadastro manual continua funcionando.

## Segurança local

Não há usuários, então não há Spring Security. Três filtros simples, no `shared`, protegem a API de páginas abertas no navegador:

1. **`Host`:** aceita só `127.0.0.1` e `localhost`. Isso protege contra *DNS rebinding*, quando um domínio malicioso aponta para a máquina local.
2. **Header obrigatório:** `POST`, `PUT`, `PATCH` e `DELETE` exigem `X-Requested-By: minha-livraria`. Esse header obriga o navegador a pedir permissão antes (CORS), e o app nega. O front envia o header automaticamente por um interceptor.
3. **`/actuator/shutdown`:** exige o token do My Collection no header `X-MyCollection-Token`, comparado em tempo constante (`MessageDigest.isEqual`). Sem token configurado, o endpoint fica desligado.

Uploads aceitam até 5 MB, e o tipo é validado pelos bytes iniciais do arquivo.

## Configuração

Propriedades tipadas e validadas na inicialização:

```java
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotNull Path dataDir,
        @Valid OpenLibrary openLibrary,
        @Valid Images images,
        @Valid Backup backup) {

    public record OpenLibrary(@NotNull URI baseUrl, @NotNull URI coversUrl, String contact) {}

    public record Images(@NotNull DataSize maxSize, @NotNull Duration trashRetention) {}

    public record Backup(@Positive int keep) {}
}
```

Trecho do `application.yml`:

```yaml
spring:
  config:
    import: optional:file:${user.home}/.minha-livraria/config.yml
  datasource:
    url: jdbc:h2:file:${app.data-dir}/data/minha-livraria
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  servlet:
    multipart:
      max-file-size: 5MB

server:
  address: 127.0.0.1
  port: 8471
  shutdown: graceful

management:
  endpoints:
    web:
      exposure:
        include: health, info, shutdown
  endpoint:
    health:
      probes:
        enabled: true

app:
  data-dir: ${user.home}/.minha-livraria
  open-library:
    base-url: https://openlibrary.org
    covers-url: https://covers.openlibrary.org
    contact: ""
  images:
    max-size: 5MB
    trash-retention: 30d
  backup:
    keep: 5

logging:
  file:
    name: ${app.data-dir}/logs/minha-livraria.log
  logback:
    rollingpolicy:
      max-file-size: 10MB
      max-history: 7
```

- **Perfil `dev`:** dados em `./.local-data` (já no `.gitignore`), console do H2 e logs em `DEBUG`. Sem perfil, o app roda como produção.
- **Configuração local:** o arquivo `%USERPROFILE%\.minha-livraria\config.yml` fica fora do repositório e guarda valores pessoais, como o contato da Open Library:

  ```yaml
  app:
    open-library:
      contact: seu-email@exemplo.com
  ```

## Ciclo de vida

**Startup**

1. Cria as pastas de dados (`data/`, `images/`, `backups/`, `logs/`).
2. Se houver migration pendente, faz dois backups e só então aplica a migration. Mantém as 5 últimas cópias de cada tipo.
   - `BACKUP TO`: cópia binária e consistente mesmo com o banco aberto, para restaurar rápido.
   - `SCRIPT TO`: exportação em SQL compactada. Serve para recriar o banco com `RUNSCRIPT` numa versão do H2 com formato de arquivo diferente, que é o risco apontado no ADR-0001.

   ```java
   @Bean
   FlywayMigrationStrategy backupBeforeMigrate(DatabaseBackup backup) {
       return flyway -> {
           if (flyway.info().pending().length > 0) {
               backup.create();
           }
           flyway.migrate();
       };
   }
   ```

3. A readiness fica `UP`, e o My Collection abre a interface.
4. Em segundo plano: reconciliação das imagens com o disco e limpeza da lixeira.

**Encerramento:** `POST /actuator/shutdown` com o token, e desligamento gracioso (`server.shutdown=graceful`), que fecha o banco corretamente.

**Observabilidade:** logs no console e em arquivo rotativo. O Actuator expõe só `health` (com as probes de readiness), `info` (versão, para o hub exibir) e `shutdown`.
