# Testes e qualidade

Estratégia de testes e regras de qualidade da Minha Livraria, com exemplos. As decisões e as alternativas descartadas estão no [ADR-0007](adr/0007-testes-e-qualidade.md).

## Princípios

- **Testar comportamento, não implementação.** O teste descreve o que o sistema faz, não como o código está organizado por dentro.
- **Mocks só em três situações:**

  | Situação | Exemplo |
  |---|---|
  | Fronteira externa | Open Library, relógio (`Clock`) e, quando necessário, o sistema de arquivos |
  | Isolar a camada de um teste de slice | o `@WebMvcTest` simula o serviço, porque testa só o contrato HTTP |
  | API pública de outro módulo, num teste de módulo | o `@ApplicationModuleTest` do `reading` simula o `BookCatalog` de `books` |

- **Fora dessas situações, nada é simulado.** Repositórios e consultas rodam contra o H2 de verdade, em memória e com as mesmas migrations do Flyway. Teste de regra de negócio nunca simula repositório.
- **Cada regra é protegida pelo tipo de teste mais barato que a cobre.** A mesma regra não é testada em três camadas.
- **Nomes em inglês, descrevendo comportamento:**
  - Java: `shouldThrowConflictWhenIsbnAlreadyExists`.
  - Front: `it('returns page 0 when value is not a number')`.
- **Dados de teste por builders** (`BookFixtures.aBook().withTitle("Dom Casmurro")`), sem estado compartilhado entre testes. Consultas SQL usam scripts `@Sql` pequenos, um por cenário.
- **Datas sob controle:** todo teste que depende de "hoje" usa um `Clock` fixo.

## Back-end

| Tipo | O que protege | Ferramenta | Sufixo |
|---|---|---|---|
| Domínio | invariantes das entidades e validadores (ISBN, meio ponto da nota) | JUnit 6 + AssertJ, sem Spring | `Test` |
| Web | contrato HTTP: status, JSON, validação, Problem Details, `Location` | `@WebSliceTest` (o `@WebMvcTest` do projeto) + `MockMvcTester`, serviço com `@MockitoBean` | `Test` |
| Persistência e consultas | JPQL, SQL do `JdbcClient` (`shelf`, estatísticas) e constraints do banco | `@DataJpaTest` / `@JdbcTest` com Flyway no H2 em memória | `Test` |
| Segurança local | filtro de `Host`, `X-Requested-By` e token do shutdown | `@WebSliceTest` com os filtros | `Test` |
| Open Library | conversão das respostas reais, incluindo as inconsistências da API | `MockRestServiceServer` com JSONs reais gravados como fixture | `Test` |
| Estrutura | fronteiras entre módulos e regras de camada | Spring Modulith (`verify()`) + ArchUnit | `Test` |
| Contrato | `docs/openapi.json` igual ao gerado pelo código | teste de snapshot (ADR-0005) | `Test` |
| Módulo | casos de uso completos dentro de um módulo | `@ApplicationModuleTest` (Spring Modulith) | `IT` |
| Resiliência | timeout, retry, 429 e limitador de taxa da Open Library | WireMock | `IT` |
| Schema | migrations aplicam do zero e as entidades batem com o banco | contexto com `ddl-auto=validate` | `IT` |
| Aplicação inteira | três ou quatro fluxos completos com o app no ar | `@SpringBootTest` (porta aleatória) + `RestTestClient` | `IT` |

- **`*Test`:** rodam no Surefire, na fase `test`, em segundos.
- **`*IT`:** rodam no Failsafe, na fase `verify`.

### Domínio

```java
class ReadingTest {

    private static final LocalDate NOV_1 = LocalDate.of(2026, 11, 1);

    @Test
    void shouldFinishReadingInProgress() {
        Reading reading = ReadingFixtures.inProgress().startedOn(NOV_1).build();

        reading.finish(NOV_1.plusDays(7));

        assertThat(reading.status()).isEqualTo(ReadingStatus.FINISHED);
        assertThat(reading.endDate()).isEqualTo(NOV_1.plusDays(7));
    }

    @Test
    void shouldRejectEndDateBeforeStartDate() {
        Reading reading = ReadingFixtures.inProgress().startedOn(NOV_1).build();

        assertThatThrownBy(() -> reading.finish(NOV_1.minusDays(1)))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        exception -> assertThat(exception.code()).isEqualTo("reading.end-before-start"));
    }
}
```

### Web

Testes de controller usam `@WebSliceTest`, que é o `@WebMvcTest` com as propriedades da aplicação registradas. Os filtros de segurança local sempre entram no slice e dependem delas.

Informe sempre `controllers`: sem ele, todos os controllers da aplicação entram no slice e exigem os serviços simulados. Testes de filtros e de configuração global usam `WebSliceTest.NoControllers.class`.

```java
@WebSliceTest(controllers = BookController.class)
class BookControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private BookService bookService;

    @Test
    void shouldReturnValidationProblemWhenTitleIsBlank() {
        assertThat(mvc.post()
                        .uri("/api/v1/books")
                        .header("X-Requested-By", "minha-livraria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "", "authorIds": [1] }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("validation");
    }
}
```

### Consultas do `shelf`

```java
@JdbcTest
@Import(ShelfQueries.class)
@Sql("/fixtures/shelf/books-with-readings.sql")
class ShelfQueriesTest {

    @Autowired
    private ShelfQueries queries;

    @Test
    void shouldReturnOnlyBooksBeingReadWhenFilteringByReading() {
        var page = queries.findBooks(ShelfFilter.withStatus(ShelfStatus.READING), PageRequest.of(0, 24));

        assertThat(page.content())
                .extracting(BookCardResponse::title)
                .containsExactly("Dom Casmurro");
    }
}
```

O `shelf` lê tabelas de vários módulos (ADR-0005). Por isso, toda consulta dele tem teste com SQL real. Uma mudança de schema em outro módulo quebra esses testes antes de chegar ao usuário.

### Módulo

```java
@ApplicationModuleTest
@Import(FixedClockConfiguration.class)
class ReadingModuleIT {

    @Autowired
    private ReadingService readings;

    @MockitoBean
    private BookCatalog bookCatalog;

    @Test
    void shouldReachFullProgressWhenReadingIsFinished() {
        given(bookCatalog.findSummary(42L)).willReturn(Optional.of(BookFixtures.summary(42L).pages(200)));

        var reading = readings.start(42L, new StartReadingRequest(LocalDate.of(2026, 11, 1), false));
        readings.addSession(reading.id(), SessionRequests.pagesRead(LocalDate.of(2026, 11, 2), 120));
        var finished = readings.finish(reading.id(), new FinishReadingRequest(LocalDate.of(2026, 11, 8)));

        assertThat(finished.progress().percent()).isEqualTo(100);
    }
}
```

O `@ApplicationModuleTest` sobe só o módulo `reading`. As dependências de outros módulos, como o `BookCatalog`, entram simuladas, o que também confirma que o módulo só depende da API pública delas.

### Open Library

As respostas reais da Open Library ficam gravadas em `src/test/resources/openlibrary/`, incluindo os casos estranhos (descrição como objeto, data em texto livre, livro sem capa):

```java
class OpenLibraryClientTest {

    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://openlibrary.org");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final OpenLibraryClient client = new OpenLibraryClient(
            HttpServiceProxyFactory.builderFor(RestClientAdapter.create(builder.build()))
                    .build()
                    .createClient(OpenLibraryApi.class));

    @Test
    void shouldReadDescriptionWhenItComesAsObject() {
        server.expect(requestTo("https://openlibrary.org/works/OL27448W.json"))
                .andRespond(withSuccess(
                        new ClassPathResource("openlibrary/work-description-object.json"),
                        MediaType.APPLICATION_JSON));

        OpenLibraryWork work = client.findWork("OL27448W");

        assertThat(work.description()).isNotBlank();
    }
}
```

Os testes de resiliência usam WireMock para simular lentidão, erro 5xx e 429. Eles verificam o número de tentativas, o tempo entre elas e a conversão para os códigos `openlibrary.*` do [catálogo de erros](erros.md).

## Front-end

| Tipo | O que protege | Ferramenta |
|---|---|---|
| Unitário | funções puras (`query-params`, ISBN, rótulos, resolução do tema), stores e interceptors | Vitest (jsdom) + `HttpTestingController` |
| Componente de UI | `input`/`output`, estados, teclado e ARIA dos componentes de `shared/ui` | Vitest em modo navegador (Chromium via Playwright) + Testing Library |
| Página | página + `httpResource` com respostas simuladas: carregando, vazio, erro, filtros na URL | Vitest + Testing Library + `HttpTestingController` |
| E2E | jornadas completas no app real | Playwright no Chromium |
| Acessibilidade | qualquer violação WCAG 2.1 AA (de qualquer gravidade) em todas as páginas, nos dois temas | `@axe-core/playwright` nos E2E |

- **Modo navegador nos componentes de UI:** o jsdom não implementa `<dialog>` nem a Popover API, que esses componentes usam.
  - `npm run test:unit` roda tudo em jsdom, menos `src/app/shared/ui/`.
  - `npm run test:browser` roda só `src/app/shared/ui/` no Chromium (configuração `browser` do `ng test`).
  - `npm test` roda os dois.
- **Testing Library:** as consultas são por papel e nome (`getByRole('button', { name: 'Wishlist' })`), como o usuário percebe a tela. Um botão sem nome acessível não é encontrado, e o teste falha.
- **`@testing-library/jest-dom`** adiciona matchers como `toHaveAttribute` e `toBeInTheDocument`.

### Unitário

```ts
import { describe, expect, it } from 'vitest';

describe('toPageIndex', () => {
  it('returns 0 when value is not a non-negative integer', () => {
    for (const value of [undefined, '', 'abc', '-1', '2.5']) {
      expect(toPageIndex(value)).toBe(0);
    }
  });

  it('returns the page when value is a valid index', () => {
    expect(toPageIndex('3')).toBe(3);
  });
});
```

### Componente de UI

```ts
describe('OwnershipTags', () => {
  it('marks "Tenho este livro" as pressed when the book is owned', async () => {
    await render(OwnershipTags, { inputs: { ownership: 'OWNED' } });

    expect(screen.getByRole('button', { name: 'Tenho este livro' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('emits WISHLIST when the wishlist tag is clicked', async () => {
    const ownershipChange = vi.fn();
    await render(OwnershipTags, { inputs: { ownership: 'NONE' }, on: { ownershipChange } });

    await userEvent.click(screen.getByRole('button', { name: 'Wishlist' }));

    expect(ownershipChange).toHaveBeenCalledWith('WISHLIST');
  });
});
```

### Página

```ts
describe('ShelfPage', () => {
  it('shows the empty state when the shelf has no books', async () => {
    await render(ShelfPage, { providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();

    http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush({ content: [], page: 0, size: 24, totalElements: 0, totalPages: 0 });

    expect(await screen.findByText('Nenhum livro encontrado.')).toBeInTheDocument();
  });
});
```

### E2E

**Jornadas do MVP**
1. Cadastrar um livro manualmente e encontrá-lo na Estante e na busca, inclusive buscando sem acento.
2. Importar um livro da Open Library.
3. Iniciar uma leitura, registrar sessões e concluir; conferir progresso, status e meta na Home.
4. Criar uma lista, adicionar livros e reordenar.
5. Trocar o tema e recarregar sem "piscar".

**Ambiente**
- Os testes rodam contra o **jar real**, com o perfil `e2e`.
- O perfil `e2e` usa uma pasta de dados temporária, carrega os dados de exemplo e aponta a Open Library para um WireMock local.
- O `webServer` do Playwright sobe o app e espera a readiness (`/actuator/health/readiness`).
- **Nenhum teste toca em `%USERPROFILE%\.minha-livraria`.** O `playwright.config.ts` passa uma pasta temporária nova a cada execução.
- O WireMock da Open Library e os dados de exemplo entram no perfil `e2e` junto com as funcionalidades deles (#21 e #20).
- `npm run e2e` (em `frontend/`) roda contra o jar em `backend/target/minha-livraria.jar`. Com `E2E_BASE_URL=http://localhost:4200`, roda contra o `npm start`, sem precisar do jar.

```ts
for (const theme of ['light', 'dark'] as const) {
  test(`shelf page has no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((preference) => {
      localStorage.setItem('ml-theme-preference', preference);
    }, theme.toUpperCase());
    await page.goto('/estante');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
```

As tags limitam a análise às regras do WCAG 2.1 A e AA. Dentro delas, qualquer violação falha o teste, seja qual for a gravidade que o axe atribui. As regras de "boas práticas" do axe, que não fazem parte do WCAG, ficam de fora.

## Dados de exemplo

Os perfis `dev` e `e2e` carregam um conjunto de dados de exemplo **apenas quando o banco está vazio**. Assim é possível desenvolver telas, fazer demos e tirar prints sem misturar com o acervo real.

- **Livros de domínio público:** Machado de Assis (*Dom Casmurro*, *Memórias Póstumas de Brás Cubas*, *Quincas Borba*), Aluísio Azevedo (*O Cortiço*), José de Alencar (*Iracema*, *O Guarani*) e Lima Barreto (*Triste Fim de Policarpo Quaresma*).
- Autores, editoras, gêneros e subgêneros, uma série, leituras em todos os status, sessões espalhadas pelos últimos meses (para o mapa de calor), resenhas, listas e metas.
- **Sem capas:** o front mostra as capas placeholder do design system.

O carregador fica num componente ativo só nos perfis `dev` e `e2e` (`@Profile({"dev", "e2e"})`). Nunca roda em produção.

## Qualidade automatizada

| Item | Regra |
|---|---|
| Cobertura (JaCoCo) | mínimo de 80% de linhas nos pacotes `domain` e `application`. Ficam de fora: configuração, records de DTO e código gerado. O build falha abaixo disso. |
| SonarQube Cloud | quality gate padrão ("Sonar way") em todo PR: nenhum problema novo de confiabilidade ou segurança, cobertura ≥ 80% e duplicação ≤ 3% no código novo, e hotspots de segurança revisados |
| Java | Spotless (palantir-java-format) em modo check e NullAway no perfil de CI |
| Front | `tsc` strict, ESLint, Prettier em modo check, Stylelint e budgets do bundle |
| Dependências | alertas do Dependabot e revisão de dependências nos PRs |

O front gera relatório de cobertura (Vitest com v8), enviado ao Sonar. O gate do front é o do código novo, no Sonar.

**Vigência:** estas regras automáticas só passam a bloquear PRs quando os pipelines de CI e a integração com o Sonar estiverem configurados (Seção 9 do planejamento). Até lá, ninguém marca o item de CI e Sonar no checklist.

## Definition of Done

Todo PR que muda código cumpre:

- [ ] Comportamento novo coberto pelo tipo de teste certo das tabelas acima
- [ ] Código de erro novo registrado em [`erros.md`](erros.md)
- [ ] `docs/openapi.json` atualizado, se o contrato mudou
- [ ] Componente novo testado por teclado e com nome acessível
- [ ] CI verde e quality gate do Sonar aprovado (enquanto não estiverem configurados, o item fica desmarcado)

A lista também está no template de pull request.
