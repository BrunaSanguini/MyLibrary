import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookPage from './book-page';

const FELLOWSHIP = {
  id: 42,
  title: 'A Sociedade do Anel',
  subtitle: 'O Senhor dos Anéis',
  authors: [{ id: 7, name: 'J. R. R. Tolkien' }],
  publisher: { id: 2, name: 'HarperCollins Brasil' },
  series: { id: 3, name: 'O Senhor dos Anéis', position: 1, totalVolumes: 3 },
  genres: [
    { id: 1, name: 'Fantasia' },
    { id: 4, name: 'Alta fantasia', parentId: 1 },
  ],
  isbn13: '9788595084742',
  pageCount: 576,
  publishedYear: 2019,
  languageCode: 'por',
  synopsis: 'Uma jornada até a Montanha da Perdição.',
  ownership: 'NONE',
  favorite: false,
};

const CARD = {
  id: 43,
  title: 'As Duas Torres',
  authors: ['J. R. R. Tolkien'],
  status: 'WANT_TO_READ',
  genres: ['Alta fantasia'],
  ownership: 'NONE',
  favorite: false,
  series: { id: 3, name: 'O Senhor dos Anéis', position: 2 },
};

/**
 * jsdom has no IntersectionObserver, which is what `@defer (on viewport)` waits for. This one
 * keeps the callbacks and only reports "in view" when the test scrolls to the end.
 */
const reports: (() => void)[] = [];

class ManualIntersectionObserver {
  private readonly targets: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    reports.push(() =>
      callback(
        this.targets.map(
          (target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry,
        ),
        this as unknown as IntersectionObserver,
      ),
    );
  }

  observe(target: Element): void {
    this.targets.push(target);
  }

  unobserve(target: Element): void {
    this.targets.splice(this.targets.indexOf(target), 1);
  }

  disconnect(): void {
    this.targets.length = 0;
  }
}

function scrollToTheEnd(): void {
  for (const report of reports) {
    report();
  }
}

beforeEach(() => {
  reports.length = 0;
  vi.stubGlobal('IntersectionObserver', ManualIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const NO_REVIEW = {
  body: { code: 'review.not-found', detail: 'Este livro ainda não tem resenha.' },
  failure: { status: 404, statusText: 'Not Found' },
};

const READING = {
  id: 9,
  bookId: 42,
  status: 'IN_PROGRESS',
  startDate: '2026-11-01',
  endDate: null,
  reread: false,
  progress: { pagesRead: 120, pageCount: 576, percent: 20 },
  sessionCount: 5,
};

const FINISHED = {
  ...READING,
  id: 8,
  status: 'FINISHED',
  startDate: '2025-01-02',
  endDate: '2025-02-10',
  progress: { pagesRead: 576, pageCount: 576, percent: 100 },
};

const REVIEW = {
  bookId: 42,
  rating: 4.5,
  content: 'Um clássico que envelhece bem.',
  updatedAt: '2026-11-08T21:15:00Z',
};

/**
 * Opens /livros/:id and answers its three requests: the book, with the given body or failure, its
 * readings and its review (none of either, unless the test says otherwise).
 */
async function openBook(
  url = '/livros/42',
  body: object = FELLOWSHIP,
  failure?: { status: number; statusText: string },
  reading: { readings?: object[]; review?: object } = {},
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'livros/:id', component: BookPage },
          { path: 'livros/:id/leitura', children: [] },
          { path: 'estante', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/books/42').flush(body, failure);
  http.expectOne('/api/v1/books/42/readings').flush(reading.readings ?? []);
  if (reading.review) {
    http.expectOne('/api/v1/books/42/review').flush(reading.review);
  } else {
    http.expectOne('/api/v1/books/42/review').flush(NO_REVIEW.body, NO_REVIEW.failure);
  }
  await harness.fixture.whenStable();
  return { harness, http };
}

const record = () => screen.getByRole('region', { name: 'Ficha de leitura' });
const reviewRegion = () => screen.getByRole('region', { name: 'Minha resenha' });

describe('BookPage', () => {
  it('shows the book with its catalog links', async () => {
    await openBook();

    expect(
      screen.getByRole('heading', { name: 'A Sociedade do Anel', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'J. R. R. Tolkien' })).toHaveAttribute(
      'href',
      '/autores/7',
    );
    expect(screen.getByRole('link', { name: 'HarperCollins Brasil' })).toHaveAttribute(
      'href',
      '/editoras/2',
    );
    expect(screen.getByRole('link', { name: 'Alta fantasia' })).toHaveAttribute(
      'href',
      '/generos/4',
    );
  });

  it('shows the genres and the subgenres in rows of their own', async () => {
    await openBook();

    const genres = screen.getByRole('list', { name: 'Gêneros' });
    const subgenres = screen.getByRole('list', { name: 'Subgêneros' });
    expect(within(genres).getByRole('link').textContent).toBe('Fantasia');
    expect(within(subgenres).getByRole('link').textContent).toBe('Alta fantasia');
  });

  it('shows the trail from the shelf to the book', async () => {
    await openBook();

    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(within(trail).getByRole('link', { name: 'Estante' })).toHaveAttribute(
      'href',
      '/estante',
    );
    expect(within(trail).getByText(FELLOWSHIP.title)).toHaveAttribute('aria-current', 'page');
  });

  it('shows where the book sits in its series', async () => {
    await openBook();

    expect(screen.getByRole('link', { name: 'O Senhor dos Anéis' })).toHaveAttribute(
      'href',
      '/series/3',
    );
    expect(screen.getByText('Livro 1 de 3')).toBeInTheDocument();
  });

  it('lists only the details the book has, with the language spelled out', async () => {
    await openBook();

    expect(screen.getByText('Português')).toBeInTheDocument();
    // Once in the details and once in the reading record.
    expect(screen.getAllByText('576')).toHaveLength(2);
    expect(screen.getByText('9788595084742')).toBeInTheDocument();
    expect(screen.queryByText('ISBN-10')).not.toBeInTheDocument();
  });

  it('offers the state tags as toggles that say whether they are pressed', async () => {
    await openBook();

    for (const name of ['Tenho este livro', 'Wishlist', 'Favorito']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('marks the book as owned at once and tells the server', async () => {
    const { http } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Tenho este livro' }));

    expect(screen.getByRole('button', { name: 'Tenho este livro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const request = http.expectOne('/api/v1/books/42/ownership');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ownership: 'OWNED' });
  });

  it('turns ownership off when the pressed tag is clicked again', async () => {
    const { http } = await openBook('/livros/42', { ...FELLOWSHIP, ownership: 'WISHLIST' });

    await userEvent.click(screen.getByRole('button', { name: 'Wishlist' }));

    expect(http.expectOne('/api/v1/books/42/ownership').request.body).toEqual({
      ownership: 'NONE',
    });
  });

  it('adds and removes the favorite with the matching verb', async () => {
    const { http } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Favorito' }));
    const add = http.expectOne('/api/v1/books/42/favorite');
    expect(add.request.method).toBe('PUT');
    add.flush(null);

    await userEvent.click(screen.getByRole('button', { name: 'Favorito' }));

    expect(http.expectOne('/api/v1/books/42/favorite').request.method).toBe('DELETE');
  });

  it('goes back to what is saved and says why when the server refuses', async () => {
    const { http, harness } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Favorito' }));
    http
      .expectOne('/api/v1/books/42/favorite')
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
        { status: 500, statusText: 'Server Error' },
      );
    TestBed.tick();
    http.expectOne('/api/v1/books/42').flush(FELLOWSHIP);
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(screen.getByRole('button', { name: 'Favorito' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('links to the edit form', async () => {
    await openBook();

    expect(screen.getByRole('link', { name: 'Editar informações' })).toHaveAttribute(
      'href',
      '/livros/42/editar',
    );
  });

  it('asks before deleting, and only deletes once confirmed', async () => {
    const { http, harness } = await openBook();
    // jsdom has no modal dialogs, and the dialog itself is covered in the browser suite.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };

    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));
    http.expectNone({ method: 'DELETE', url: '/api/v1/books/42' });

    const dialog = screen.getByRole('dialog', { name: 'Excluir este livro?' });
    await userEvent.click(
      Array.from(dialog.querySelectorAll('button')).find(
        (button) => button.textContent.trim() === 'Excluir livro',
      )!,
    );
    http.expectOne({ method: 'DELETE', url: '/api/v1/books/42' }).flush(null);
    await harness.fixture.whenStable();

    // The page navigates after the response, one async step later.
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/estante'));
  });

  it('says the book is not in the collection when the API answers 404', async () => {
    await openBook(
      '/livros/42',
      { code: 'book.not-found', detail: 'O livro solicitado não existe.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(screen.getByRole('heading', { name: 'Livro não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para a Estante' })).toHaveAttribute(
      'href',
      '/estante',
    );
  });

  it('offers to try again on any other failure', async () => {
    await openBook(
      '/livros/42',
      { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('shows the reading record of a book that was never read', async () => {
    await openBook();

    expect(within(record()).getByText('Quero ler')).toBeInTheDocument();
    expect(within(record()).getByText('Sem nota ainda')).toBeInTheDocument();
    expect(within(record()).getByText('Leituras').nextElementSibling).toHaveTextContent('0');
    expect(within(record()).queryByText('Relido')).not.toBeInTheDocument();
    expect(within(record()).getByRole('link', { name: 'Começar a ler' })).toHaveAttribute(
      'href',
      '/livros/42/leitura',
    );
  });

  it('shows the reading in progress with its start, pages and progress', async () => {
    await openBook('/livros/42', FELLOWSHIP, undefined, { readings: [READING] });

    expect(within(record()).getByText('Lendo')).toBeInTheDocument();
    expect(within(record()).getByText('1 de novembro de 2026')).toBeInTheDocument();
    expect(within(record()).getByText('120 de 576')).toBeInTheDocument();
    expect(within(record()).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
    expect(within(record()).queryByText('Fim')).not.toBeInTheDocument();
    expect(within(record()).getByRole('link', { name: 'Continuar leitura' })).toBeInTheDocument();
  });

  it('shows a finished book with its dates, the rating and how many times it was read', async () => {
    await openBook('/livros/42', FELLOWSHIP, undefined, { readings: [FINISHED], review: REVIEW });

    expect(within(record()).getByText('Lido')).toBeInTheDocument();
    expect(within(record()).getByText('2 de janeiro de 2025')).toBeInTheDocument();
    expect(within(record()).getByText('10 de fevereiro de 2025')).toBeInTheDocument();
    expect(within(record()).getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(within(record()).getByText('Leituras').nextElementSibling).toHaveTextContent('1');
    expect(within(record()).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(record()).getByRole('link', { name: 'Registrar leitura' })).toBeInTheDocument();
  });

  it('seals as reread a book finished more than once', async () => {
    await openBook('/livros/42', FELLOWSHIP, undefined, {
      readings: [FINISHED, { ...FINISHED, id: 7, endDate: '2019-07-01' }],
    });

    expect(within(record()).getByText('Relido')).toBeInTheDocument();
    expect(within(record()).getByText('Leituras').nextElementSibling).toHaveTextContent('2');
  });

  it('seals as reread a reading marked as one', async () => {
    await openBook('/livros/42', FELLOWSHIP, undefined, {
      readings: [{ ...READING, reread: true }],
    });

    expect(within(record()).getByText('Relido')).toBeInTheDocument();
  });

  it('invites a review, without any error, when the book has none', async () => {
    await openBook();

    expect(
      within(reviewRegion()).getByText(/Você ainda não avaliou este livro/),
    ).toBeInTheDocument();
    expect(
      within(reviewRegion()).getByRole('button', { name: 'Escrever resenha' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the saved review', async () => {
    await openBook('/livros/42', FELLOWSHIP, undefined, { review: REVIEW });

    expect(within(reviewRegion()).getByText('Um clássico que envelhece bem.')).toBeInTheDocument();
    expect(within(reviewRegion()).getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(
      within(reviewRegion()).getByRole('button', { name: 'Editar resenha' }),
    ).toBeInTheDocument();
  });

  it('saves a new review and shows it, also in the reading record', async () => {
    const { http, harness } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Escrever resenha' }));
    await userEvent.type(screen.getByLabelText('O que você achou?'), 'Um clássico.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resenha' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/books/42/review' });
    expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({ content: 'Um clássico.' });
    request.flush(
      { ...REVIEW, rating: null, content: 'Um clássico.' },
      { status: 201, statusText: 'Created' },
    );
    await vi.waitFor(() => {
      TestBed.tick();
      http
        .expectOne({ method: 'GET', url: '/api/v1/books/42/review' })
        .flush({ ...REVIEW, content: 'Um clássico.' });
    });
    await harness.fixture.whenStable();

    expect(within(reviewRegion()).getByText('Um clássico.')).toBeInTheDocument();
    expect(within(record()).getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
  });

  it('refuses an empty review before sending anything', async () => {
    const { http } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Escrever resenha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resenha' }));

    expect(screen.getByText('Dê uma nota, escreva um texto ou os dois.')).toBeInTheDocument();
    expect(screen.getByLabelText('O que você achou?')).toHaveAttribute(
      'aria-describedby',
      'erro-resenha',
    );
    http.expectNone({ method: 'PUT', url: '/api/v1/books/42/review' });
  });

  it('starts the edit from the saved review and gives up on cancel', async () => {
    await openBook('/livros/42', FELLOWSHIP, undefined, { review: REVIEW });

    await userEvent.click(screen.getByRole('button', { name: 'Editar resenha' }));

    expect(screen.getByLabelText('O que você achou?')).toHaveValue(
      'Um clássico que envelhece bem.',
    );
    expect(screen.getByRole('slider', { name: 'Nota' })).toHaveAttribute(
      'aria-valuetext',
      '4,5 de 5 estrelas',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('O que você achou?')).not.toBeInTheDocument();
    expect(within(reviewRegion()).getByText('Um clássico que envelhece bem.')).toBeInTheDocument();
  });

  it('takes the rating away with the button, keeping the text', async () => {
    const { http } = await openBook('/livros/42', FELLOWSHIP, undefined, { review: REVIEW });

    await userEvent.click(screen.getByRole('button', { name: 'Editar resenha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tirar nota' }));

    expect(screen.getByRole('slider', { name: 'Nota' })).toHaveAttribute(
      'aria-valuetext',
      'Sem nota',
    );
    expect(screen.queryByRole('button', { name: 'Tirar nota' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resenha' }));
    const request = http.expectOne({ method: 'PUT', url: '/api/v1/books/42/review' });
    expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({
      content: 'Um clássico que envelhece bem.',
    });
  });

  it('keeps the form open and says why when the review is refused', async () => {
    const { http, harness } = await openBook('/livros/42', FELLOWSHIP, undefined, {
      review: REVIEW,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Editar resenha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resenha' }));
    http
      .expectOne({ method: 'PUT', url: '/api/v1/books/42/review' })
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado.' },
        { status: 500, statusText: 'Server Error' },
      );
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado.'));
    expect(screen.getByLabelText('O que você achou?')).toBeInTheDocument();
  });

  it('deletes the review and goes back to the invitation', async () => {
    const { http, harness } = await openBook('/livros/42', FELLOWSHIP, undefined, {
      review: REVIEW,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Editar resenha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir resenha' }));
    http.expectOne({ method: 'DELETE', url: '/api/v1/books/42/review' }).flush(null);
    await vi.waitFor(() => {
      TestBed.tick();
      http
        .expectOne({ method: 'GET', url: '/api/v1/books/42/review' })
        .flush(NO_REVIEW.body, NO_REVIEW.failure);
    });
    await harness.fixture.whenStable();

    expect(screen.getByRole('button', { name: 'Escrever resenha' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not fetch the related books before the end of the page is in view', async () => {
    const { http } = await openBook();

    http.expectNone('/api/v1/shelf/books/42/related');
  });

  it('shows the rest of the series and the similar books once they are in view', async () => {
    const { http, harness } = await openBook();

    scrollToTheEnd();
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/shelf/books/42/related').flush({
        series: [{ ...CARD, id: 43, title: 'As Duas Torres' }],
        similar: [{ ...CARD, id: 50, title: 'O Nome do Vento', series: null }],
      });
    });
    await harness.fixture.whenStable();

    const series = screen.getByRole('region', { name: 'Mais da série' });
    expect(within(series).getByRole('link', { name: /As Duas Torres/ })).toHaveAttribute(
      'href',
      '/livros/43',
    );
    const similar = screen.getByRole('region', { name: 'Você também pode gostar' });
    expect(within(similar).getByRole('link', { name: /O Nome do Vento/ })).toBeInTheDocument();
  });

  it('shows nothing at the end when the book has no related books', async () => {
    const { http, harness } = await openBook();

    scrollToTheEnd();
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/shelf/books/42/related').flush({ series: [], similar: [] });
    });
    await harness.fixture.whenStable();

    expect(screen.queryByRole('region', { name: 'Mais da série' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Você também pode gostar' }),
    ).not.toBeInTheDocument();
  });

  it('knows about an unsaved review only while one is being written', async () => {
    const { harness } = await openBook();
    const page = harness.routeDebugElement!.componentInstance as HasUnsavedChanges;

    expect(page.hasUnsavedChanges()).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Escrever resenha' }));
    expect(page.hasUnsavedChanges()).toBe(false);

    await userEvent.type(screen.getByLabelText('O que você achou?'), 'Um clássico.');
    expect(page.hasUnsavedChanges()).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(page.hasUnsavedChanges()).toBe(false);
  });
});
