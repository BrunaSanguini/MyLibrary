import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TODAY } from '@core/time/today';

import BookFormPage from './book-form-page';

/** jsdom has no modal dialogs; these do what the page needs from them. */
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

const HOBBIT_EDITION = {
  editionKey: 'OL7604539M',
  title: 'O Hobbit',
  subtitle: 'ou Lá e de volta outra vez',
  authors: ['J. R. R. Tolkien'],
  publishers: ['HarperCollins Brasil'],
  pageCount: 336,
  isbn13: '9788595084742',
  publishedYear: 2019,
  languageCode: 'por',
  synopsis: 'Bilbo sai de casa.',
  coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
};

const DUNE = {
  id: 42,
  title: 'Duna',
  authors: [{ id: 5, name: 'Frank Herbert' }],
  publishers: [
    { id: 3, name: 'Aleph' },
    { id: 8, name: 'Nova Fronteira' },
  ],
  genres: [{ id: 1, name: 'Ficção científica' }],
  isbn13: '9788576573135',
  ownership: 'OWNED',
  favorite: false,
};

function configure() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'estante/novo', component: BookFormPage },
          { path: 'livro/:id/editar', component: BookFormPage },
          { path: 'livro/:id', children: [] },
          { path: 'estante', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: TODAY, useValue: () => '2026-11-24' },
    ],
  });
}

async function openNew(url = '/estante/novo') {
  configure();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openEdit(book: object = DUNE) {
  configure();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/livro/42/editar');
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/books/42').flush(book);
  http.expectOne('/api/v1/books/42/readings').flush([]);
  await harness.fixture.whenStable();
  return { harness, http };
}

const save = () =>
  userEvent.click(screen.getByRole('button', { name: /^(Salvar livro|Salvar alterações)$/ }));

/** Picks an author already registered, the way the reader does: click the field, choose. */
async function pickAuthor(http: HttpTestingController, harness: RouterTestingHarness) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Autor(es) *' }));
  await vi.waitFor(() => {
    TestBed.tick();
    http
      .expectOne((request) => request.url === '/api/v1/authors')
      .flush({
        content: [{ id: 5, name: 'Frank Herbert' }],
        page: 0,
        size: 100,
        totalElements: 1,
        totalPages: 1,
      });
  });
  await harness.fixture.whenStable();
  await userEvent.click(await screen.findByRole('option', { name: 'Frank Herbert' }));
}

describe('BookFormPage', () => {
  it('opens as "Adicionar livro", with the trail and the search of the Open Library', async () => {
    await openNew();

    expect(screen.getByRole('heading', { level: 1, name: 'Adicionar livro' })).toBeInTheDocument();
    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(within(trail).getByRole('link', { name: 'Minha Estante' })).toHaveAttribute(
      'href',
      '/estante',
    );
    expect(within(trail).getByText('Adicionar livro')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('searchbox', { name: 'Buscar na Open Library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar e cadastrar outro' })).toBeInTheDocument();
  });

  it('asks for the title and for an author before sending anything, and counts the problems', async () => {
    const { http } = await openNew();

    await save();

    expect(screen.getByText('Informe o título do livro.')).toBeInTheDocument();
    expect(
      screen.getByText('Escolha ao menos um autor — ou cadastre um novo na própria lista.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Faltam 2 ajustes para salvar')).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toHaveAttribute('aria-describedby', 'erro-titulo');
    http.expectNone({ method: 'POST', url: '/api/v1/books' });
  });

  it('takes only whole numbers from 1 to 9999 as year and pages', async () => {
    await openNew();

    await userEvent.type(screen.getByLabelText('Páginas'), '0');
    await userEvent.tab();

    expect(screen.getByText('Número inteiro de 1 a 9999.')).toBeInTheDocument();
  });

  it('takes an ISBN of 10 or 13 digits, with hyphens as printed, and refuses a wrong one', async () => {
    await openNew();
    const isbn = screen.getByLabelText('ISBN · opcional');

    await userEvent.type(isbn, '978-85-9508-474-2');
    await userEvent.tab();
    expect(screen.queryByText(/ISBN inválido/)).not.toBeInTheDocument();

    await userEvent.clear(isbn);
    await userEvent.type(isbn, '9788595084743');
    await userEvent.tab();
    expect(screen.getByText('ISBN inválido: confira os 10 ou 13 dígitos.')).toBeInTheDocument();
  });

  it('takes several genres, each one a chip, and keeps the field open for another', async () => {
    const { http, harness } = await openNew();
    const tree = [
      { id: 1, name: 'Fantasia', bookCount: 2, subgenres: [] },
      { id: 2, name: 'Aventura', bookCount: 1, subgenres: [] },
    ];
    const pick = async (name: string) => {
      await userEvent.click(screen.getByRole('combobox', { name: 'Gêneros' }));
      await vi.waitFor(() => {
        TestBed.tick();
        http.match('/api/v1/genres').forEach((request) => request.flush(tree));
        expect(screen.getByRole('option', { name })).toBeInTheDocument();
      });
      await harness.fixture.whenStable();
      await userEvent.click(screen.getByRole('option', { name }));
    };

    await pick('Fantasia');
    expect(screen.getByRole('combobox', { name: 'Gêneros' })).toHaveAttribute(
      'placeholder',
      'Adicionar outro…',
    );
    await pick('Aventura');

    const chosen = screen.getByRole('list', { name: 'Gêneros escolhidos' });
    expect(
      within(chosen)
        .getAllByRole('listitem')
        .map((item) => item.textContent?.trim()),
    ).toEqual(['Fantasia', 'Aventura']);
    await userEvent.click(screen.getByRole('button', { name: 'Remover gênero Fantasia' }));
    expect(within(chosen).getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps the position closed until a series is chosen', async () => {
    await openNew();

    expect(screen.getByLabelText('Posição na série')).toBeDisabled();
    expect(screen.getByText('Escolha uma série antes')).toBeInTheDocument();
  });

  it('saves a book in a series without a position, which is optional', async () => {
    const { http } = await openEdit({
      ...DUNE,
      series: { id: 3, name: 'O Senhor dos Anéis', totalVolumes: 3 },
    });

    expect(screen.getByText('Opcional')).toBeInTheDocument();
    await save();

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/books/42' });
    expect(request.request.body).toMatchObject({ seriesId: 3, seriesPosition: undefined });
  });

  it('registers a book by hand, as one the reader has, and shows it saved', async () => {
    const { http, harness } = await openNew();

    await userEvent.type(screen.getByLabelText('Título *'), 'Duna');
    await pickAuthor(http, harness);
    await save();

    const request = http.expectOne({ method: 'POST', url: '/api/v1/books' });
    expect(request.request.body).toMatchObject({
      title: 'Duna',
      authorIds: [5],
      ownership: 'OWNED',
    });
    request.flush(DUNE, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();

    expect(
      await screen.findByRole('heading', { name: 'Livro salvo na sua estante' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Duna · Frank Herbert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver o livro' })).toHaveAttribute('href', '/livro/42');
    http.expectNone((candidate) => candidate.url.endsWith('/readings'));
  });

  it('registers the reading of section III with the book', async () => {
    const { http, harness } = await openNew();

    await userEvent.type(screen.getByLabelText('Título *'), 'Duna');
    await pickAuthor(http, harness);
    await userEvent.click(screen.getByRole('radio', { name: 'Lido' }));
    await userEvent.type(screen.getByLabelText('Comecei em'), '2026-10-01');
    await userEvent.type(screen.getByLabelText('Terminei em'), '2026-10-20');
    await save();
    http.expectOne({ method: 'POST', url: '/api/v1/books' }).flush(DUNE);

    const reading = await vi.waitFor(() =>
      http.expectOne({ method: 'POST', url: '/api/v1/books/42/readings' }),
    );
    expect(reading.request.body).toEqual({
      status: 'FINISHED',
      startDate: '2026-10-01',
      endDate: '2026-10-20',
    });
  });

  it('refuses dates in the future and an end before the start', async () => {
    await openNew();

    await userEvent.click(screen.getByRole('radio', { name: 'Lido' }));
    await userEvent.type(screen.getByLabelText('Comecei em'), '2026-12-01');
    await userEvent.tab();
    expect(screen.getByText('A data de início não pode ser no futuro.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Comecei em'));
    await userEvent.type(screen.getByLabelText('Comecei em'), '2026-10-10');
    await userEvent.type(screen.getByLabelText('Terminei em'), '2026-10-01');
    await userEvent.tab();
    expect(screen.getByText('O fim da leitura não pode ser antes do início.')).toBeInTheDocument();
  });

  it('hides the reading status of a book the reader does not have yet', async () => {
    const { http, harness } = await openNew();

    await userEvent.click(screen.getByRole('radio', { name: /Ainda não tenho/ }));

    expect(screen.queryByRole('radio', { name: 'Lido' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Título *'), 'Duna');
    await pickAuthor(http, harness);
    await save();
    const request = http.expectOne({ method: 'POST', url: '/api/v1/books' });
    expect(request.request.body).toMatchObject({ ownership: 'WISHLIST' });
    request.flush({ ...DUNE, ownership: 'WISHLIST' });

    expect(
      await screen.findByRole('heading', { name: 'Livro salvo na wishlist' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver a wishlist' })).toHaveAttribute(
      'href',
      '/estante?status=wishlist',
    );
  });

  it('saves and empties the form for the next book', async () => {
    const { http, harness } = await openNew();

    await userEvent.type(screen.getByLabelText('Título *'), 'Duna');
    await pickAuthor(http, harness);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar e cadastrar outro' }));
    http.expectOne({ method: 'POST', url: '/api/v1/books' }).flush(DUNE);

    expect(
      await screen.findByText('“Duna” foi salvo. Pode cadastrar o próximo.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toHaveValue('');
  });

  it('searches the Open Library only on Buscar, and fills section I with the chosen edition', async () => {
    const { http, harness } = await openNew();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar na Open Library' }),
      'hobbit',
    );
    http.expectNone((request) => request.url === '/api/v1/books/import/search');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    http
      .expectOne((request) => request.url === '/api/v1/books/import/search')
      .flush([
        {
          editionKey: 'OL7604539M',
          title: 'O Hobbit',
          authors: ['J. R. R. Tolkien'],
          publishedYear: 2019,
        },
      ]);
    await harness.fixture.whenStable();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Usar estes dados: O Hobbit' }),
    );
    http
      .expectOne((request) => request.url === '/api/v1/books/import/preview')
      .flush(HOBBIT_EDITION);
    await vi.waitFor(() => {
      http
        .expectOne((request) => request.url === '/api/v1/authors')
        .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      http
        .expectOne((request) => request.url === '/api/v1/publishers')
        .flush({
          content: [{ id: 2, name: 'HarperCollins Brasil' }],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        });
    });
    await vi.waitFor(() =>
      http
        .expectOne({ method: 'POST', url: '/api/v1/authors' })
        .flush({ id: 7, name: 'J. R. R. Tolkien' }),
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(screen.getByLabelText('Título *')).toHaveValue('O Hobbit'));
    expect(screen.getByLabelText('Páginas')).toHaveValue(336);
    expect(screen.getByLabelText('ISBN · opcional')).toHaveValue('9788595084742');
    expect(screen.getByRole('list', { name: 'Autores escolhidos' })).toHaveTextContent(
      'J. R. R. Tolkien',
    );
    expect(screen.getByRole('list', { name: 'Editora escolhida' })).toHaveTextContent(
      'HarperCollins Brasil',
    );
    expect(screen.getByText(/Capa trazida da Open Library/)).toBeInTheDocument();
  });

  it('imports the edition on save and then applies what the reader changed', async () => {
    const { http, harness } = await openNew('/estante/novo?q=9788595084742');

    expect(screen.getByRole('searchbox', { name: 'Buscar na Open Library' })).toHaveValue(
      '9788595084742',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    http
      .expectOne((request) => request.url === '/api/v1/books/import/preview')
      .flush(HOBBIT_EDITION);
    await harness.fixture.whenStable();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Usar estes dados: O Hobbit' }),
    );
    http
      .expectOne((request) => request.url === '/api/v1/books/import/preview')
      .flush(HOBBIT_EDITION);
    await vi.waitFor(() => {
      http
        .expectOne((request) => request.url === '/api/v1/authors')
        .flush({
          content: [{ id: 7, name: 'J. R. R. Tolkien' }],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        });
      http
        .expectOne((request) => request.url === '/api/v1/publishers')
        .flush({
          content: [{ id: 2, name: 'HarperCollins Brasil' }],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        });
    });
    await harness.fixture.whenStable();
    await vi.waitFor(() => expect(screen.getByLabelText('Título *')).toHaveValue('O Hobbit'));

    const title = screen.getByLabelText('Título *');
    await userEvent.clear(title);
    await userEvent.type(title, 'O Hobbit (ilustrado)');
    await save();

    const imported = http.expectOne({ method: 'POST', url: '/api/v1/books/import' });
    expect(imported.request.body).toMatchObject({ editionKey: 'OL7604539M', ownership: 'OWNED' });
    imported.flush({ ...DUNE, id: 77, title: 'O Hobbit' });
    const update = await vi.waitFor(() =>
      http.expectOne({ method: 'PUT', url: '/api/v1/books/77' }),
    );
    expect(update.request.body).toMatchObject({
      title: 'O Hobbit (ilustrado)',
      synopsis: 'Bilbo sai de casa.',
      authorIds: [7],
      publisherIds: [2],
    });
  });

  it('says when the Open Library found nothing, without blocking the form', async () => {
    const { http, harness } = await openNew();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar na Open Library' }),
      'tolkien',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    http.expectOne((request) => request.url === '/api/v1/books/import/search').flush([]);
    await harness.fixture.whenStable();

    expect(
      await screen.findByText(/Nada encontrado para “tolkien”. Confira a grafia/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toBeEnabled();
  });

  it('says when the Open Library is out of reach and offers to try again', async () => {
    const { http, harness } = await openNew();

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar na Open Library' }),
      'hobbit',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    http
      .expectOne((request) => request.url === '/api/v1/books/import/search')
      .flush(
        { code: 'openlibrary.unavailable', detail: 'A Open Library não respondeu.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await harness.fixture.whenStable();

    expect(
      await screen.findByText(/Não foi possível falar com a Open Library agora/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    http.expectOne((request) => request.url === '/api/v1/books/import/search');
  });

  it('asks before discarding what was filled in, and says nothing was saved', async () => {
    await openNew();

    await userEvent.type(screen.getByLabelText('Título *'), 'Duna');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const dialog = screen.getByRole('dialog', { name: 'Descartar este cadastro?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descartar' }));

    expect(screen.getByRole('heading', { name: 'Cadastro descartado' })).toBeInTheDocument();
    expect(screen.getByText(/Nada foi gravado/)).toBeInTheDocument();
  });

  it('leaves at once when nothing was filled in', async () => {
    await openNew();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/estante'));
  });

  it('fills the form with the book being edited, with no search and no reading status to pick', async () => {
    await openEdit();

    expect(screen.getByRole('heading', { level: 1, name: 'Editar livro' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toHaveValue('Duna');
    expect(screen.getByLabelText('ISBN · opcional')).toHaveValue('9788576573135');
    expect(screen.getByRole('list', { name: 'Autores escolhidos' })).toHaveTextContent(
      'Frank Herbert',
    );
    expect(
      screen.queryByRole('searchbox', { name: 'Buscar na Open Library' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Salvar e cadastrar outro' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Status de leitura:/)).toHaveTextContent('Quero ler');
  });

  it('saves the changes, keeping a co-edition and what the form does not show', async () => {
    const { http, harness } = await openEdit();
    const title = screen.getByLabelText('Título *');

    await userEvent.clear(title);
    await userEvent.type(title, 'Duna (edição revista)');
    await save();

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/books/42' });
    expect(request.request.body).toMatchObject({
      title: 'Duna (edição revista)',
      authorIds: [5],
      publisherIds: [3, 8],
      genreIds: [1],
      isbn13: '9788576573135',
      ownership: 'OWNED',
    });
    request.flush({ ...DUNE, title: 'Duna (edição revista)' });
    await harness.fixture.whenStable();

    expect(await screen.findByRole('heading', { name: 'Alterações salvas' })).toBeInTheDocument();
  });

  it('sends an emptied ISBN as absent, not as empty text', async () => {
    const { http } = await openEdit();

    await userEvent.clear(screen.getByLabelText('ISBN · opcional'));
    await save();

    // What matters is the wire: undefined is dropped when the body is serialized.
    const body = http.expectOne({ method: 'PUT', url: '/api/v1/books/42' }).request.body;
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty('isbn13');
  });

  it('puts a field error of the server on its field', async () => {
    const { http, harness } = await openEdit();

    await save();
    http.expectOne({ method: 'PUT', url: '/api/v1/books/42' }).flush(
      {
        code: 'validation',
        detail: 'Há campos inválidos.',
        errors: [{ field: 'isbn13', message: 'ISBN-13 inválido: confira os 13 dígitos.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByLabelText('ISBN · opcional')).toHaveAttribute(
        'aria-describedby',
        'erro-isbn',
      ),
    );
  });

  it('shows a conflict above the actions, with the detail the API wrote', async () => {
    const { http, harness } = await openEdit();

    await save();
    http
      .expectOne({ method: 'PUT', url: '/api/v1/books/42' })
      .flush(
        { code: 'book.isbn-duplicated', detail: 'Já existe um livro com este ISBN-13 no acervo.' },
        { status: 409, statusText: 'Conflict' },
      );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(
        screen.getByText('Já existe um livro com este ISBN-13 no acervo.'),
      ).toBeInTheDocument(),
    );
    expect(TestBed.inject(Router).url).toBe('/livro/42/editar');
  });

  it('counts removing an author as an unsaved change', async () => {
    const { harness } = await openEdit();
    const page = harness.routeDebugElement!.componentInstance as HasUnsavedChanges;

    expect(page.hasUnsavedChanges()).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Remover autor Frank Herbert' }));

    expect(page.hasUnsavedChanges()).toBe(true);
  });

  it('sends the cover after saving the book', async () => {
    const { http, harness } = await openEdit();

    await userEvent.upload(
      screen.getByLabelText('Capa'),
      new File(['png'], 'capa.png', { type: 'image/png' }),
    );
    await save();
    http.expectOne({ method: 'PUT', url: '/api/v1/books/42' }).flush(DUNE);
    await harness.fixture.whenStable();

    const upload = await vi.waitFor(() =>
      http.expectOne({ method: 'PUT', url: '/api/v1/books/42/cover' }),
    );
    expect(upload.request.body).toBeInstanceOf(FormData);
  });
});
