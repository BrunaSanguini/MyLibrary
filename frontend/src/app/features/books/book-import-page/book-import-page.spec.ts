import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BookImportPage from './book-import-page';

const SEARCH = '/api/v1/books/import/search';
const PREVIEW = '/api/v1/books/import/preview';
const IMPORT = '/api/v1/books/import';

const HOBBIT_CANDIDATE = {
  editionKey: 'OL29823759M',
  workKey: 'OL27482W',
  title: 'O Hobbit',
  authors: ['J.R.R. Tolkien'],
  publishedYear: 2019,
  coverUrl: 'https://covers.openlibrary.org/b/id/14826646-M.jpg',
  libraryBookId: null,
};

const ANNOTATED_CANDIDATE = {
  editionKey: 'OL33891995M',
  workKey: 'OL27455W',
  title: 'The Annotated Hobbit',
  authors: ['J.R.R. Tolkien', 'Douglas A. Anderson'],
  publishedYear: 1988,
  coverUrl: null,
  libraryBookId: 7,
};

const HOBBIT_PREVIEW = {
  editionKey: 'OL29823759M',
  workKey: 'OL27482W',
  title: 'O Hobbit',
  subtitle: null,
  authors: ['J.R.R. Tolkien'],
  publishers: ['Harper Collins'],
  pageCount: 336,
  isbn13: '9788595084742',
  isbn10: '8595084742',
  publishedYear: 2019,
  languageCode: 'por',
  synopsis: 'Bilbo Bolseiro era um dos mais respeitáveis hobbits de todo o Condado.',
  coverUrl: 'https://covers.openlibrary.org/b/id/14826646-M.jpg',
  libraryBookId: null,
};

const UNAVAILABLE = {
  code: 'openlibrary.unavailable',
  detail: 'Sem conexão com a Open Library. O cadastro manual continua disponível.',
};

/** Matches a GET by its path and by every query parameter given. */
function get(url: string, params: Record<string, string>) {
  return (request: HttpRequest<unknown>) =>
    request.method === 'GET' &&
    request.url === url &&
    Object.entries(params).every(([name, value]) => request.params.get(name) === value);
}

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'livros/importar', component: BookImportPage },
          { path: 'livros/novo', children: [] },
          { path: 'livros/:id', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openResults() {
  const page = await open('/livros/importar?q=hobbit');
  page.http.expectOne(get(SEARCH, { q: 'hobbit' })).flush([HOBBIT_CANDIDATE, ANNOTATED_CANDIDATE]);
  await page.harness.fixture.whenStable();
  return page;
}

async function openPreview(preview: object = HOBBIT_PREVIEW) {
  const page = await open('/livros/importar?q=hobbit&edicao=OL29823759M');
  page.http.expectOne(get(PREVIEW, { editionKey: 'OL29823759M' })).flush(preview);
  await page.harness.fixture.whenStable();
  return page;
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Título, autor ou ISBN' });
const importButton = () => screen.getByRole('button', { name: 'Importar livro' });

describe('BookImportPage', () => {
  it('waits for a search before calling the Open Library', async () => {
    const { http } = await open('/livros/importar');

    expect(screen.getByRole('heading', { name: 'O que você quer importar?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prefiro cadastrar manualmente' })).toHaveAttribute(
      'href',
      '/livros/novo',
    );
    http.expectNone(() => true);
  });

  it('asks for some text before searching', async () => {
    const { http } = await open('/livros/importar');

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByText('Digite um título, um autor ou um ISBN.')).toBeInTheDocument();
    expect(searchBox()).toHaveAttribute('aria-describedby', 'erro-busca');
    expect(TestBed.inject(Router).url).toBe('/livros/importar');
    http.expectNone(() => true);
  });

  it('puts the search in the address and lists what the Open Library found', async () => {
    const { http, harness } = await open('/livros/importar');

    await userEvent.type(searchBox(), '  hobbit ');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livros/importar?q=hobbit'));
    TestBed.tick();
    http.expectOne(get(SEARCH, { q: 'hobbit' })).flush([HOBBIT_CANDIDATE, ANNOTATED_CANDIDATE]);
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Resultados', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'O Hobbit', level: 3 })).toBeInTheDocument();
    expect(screen.getByText(/J\.R\.R\. Tolkien, Douglas A\. Anderson/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalhes de O Hobbit' })).toHaveAttribute(
      'href',
      '/livros/importar?q=hobbit&edicao=OL29823759M',
    );
  });

  it('shows the searched text in the field after a reload', async () => {
    await openResults();

    expect(searchBox()).toHaveValue('hobbit');
  });

  it('marks a result that is already on the shelf and links to the book', async () => {
    await openResults();

    const results = screen.getByRole('list', { name: 'Resultados da busca' });
    const annotated = within(results)
      .getByRole('heading', { name: 'The Annotated Hobbit' })
      .closest('li')!;

    expect(within(annotated).getByText('Já está na sua estante')).toBeInTheDocument();
    expect(
      within(annotated).getByRole('link', { name: 'Abrir o livro The Annotated Hobbit' }),
    ).toHaveAttribute('href', '/livros/7');
    expect(within(annotated).queryByRole('link', { name: /Ver detalhes/ })).not.toBeInTheDocument();
  });

  it('says so when the search finds nothing', async () => {
    const { http, harness } = await open('/livros/importar?q=xyzzy');
    http.expectOne(get(SEARCH, { q: 'xyzzy' })).flush([]);
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Nenhum livro encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar manualmente' })).toHaveAttribute(
      'href',
      '/livros/novo',
    );
  });

  it('goes straight to the edition when the text is an ISBN', async () => {
    const { http, harness } = await open('/livros/importar?q=978-85-9508-474-2');

    http.expectNone((request) => request.url === SEARCH);
    http.expectOne(get(PREVIEW, { isbn: '9788595084742' })).flush(HOBBIT_PREVIEW);
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'O Hobbit', level: 2 })).toBeInTheDocument();
    // There is no list of results behind an ISBN, so there is nowhere to go back to.
    expect(screen.queryByRole('link', { name: 'Voltar aos resultados' })).not.toBeInTheDocument();
  });

  it('searches by title when the digits are not a valid ISBN', async () => {
    const { http } = await open('/livros/importar?q=9788595084740');

    http.expectNone((request) => request.url === PREVIEW);
    http.expectOne(get(SEARCH, { q: '9788595084740' })).flush([]);
  });

  it('ignores an edition in the address that is not an Open Library key', async () => {
    const { http } = await open('/livros/importar?q=hobbit&edicao=../works/OL1W');

    http.expectNone((request) => request.url === PREVIEW);
    http.expectOne(get(SEARCH, { q: 'hobbit' })).flush([]);
  });

  it('previews the picked edition and moves the focus to its title', async () => {
    await openPreview();

    const title = screen.getByRole('heading', { name: 'O Hobbit', level: 2 });
    await vi.waitFor(() => expect(title).toHaveFocus());
    const preview = screen.getByRole('article');
    expect(within(preview).getByText('J.R.R. Tolkien')).toBeInTheDocument();
    expect(within(preview).getByText('Harper Collins')).toBeInTheDocument();
    expect(within(preview).getByText('336')).toBeInTheDocument();
    expect(within(preview).getByText('9788595084742')).toBeInTheDocument();
    expect(within(preview).getByText(/Bilbo Bolseiro era um dos mais/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar aos resultados' })).toHaveAttribute(
      'href',
      '/livros/importar?q=hobbit',
    );
  });

  it('imports with the chosen classification and opens the new book', async () => {
    const { http, harness } = await openPreview();

    await userEvent.selectOptions(screen.getByLabelText('Este livro'), 'OWNED');
    await userEvent.click(importButton());

    const request = http.expectOne({ method: 'POST', url: IMPORT });
    expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({
      editionKey: 'OL29823759M',
      ownership: 'OWNED',
      genreIds: [],
    });
    request.flush({ id: 42, title: 'O Hobbit' });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livros/42'));
  });

  it('refuses a position without a series before sending anything', async () => {
    const { http } = await openPreview();

    await userEvent.type(screen.getByLabelText('Posição na série'), '1');
    await userEvent.click(importButton());

    expect(screen.getByText('Escolha a série antes de informar a posição.')).toBeInTheDocument();
    http.expectNone({ method: 'POST', url: IMPORT });
  });

  it('offers the book instead of the import when the edition is already on the shelf', async () => {
    await openPreview({ ...HOBBIT_PREVIEW, libraryBookId: 42 });

    expect(screen.getByRole('status')).toHaveTextContent('Já está na sua estante');
    expect(screen.getByRole('link', { name: 'Abrir o livro' })).toHaveAttribute(
      'href',
      '/livros/42',
    );
    expect(screen.queryByRole('button', { name: 'Importar livro' })).not.toBeInTheDocument();
  });

  it('shows the conflict and finds out which book it is when the import is refused', async () => {
    const { http, harness } = await openPreview();

    await userEvent.click(importButton());
    http
      .expectOne({ method: 'POST', url: IMPORT })
      .flush(
        { code: 'book.isbn-duplicated', detail: 'Já existe um livro com este ISBN-13 no acervo.' },
        { status: 409, statusText: 'Conflict' },
      );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Já existe um livro com este ISBN-13 no acervo.',
      ),
    );
    TestBed.tick();
    http
      .expectOne(get(PREVIEW, { editionKey: 'OL29823759M' }))
      .flush({ ...HOBBIT_PREVIEW, libraryBookId: 42 });
    await harness.fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Abrir o livro' })).toHaveAttribute(
      'href',
      '/livros/42',
    );
  });

  it('points to the manual form when there is no connection to the Open Library', async () => {
    const { http, harness } = await open('/livros/importar?q=hobbit');
    http
      .expectOne(get(SEARCH, { q: 'hobbit' }))
      .flush(UNAVAILABLE, { status: 503, statusText: 'Service Unavailable' });
    await harness.fixture.whenStable();

    const failure = screen.getByRole('alert');
    expect(failure).toHaveTextContent('Não foi possível buscar na Open Library');
    expect(failure).toHaveTextContent(UNAVAILABLE.detail);
    expect(within(failure).getByRole('link', { name: 'Cadastrar manualmente' })).toHaveAttribute(
      'href',
      '/livros/novo',
    );
  });

  it('searches again when asked to try again', async () => {
    const { http, harness } = await open('/livros/importar?q=hobbit');
    http
      .expectOne(get(SEARCH, { q: 'hobbit' }))
      .flush(UNAVAILABLE, { status: 503, statusText: 'Service Unavailable' });
    await harness.fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    TestBed.tick();
    http.expectOne(get(SEARCH, { q: 'hobbit' })).flush([HOBBIT_CANDIDATE]);
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'O Hobbit', level: 3 })).toBeInTheDocument();
  });

  it('points to the manual form when the Open Library takes too long on a preview', async () => {
    const { http, harness } = await open('/livros/importar?edicao=OL29823759M');
    http
      .expectOne(get(PREVIEW, { editionKey: 'OL29823759M' }))
      .flush(
        { code: 'openlibrary.timeout', detail: 'A Open Library não respondeu a tempo.' },
        { status: 504, statusText: 'Gateway Timeout' },
      );
    await harness.fixture.whenStable();

    const failure = screen.getByRole('alert');
    expect(failure).toHaveTextContent('A Open Library não respondeu a tempo.');
    expect(
      within(failure).getByRole('link', { name: 'Cadastrar manualmente' }),
    ).toBeInTheDocument();
  });

  it('does not blame the Open Library for a failure of the app itself', async () => {
    const { http, harness } = await open('/livros/importar?q=hobbit');
    http
      .expectOne(get(SEARCH, { q: 'hobbit' }))
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado.' },
        { status: 500, statusText: 'Server Error' },
      );
    await harness.fixture.whenStable();

    const failure = screen.getByRole('alert');
    expect(failure).toHaveTextContent('Algo deu errado.');
    expect(within(failure).queryByRole('link')).not.toBeInTheDocument();
  });

  it('says the ISBN is not at the Open Library and offers the manual form', async () => {
    const { http, harness } = await open('/livros/importar?q=9788595084742');
    http
      .expectOne(get(PREVIEW, { isbn: '9788595084742' }))
      .flush(
        { code: 'openlibrary.not-found', detail: 'A Open Library não tem esse ISBN.' },
        { status: 404, statusText: 'Not Found' },
      );
    await harness.fixture.whenStable();

    expect(
      screen.getByRole('heading', { name: 'Não encontramos esse livro na Open Library' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar manualmente' })).toHaveAttribute(
      'href',
      '/livros/novo',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Buscar pelo título' }));
    await harness.fixture.whenStable();

    const field = screen.getByLabelText('Título, autor ou ISBN');
    await vi.waitFor(() => expect(field).toHaveValue(''));
    expect(field).toHaveFocus();
    expect(TestBed.inject(Router).url).toBe('/livros/importar');
  });

  it('announces that it is searching while the Open Library answers', async () => {
    const { http } = await open('/livros/importar?q=hobbit');

    expect(screen.getByRole('status')).toHaveTextContent('Buscando na Open Library…');
    http.expectOne(get(SEARCH, { q: 'hobbit' })).flush([]);
  });
});
