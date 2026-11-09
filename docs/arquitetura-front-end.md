# Arquitetura do front-end

Como o código do front-end (Angular 22) é organizado, com exemplos. As decisões e as alternativas descartadas estão no [ADR-0006](adr/0006-arquitetura-do-front-end.md). A identidade visual vem do design system da Minha Livraria (dark academia, Cormorant Garamond e Mulish, tema claro e escuro).

## Estrutura de pastas

Segue o [style guide oficial](https://angular.dev/style-guide): organização por funcionalidade, sem pastas por tipo de arquivo (`components/`, `services/`).

```
frontend/
├─ .browserslistrc
├─ proxy.conf.json
└─ src/
   ├─ main.ts · index.html
   ├─ styles/
   │  ├─ tokens.css           tokens do design system
   │  ├─ base.css             reset, tipografia, foco visível, movimento reduzido
   │  └─ styles.css           importa fontes, tokens e base
   └─ app/
      ├─ app.ts · app.config.ts · app.routes.ts
      ├─ core/                singletons da aplicação
      │  ├─ api/              tipos gerados, clientes da API, interceptors, ApiError
      │  ├─ layout/           shell, header, painel de busca, mega-menu de gêneros
      │  ├─ theme/            tema claro/escuro
      │  └─ labels/           rótulos em português dos enums
      ├─ shared/
      │  └─ ui/               componentes visuais sem regra de negócio
      └─ features/
         ├─ home/
         ├─ shelf/            Minha Estante
         ├─ books/            página do livro, formulário, importação
         ├─ reading/          Registrar leitura
         ├─ catalogs/         Catálogos e páginas de autor, série, editora e gênero
         ├─ lists/
         ├─ goals/
         ├─ profile/
         └─ not-found/
```

Cada componente tem a própria pasta, com `.ts`, `.html`, `.css` e `.spec.ts`:

```
features/books/
├─ books.routes.ts
├─ book-page/
├─ book-form/
├─ book-import/
└─ reading-sheet/        ficha de leitura exibida na página do livro
```

**Regras de dependência**

| Pasta | Pode importar |
|---|---|
| `features/*` | `core`, `shared` e arquivos da própria feature (por caminho relativo) |
| `shared/ui` | só `shared` |
| `core` | `shared` |

- Uma feature nunca importa outra; o que for comum vai para `shared/ui` ou `core/api`.
- A regra é garantida pelo ESLint (`no-restricted-imports` bloqueia `@features/*`, exceto no `app.routes.ts`).
- Aliases no `tsconfig.json`: `@core/*`, `@shared/*` e `@features/*`.

**Clientes da API ficam em `core/api`**, e não dentro de cada feature, porque várias telas usam os mesmos recursos. A Home, por exemplo, consulta estante, metas e listas.

## Configuração da aplicação

```ts
registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([requestedByInterceptor, problemDetailsInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
```

O zoneless e o OnPush já são o padrão no Angular 22, então não aparecem na configuração.

## Componentes

| Tipo | Onde | Responsabilidade |
|---|---|---|
| Página | `features/*` (componente de rota) | busca dados, reage à URL e orquestra os componentes |
| Componente de UI | `shared/ui` | recebe `input()`, emite `output()`; não injeta serviços |

Isso deixa os componentes de UI reaproveitáveis em qualquer tela e testáveis sem mock de serviço.

Base de todos os componentes:
- standalone e OnPush;
- `input()`, `output()` e `model()` em vez de decorators;
- `computed()` para derivados;
- control flow `@if`, `@for` e `@switch`;
- `@defer` para seções pesadas abaixo da dobra (mapa de calor, gráficos, livros relacionados).

### Página

Os filtros da Estante ficam na URL e chegam como `input()` (via `withComponentInputBinding`). Quando um filtro muda, o `httpResource` busca de novo sozinho.

A URL é editável por quem usa, então todo parâmetro passa por uma função de conversão que descarta valores inválidos antes de chegar à requisição. O back valida de novo.

```ts
@Component({
  selector: 'ml-shelf-page',
  imports: [BookCard, BookGridSkeleton, Paginator, EmptyState, ErrorState],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
})
export default class ShelfPage {
  readonly q = input(undefined, { transform: toSearchTerm });
  readonly status = input(undefined, { transform: toShelfStatus });
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly shelfApi = inject(ShelfApi);

  protected readonly books = httpResource<PageResponse<BookCardResponse>>(() =>
    this.shelfApi.booksRequest({ q: this.q(), status: this.status(), page: this.page() }),
  );

  protected changePage(page: number): void {
    this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }
}
```

As funções de conversão ficam em `core/api/query-params.ts`. Recebem `unknown`, porque um parâmetro repetido na URL (`?page=1&page=2`) chega como lista:

```ts
const PAGE_INDEX = /^\d{1,9}$/;

export function toPageIndex(value: unknown): number {
  return typeof value === 'string' && PAGE_INDEX.test(value) ? Number(value) : 0;
}

export function toSearchTerm(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const term = value.trim().slice(0, 200);
  return term === '' ? undefined : term;
}

export function toOneOf<T extends string>(allowed: readonly T[]): (value: unknown) => T | undefined {
  return (value) => allowed.find((option) => option === value);
}
```

Cada enum ganha sua conversão a partir de `toOneOf`:

```ts
const SHELF_STATUSES = ['WANT_TO_READ', 'READING', 'READ', 'ABANDONED'] as const satisfies readonly ShelfStatus[];
const toShelfStatus = toOneOf(SHELF_STATUSES);
```

`?page=abc` vira a página 0, e `?status=XYZ` é ignorado. Nada inválido chega à requisição.

A página da rota usa `export default`, porque é assim que o `loadComponent` das rotas a importa (veja [Rotas](#rotas)). Os demais componentes usam export nomeado.

```html
@if (books.hasValue()) {
  <ul class="grid">
    @for (book of books.value().content; track book.id) {
      <li><ml-book-card [book]="book" /></li>
    } @empty {
      <ml-empty-state message="Nenhum livro encontrado." />
    }
  </ul>
  <ml-paginator
    [page]="books.value().page"
    [totalPages]="books.value().totalPages"
    (pageChange)="changePage($event)"
  />
} @else if (books.error()) {
  <ml-error-state [error]="books.error()" (retry)="books.reload()" />
} @else {
  <ml-book-grid-skeleton />
}
```

### Componente de UI

```ts
@Component({
  selector: 'ml-book-card',
  imports: [RouterLink, BookCover, RatingStars, ProgressBar],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css',
})
export class BookCard {
  readonly book = input.required<BookCardResponse>();
  readonly favoriteToggle = output<number>();

  protected readonly statusLabel = computed(() => SHELF_STATUS_LABELS[this.book().status]);
}
```

## Estado

| Tipo de estado | Ferramenta |
|---|---|
| Dados do servidor numa tela | `httpResource`, reagindo a signals |
| Alterações (criar, editar, excluir) | `HttpClient` nos clientes de `core/api`; depois, `resource.reload()` |
| Estado global (perfil, tema) | serviço com signals privados graváveis e leitura pública |
| Filtros, ordenação e página | query params da URL |

Não há NgRx nem outra biblioteca de estado: não existe estado complexo compartilhado entre telas que justifique.

## API tipada

**Tipos gerados.** O script `api:types` gera `core/api/schema.d.ts` a partir do contrato do back:

```json
{
  "scripts": {
    "api:types": "openapi-typescript ../docs/openapi.json -o src/app/core/api/schema.d.ts",
    "prestart": "npm run api:types",
    "prebuild": "npm run api:types",
    "pretest": "npm run api:types"
  }
}
```

O arquivo gerado fica fora do Git. No código, os tipos são usados por alias:

```ts
type Schemas = components['schemas'];

export type BookCardResponse = Schemas['BookCardResponse'];
export type BookRequest = Schemas['BookRequest'];
export type PageResponse<T> = Omit<Schemas['PageResponse'], 'content'> & { content: T[] };
```

Os tipos da API mantêm o sufixo `Request`/`Response` do back. Os componentes não têm sufixo. Assim, `BookCardResponse` (dado) e `BookCard` (componente) não colidem.

**Clientes da API.** Um por recurso, em `core/api` (`books-api.ts`, `shelf-api.ts`, `reading-api.ts`...). Montam as requisições de leitura para o `httpResource` e executam as alterações com o `HttpClient`:

```ts
@Injectable({ providedIn: 'root' })
export class BooksApi {
  private readonly http = inject(HttpClient);

  detailRequest(id: number): HttpResourceRequest {
    return { url: `/api/v1/books/${id}` };
  }

  create(request: BookRequest): Observable<BookDetailResponse> {
    return this.http.post<BookDetailResponse>('/api/v1/books', request);
  }

  setFavorite(id: number, favorite: boolean): Observable<void> {
    const url = `/api/v1/books/${id}/favorite`;
    return favorite ? this.http.put<void>(url, null) : this.http.delete<void>(url);
  }
}
```

**Interceptors**

```ts
export const requestedByInterceptor: HttpInterceptorFn = (request, next) =>
  request.method === 'GET' || request.method === 'HEAD'
    ? next(request)
    : next(request.clone({ setHeaders: { 'X-Requested-By': 'minha-livraria' } }));

export const problemDetailsInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(catchError((error: unknown) => throwError(() => ApiError.from(error))));
```

O `ApiError` expõe `status`, `code`, `detail` e `fieldErrors`. Cada tela trata os códigos que conhece, por exemplo `review.not-found` vira "sem resenha". O componente `ml-error-state` exibe o `detail` dos demais.

Quando a resposta não é Problem Details, o próprio front cria o código:

| Código | Quando |
|---|---|
| `network.unavailable` | a requisição não chegou ao back (status 0), por exemplo com o aplicativo fechado |
| `response.unexpected` | o back respondeu com erro, mas sem Problem Details |

**Desenvolvimento.** O `ng serve` encaminha a API para o back-end:

```json
{
  "/api": { "target": "http://127.0.0.1:8471", "changeOrigin": true }
}
```

O `changeOrigin` reescreve o header `Host` para `127.0.0.1`, que o filtro de segurança do back aceita.

## Rotas

As rotas são texto visível na barra do navegador, então ficam em português. A API continua em inglês.

| Rota | Tela |
|---|---|
| `/` | Home |
| `/estante` | Minha Estante (filtros na URL) |
| `/livros/novo` | cadastro manual |
| `/livros/importar` | importação da Open Library |
| `/livros/:id` | página do livro |
| `/livros/:id/editar` | edição |
| `/livros/:id/leitura` | Registrar leitura |
| `/catalogos` | Catálogos |
| `/autores/:id` · `/series/:id` · `/editoras/:id` · `/generos/:id` | páginas de agrupamento |
| `/listas` · `/listas/:id` | Listas |
| `/metas` | Gerenciar metas |
| `/perfil` | Perfil |
| `**` | Página não encontrada |

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('@features/home/home-page/home-page'), title: 'Início' },
  { path: 'estante', loadComponent: () => import('@features/shelf/shelf-page/shelf-page'), title: 'Minha Estante' },
  { path: 'livros', loadChildren: () => import('@features/books/books.routes') },
  // ...
  { path: '**', loadComponent: () => import('@features/not-found/not-found-page/not-found-page'), title: 'Página não encontrada' },
];
```

Os componentes de página usam `export default` para permitir o `loadComponent` sem `.then()`.

- **Título da aba:** um `TitleStrategy` monta "Minha Estante · Minha Livraria".
- **View transitions:** a capa "voa" do card para a página do livro. Em navegadores sem suporte, a navegação acontece sem animação.
- **Rolagem:** restaurada ao voltar.
- **Alterações não salvas:** um guard (`canDeactivate`) avisa antes de sair dos formulários de livro, resenha e sessão.

## Formulários

- **Signal Forms** em todos os formulários: livro, importação, resenha, sessão, metas e perfil.
- **Validação espelhando o back:**
  - campos obrigatórios e tamanhos máximos;
  - dígito verificador do ISBN (em `shared`, com os mesmos casos de teste do back);
  - nota de 1 a 5 com meio ponto;
  - sessão com exatamente um entre páginas lidas e página atual.
- **Erros do servidor:**
  - os `fieldErrors` de um `400` aparecem no campo correspondente;
  - `409` e `422` aparecem como mensagem no topo do formulário, com o `detail` do Problem Details.

## Estilos

### CSS puro

Sem SCSS. Custom properties, nesting nativo, `color-mix()` e `calc()` cobrem o que o projeto precisa. As custom properties ainda mudam em tempo de execução, o que permite trocar o tema sem recompilar.

### Tokens

Os valores vêm do design system da Minha Livraria. Todos os tokens têm o prefixo `--ml-`:

```css
:root {
  --ml-font-display: 'Cormorant Garamond Variable', Georgia, serif;
  --ml-font-body: 'Mulish Variable', system-ui, sans-serif;

  --ml-space-4: 4px;
  --ml-space-8: 8px;
  --ml-space-12: 12px;
  --ml-space-16: 16px;
  --ml-space-24: 24px;
  --ml-space-32: 32px;
  --ml-space-40: 40px;
  --ml-space-56: 56px;
  --ml-space-72: 72px;

  --ml-radius-lg: 24px;
  --ml-radius-pill: 999px;
  --ml-content-width: 1240px;
}

:root,
[data-theme='light'] {
  color-scheme: light;
  --ml-color-bg: /* valor do design system */;
  --ml-color-surface: /* ... */;
  --ml-color-ink: /* ... */;
  --ml-color-accent: /* ... */;
  /* raised, muted, line, accent-ink, gold, glass, hero-*, book-* */
}

[data-theme='dark'] {
  color-scheme: dark;
  /* os mesmos tokens com os valores do tema escuro */
}
```

- O tema claro também fica em `:root`. Mesmo sem o atributo `data-theme`, a página sempre tem cores.
- O `color-scheme` faz o navegador ajustar barras de rolagem e controles nativos ao tema.

- Os componentes **só usam tokens**. O Stylelint barra cor fixa fora do `tokens.css` com as regras `color-no-hex`, `color-named` e `function-disallowed-list` (`rgb()`, `hsl()` e afins). As regras valem também nos atalhos, como `border: 1px solid var(--ml-color-line)`.
- As regras visuais do design system valem no código:
  - um único `accent` por área;
  - `gold` só em ornamentos;
  - capas em 2:3 com `--ml-shadow-book`;
  - pílula (`--ml-radius-pill`) em tudo que é clicável e pequeno.

### Tema

O `<html>` recebe `data-theme="light"` ou `"dark"`. O `ThemeStore` guarda a preferência do perfil (`LIGHT`, `DARK` ou `SYSTEM`) e resolve o tema aplicado.

Como todo estado global, ele expõe só leitura. A preferência muda pelo método `setPreference`:

```ts
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly systemQuery = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.systemQuery.matches);
  private readonly preferenceState = signal<ThemePreference>(readCachedPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed(() => {
    const preference = this.preference();
    if (preference === 'SYSTEM') {
      return this.systemDark() ? 'dark' : 'light';
    }
    return preference === 'DARK' ? 'dark' : 'light';
  });

  constructor() {
    this.systemQuery.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.resolved();
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    cachePreference(preference);
  }
}
```

Quem muda o tema (o toggle do header e a página de Perfil) salva no perfil com `PUT /profile` e depois chama `setPreference`. Ao carregar o perfil, o app também chama `setPreference` com o valor oficial.

**Sem "piscar" ao abrir:**
- O `localStorage` guarda a **preferência**, não o tema resolvido. Assim, quem usa `SYSTEM` acompanha o sistema operacional mesmo que ele tenha mudado desde a última visita.
- Um script mínimo no `<head>` do `index.html` resolve o tema antes da primeira pintura. Na primeira visita, sem nada guardado, ele trata a preferência como `SYSTEM`.

```html
<script>
  (() => {
    let preference = 'SYSTEM';
    try {
      preference = localStorage.getItem('ml-theme-preference') ?? 'SYSTEM';
    } catch {}
    const dark =
      preference === 'DARK' ||
      (preference !== 'LIGHT' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  })();
</script>
```

### Fontes e ícones

- **Fontes:** `@fontsource-variable/cormorant-garamond` e `@fontsource-variable/mulish`, importadas no `styles.css`. O build copia os arquivos `.woff2`, então nada depende de CDN.
- **Ícones:** componente `ml-icon` com SVGs locais (traço de 1,5 a 1,7 px, pontas arredondadas, `currentColor`). Botões só com ícone têm 44×44 px e `aria-label`. Não há biblioteca de ícones.

## Acessibilidade e sobreposições

| Necessidade | Solução |
|---|---|
| Modais (confirmar exclusão, nova lista) | `<dialog>` nativo com `showModal()`: foco preso, Esc e fundo prontos |
| Painel de busca e mega-menu de gêneros | Popover API nativa |
| Abas, menu, listbox, combobox (seletores de autor, editora e série) | `@angular/aria`: comportamento e ARIA, sem estilo |

Não entra biblioteca de UI.

Do design system:
- contraste mínimo de 4.5:1 nos dois temas;
- alvos de clique de 44 px;
- `aria-pressed` nas tags Tenho e Wishlist;
- `role="tab"` e `aria-selected` nas abas;
- animações desligadas com `prefers-reduced-motion`.

## Navegadores suportados

O app abre no navegador padrão do Windows. O `.browserslistrc` define o alvo do build:

```
last 2 Chrome versions
last 2 Edge versions
last 2 Firefox versions
Firefox ESR
```

| Recurso | Chrome / Edge | Firefox | Observação |
|---|---|---|---|
| `<dialog>` | ✅ | ✅ | |
| Popover API | ✅ | ✅ | |
| Nesting de CSS | ✅ | ✅ | |
| `color-mix()` | ✅ | ✅ | |
| View transitions | ✅ | ✅ nas versões atuais; ❌ no ESR | sem suporte, a navegação acontece sem animação |

## Qualidade

- **TypeScript:** `strict` + `noUncheckedIndexedAccess`.
- **Angular:** `strictTemplates` e budgets de tamanho do bundle como alerta.
- **Lint e formatação:**
  - **angular-eslint** (flat config) com typescript-eslint;
  - **Prettier** (aspas simples, 100 colunas);
  - **Stylelint** (`stylelint-config-standard` + regra de tokens).
- **Hooks de Git:** um `package.json` só de ferramentas na raiz do repositório, com **Husky**, **lint-staged** e **commitlint**.
  - O `pre-commit` roda ESLint, Prettier e Stylelint nos arquivos do front alterados.
  - O `commit-msg` valida o Conventional Commits com a lista de escopos do `CONTRIBUTING.md`.
  - A formatação do Java (Spotless) roda no CI, porque o Maven é lento demais para cada commit.
- **Português:** `LOCALE_ID` `pt-BR`, então datas e números saem como `08/11/2026` e `4,5`. Os textos ficam direto nos templates, já que o app só fala português. Os rótulos dos enums ficam centralizados em `core/labels`.
