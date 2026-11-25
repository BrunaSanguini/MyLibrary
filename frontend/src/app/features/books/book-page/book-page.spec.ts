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
  publishers: [{ id: 2, name: 'HarperCollins Brasil' }],
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
 * Opens /livro/:id and answers its three requests: the book, with the given body or failure, its
 * readings and its review (none of either, unless the test says otherwise).
 */
async function openBook(
  url = '/livro/42',
  body: object = FELLOWSHIP,
  failure?: { status: number; statusText: string },
  reading: { readings?: object[]; review?: object; sessions?: object[] } = {},
) {
  stubModalDialogs();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'livro/:id', component: BookPage },
          { path: 'livro/:id/leitura', children: [] },
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
  // The notes ask for the sessions of every reading that has some, and the latest reading opens
  // with its own: those answers come one change detection later.
  const readings = (reading.readings ?? []) as { sessionCount: number }[];
  const expected =
    readings.filter((one) => one.sessionCount > 0).length +
    ((readings[0]?.sessionCount ?? 0) > 0 ? 1 : 0);
  let flushed = 0;
  await vi.waitFor(() => {
    TestBed.tick();
    for (const request of http.match((candidate) => candidate.url.endsWith('/sessions'))) {
      request.flush(reading.sessions ?? []);
      flushed++;
    }
    expect(flushed).toBe(expected);
  });
  if (reading.review) {
    http.expectOne('/api/v1/books/42/review').flush(reading.review);
  } else {
    http.expectOne('/api/v1/books/42/review').flush(NO_REVIEW.body, NO_REVIEW.failure);
  }
  await harness.fixture.whenStable();
  return { harness, http };
}

/** jsdom has no modal dialogs; these do what the page needs from them, the close event included. */
function stubModalDialogs(): void {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
}

const record = () => screen.getByRole('region', { name: 'Ficha de leitura' });
const history = () => screen.getByRole('region', { name: 'Histórico de leitura' });
const editor = () => document.querySelector('#titulo-editor-resenha')!.closest('dialog')!;

describe('BookPage', () => {
  it('shows the book with its author, series and genres as links', async () => {
    await openBook();

    expect(
      screen.getByRole('heading', { name: 'A Sociedade do Anel', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'J. R. R. Tolkien' })).toHaveAttribute(
      'href',
      '/autor/7',
    );
    expect(screen.getByRole('link', { name: 'O Senhor dos Anéis' })).toHaveAttribute(
      'href',
      '/serie/3',
    );
    expect(screen.getByText(/· livro I$/)).toBeInTheDocument();
    const genres = screen.getByRole('list', { name: 'Gêneros' });
    const subgenres = screen.getByRole('list', { name: 'Subgêneros' });
    expect(within(genres).getByRole('link').textContent).toBe('Fantasia');
    expect(within(subgenres).getByRole('link')).toHaveAttribute('href', '/generos/4');
  });

  it('shows the synopsis under its label', async () => {
    await openBook();

    const synopsis = screen.getByRole('region', { name: 'Sinopse' });
    expect(synopsis).toHaveTextContent('Uma jornada até a Montanha da Perdição.');
  });

  it('shows the trail from Home and the shelf to the book', async () => {
    await openBook();

    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(trail).getByRole('link', { name: 'Minha Estante' })).toHaveAttribute(
      'href',
      '/estante',
    );
    expect(within(trail).getByText('A Sociedade do Anel')).toHaveAttribute('aria-current', 'page');
  });

  it('seals a book that is yours with the ex-libris', async () => {
    await openBook('/livro/42', { ...FELLOWSHIP, ownership: 'OWNED' });

    expect(screen.getByRole('img', { name: 'Selo ex-libris: este livro é seu' })).toBeVisible();
    expect(screen.queryByText(/Na wishlist/)).not.toBeInTheDocument();
  });

  it('explains why a book in the wishlist has no seal and no status', async () => {
    await openBook('/livro/42', { ...FELLOWSHIP, ownership: 'WISHLIST' });

    expect(screen.queryByRole('img', { name: /Selo ex-libris/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Na wishlist: ainda não está na sua estante/)).toBeInTheDocument();
    expect(within(record()).queryByText('Status')).not.toBeInTheDocument();
  });

  it('offers Tenho and Wishlist as toggles that say whether they are pressed', async () => {
    await openBook();

    for (const name of ['Tenho este livro', 'Wishlist']) {
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

  it('turns ownership off when the pressed toggle is clicked again', async () => {
    const { http } = await openBook('/livro/42', { ...FELLOWSHIP, ownership: 'WISHLIST' });

    await userEvent.click(screen.getByRole('button', { name: 'Wishlist' }));

    expect(http.expectOne('/api/v1/books/42/ownership').request.body).toEqual({
      ownership: 'NONE',
    });
  });

  it('goes back to what is saved and says why when the server refuses', async () => {
    const { http, harness } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Tenho este livro' }));
    http
      .expectOne('/api/v1/books/42/ownership')
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
        { status: 500, statusText: 'Server Error' },
      );
    TestBed.tick();
    http.expectOne('/api/v1/books/42').flush(FELLOWSHIP);
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(screen.getByRole('button', { name: 'Tenho este livro' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('ends the ficha with the edit link and the delete button', async () => {
    await openBook();

    expect(screen.getByRole('link', { name: 'Editar informações' })).toHaveAttribute(
      'href',
      '/livro/42/editar',
    );
    expect(screen.getByRole('button', { name: 'Excluir livro' })).toBeInTheDocument();
  });

  it('asks before deleting, and only deletes once confirmed', async () => {
    const { http, harness } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));
    http.expectNone({ method: 'DELETE', url: '/api/v1/books/42' });

    const dialog = screen.getByRole('dialog', { name: 'Excluir “A Sociedade do Anel”?' });
    expect(dialog).toHaveTextContent('Esta ação não pode ser desfeita.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir livro' }));
    http.expectOne({ method: 'DELETE', url: '/api/v1/books/42' }).flush(null);
    await harness.fixture.whenStable();

    // The page navigates after the response, one async step later.
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/estante'));
  });

  it('says the book is not in the collection when the API answers 404', async () => {
    await openBook(
      '/livro/42',
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
      '/livro/42',
      { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('shows the ficha of a book never read: no rating, want to read, the series and pages', async () => {
    await openBook();

    expect(within(record()).getByRole('img', { name: 'Sem nota' })).toBeInTheDocument();
    expect(within(record()).getByText('Quero ler')).toBeInTheDocument();
    expect(within(record()).getByText('O Senhor dos Anéis · livro I de III')).toBeInTheDocument();
    expect(within(record()).getByText('576')).toBeInTheDocument();
    expect(within(record()).queryByText('Início')).not.toBeInTheDocument();
  });

  it('shows the reading in progress with its start and no end yet', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, { readings: [READING] });

    expect(within(record()).getByText('Lendo agora')).toBeInTheDocument();
    expect(within(record()).getByText('01/11/2026')).toBeInTheDocument();
    expect(within(record()).getByText('em andamento')).toBeInTheDocument();
  });

  it('shows a finished book with its dates, the rating and the readings in roman numerals', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      readings: [FINISHED, { ...FINISHED, id: 7, startDate: '2023-03-01', endDate: '2023-04-01' }],
      review: REVIEW,
    });

    expect(within(record()).getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(within(record()).getByText('Lido')).toBeInTheDocument();
    expect(within(record()).getByText('10/02/2025')).toBeInTheDocument();
    expect(within(record()).getByText(/^\s*II/)).toBeInTheDocument();
    expect(within(record()).getByText('↻ Relido')).toBeInTheDocument();
  });

  it('says where an abandoned book stopped', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      readings: [
        {
          ...FINISHED,
          status: 'ABANDONED',
          endDate: '2026-05-14',
          progress: { pagesRead: 212, pageCount: 576, percent: 36 },
        },
      ],
    });

    expect(within(record()).getByText('Parou em')).toBeInTheDocument();
    expect(within(record()).getByText('14/05/2026 · pág. 212 de 576')).toBeInTheDocument();
    expect(within(record()).getByText('Sem nota')).toBeInTheDocument();
  });

  it('sums up the history and draws the readings on a timeline, the latest open', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      readings: [FINISHED, { ...FINISHED, id: 7, startDate: '2023-03-01', endDate: '2023-03-10' }],
      sessions: [
        { id: 1, date: '2025-01-02', pagesRead: 100, note: 'Começa devagar.' },
        { id: 2, date: '2025-01-20', pagesRead: 200, note: 'O Conselho de Elrond!' },
      ],
    });

    const summary = within(history());
    expect(summary.getByText('leituras')).toBeInTheDocument();
    expect(summary.getByText('50')).toBeInTheDocument();
    const cards = within(history()).getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByText('Releitura')).toBeInTheDocument();
    expect(within(cards[0]!).getByText('Concluída')).toBeInTheDocument();
    expect(
      within(cards[0]!).getByText('2 de janeiro → 10 de fevereiro de 2025'),
    ).toBeInTheDocument();
    expect(within(cards[1]!).getByText('Primeira leitura')).toBeInTheDocument();
    expect(within(cards[0]!).getByRole('button', { name: /Ocultar detalhes/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(cards[1]!).getByRole('button', { name: /Ver detalhes/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(
      within(cards[0]!).getByRole('img', { name: /Páginas lidas por semana: 100, 0, 200/ }),
    ).toBeInTheDocument();
    expect(within(cards[0]!).getByText('O Conselho de Elrond!')).toBeInTheDocument();
  });

  it('shows the rating of each reading and how it changed from the first one', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      readings: [
        { ...FINISHED, rating: 5 },
        { ...FINISHED, id: 7, startDate: '2023-03-01', endDate: '2023-03-10', rating: 4.5 },
      ],
    });

    const cards = within(history()).getAllByRole('article');
    expect(within(cards[0]!).getByText('Nota nesta leitura')).toBeInTheDocument();
    expect(within(cards[0]!).getByRole('img', { name: 'Nota 5 de 5' })).toBeInTheDocument();
    expect(within(cards[0]!).getByText('5,0')).toBeInTheDocument();
    expect(within(cards[1]!).getByText('4,5')).toBeInTheDocument();
    expect(within(history()).getByText('na nota, da 1ª para a 2ª')).toBeInTheDocument();
    expect(within(history()).getByText('+0,5')).toBeInTheDocument();
  });

  it('leaves the change of rating out while a reading has no rating', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      readings: [FINISHED, { ...FINISHED, id: 7, rating: 4 }],
    });

    const cards = within(history()).getAllByRole('article');
    expect(within(cards[0]!).getByRole('img', { name: 'Sem nota ainda' })).toBeInTheDocument();
    expect(within(history()).queryByText(/na nota, da 1ª/)).not.toBeInTheDocument();
  });

  it('shows a book in a series without a position, as the API sends it: null', async () => {
    await openBook('/livro/42', {
      ...FELLOWSHIP,
      series: { id: 3, name: 'O Senhor dos Anéis', position: null, totalVolumes: 3 },
    });

    expect(within(record()).getByText('O Senhor dos Anéis · III livros')).toBeInTheDocument();
    expect(screen.queryByText(/· livro/)).not.toBeInTheDocument();
  });

  it('marks a reading in progress as such, until today', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, { readings: [READING] });

    const card = within(history()).getByRole('article');
    expect(within(card).getByText('Em andamento')).toBeInTheDocument();
    expect(within(card).getByText('1 de novembro de 2026 → hoje')).toBeInTheDocument();
  });

  it('invites the first reading when the history is empty', async () => {
    await openBook();

    expect(
      within(history()).getByText('Ainda sem jornadas — registre a primeira leitura.'),
    ).toBeInTheDocument();
    expect(within(history()).getByRole('link', { name: 'Registrar leitura →' })).toHaveAttribute(
      'href',
      '/livro/42/leitura',
    );
  });

  it('lists the notes written during the readings', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      readings: [READING],
      sessions: [
        { id: 1, date: '2026-11-03', pagesRead: 30, note: 'Um anel para a todos governar.' },
      ],
    });

    const notes = screen.getByRole('heading', { name: 'Minhas notas' }).closest('ml-book-notes')!;
    expect(within(notes as HTMLElement).getByText('P. 30 · 03/11/2026')).toBeInTheDocument();
    expect(
      within(notes as HTMLElement).getByText('Um anel para a todos governar.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Adicionar nota' })).toHaveAttribute(
      'href',
      '/livro/42/leitura',
    );
  });

  it('says there are no notes yet', async () => {
    await openBook();

    expect(screen.getByText('Nenhuma nota ainda.')).toBeInTheDocument();
  });

  it('invites a review, without any error, when the book has none', async () => {
    await openBook();

    expect(screen.getByText('Você ainda não escreveu uma resenha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escrever resenha' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the saved review with the day it was written, a paragraph per line', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, {
      review: { ...REVIEW, content: 'Um clássico.\nQue envelhece bem.' },
    });

    expect(screen.getByText('Escrita em 08/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Um clássico.')).toBeInTheDocument();
    expect(screen.getByText('Que envelhece bem.')).toBeInTheDocument();
  });

  it('is the anchor of "Ler minha resenha"', async () => {
    await openBook();

    expect(screen.getByRole('region', { name: 'Minha resenha' })).toHaveAttribute(
      'id',
      'minha-resenha',
    );
  });

  it('writes a new review in the modal and shows it, also in the ficha', async () => {
    const { http, harness } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Escrever resenha' }));
    expect(editor()).toHaveAttribute('open');
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

    expect(editor()).not.toHaveAttribute('open');
    expect(screen.getByText('Um clássico.')).toBeInTheDocument();
    expect(within(record()).getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
  });

  it('refuses an empty review before sending anything', async () => {
    const { http } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Escrever resenha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resenha' }));

    expect(screen.getByText('Dê uma nota, escreva um texto ou os dois.')).toBeInTheDocument();
    http.expectNone({ method: 'PUT', url: '/api/v1/books/42/review' });
  });

  it('starts the edit from the saved review and gives up on cancel', async () => {
    await openBook('/livro/42', FELLOWSHIP, undefined, { review: REVIEW });

    await userEvent.click(screen.getByRole('button', { name: 'Editar resenha' }));

    expect(screen.getByLabelText('O que você achou?')).toHaveValue(
      'Um clássico que envelhece bem.',
    );
    expect(screen.getByRole('slider', { name: 'Nota' })).toHaveAttribute(
      'aria-valuetext',
      '4,5 de 5 estrelas',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(editor()).not.toHaveAttribute('open');
  });

  it('takes the rating away with the button, keeping the text', async () => {
    const { http } = await openBook('/livro/42', FELLOWSHIP, undefined, { review: REVIEW });

    await userEvent.click(screen.getByRole('button', { name: 'Editar resenha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tirar nota' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar resenha' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/books/42/review' });
    expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({
      content: 'Um clássico que envelhece bem.',
    });
  });

  it('keeps the modal open and says why when the review is refused', async () => {
    const { http, harness } = await openBook('/livro/42', FELLOWSHIP, undefined, {
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
    expect(editor()).toHaveAttribute('open');
  });

  it('deletes the review and goes back to the invitation', async () => {
    const { http, harness } = await openBook('/livro/42', FELLOWSHIP, undefined, {
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
  });

  it('does not fetch the related books before the end of the page is in view', async () => {
    const { http } = await openBook();

    http.expectNone('/api/v1/shelf/books/42/related');
  });

  it('shows the volumes of the series, this one marked, and the books of the same subgenre', async () => {
    const { http, harness } = await openBook();

    scrollToTheEnd();
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/shelf/books/42/related').flush({
        series: [{ ...CARD, id: 43, title: 'As Duas Torres' }],
        similar: [
          { ...CARD, id: 50, title: 'O Nome do Vento', series: null, rating: 4 },
          { ...CARD, id: 51, title: 'Duna', series: null, genres: ['Ficção científica'] },
        ],
      });
    });
    await harness.fixture.whenStable();

    const series = screen.getByRole('region', { name: 'Livros da série' });
    expect(within(series).getByRole('heading', { name: 'O Senhor dos Anéis' })).toBeVisible();
    const volumes = within(series).getAllByRole('link', { name: /Livro/ });
    expect(volumes[0]).toHaveTextContent('Livro I · Este livro');
    expect(volumes[0]).toHaveAttribute('aria-current', 'page');
    expect(volumes[1]).toHaveAttribute('href', '/livro/43');
    expect(within(series).getByRole('link', { name: /Ver série · 2 livros/ })).toHaveAttribute(
      'href',
      '/serie/3',
    );
    const similar = screen.getByRole('region', { name: 'Livros parecidos' });
    expect(within(similar).getByRole('heading', { name: 'Alta fantasia' })).toBeVisible();
    expect(within(similar).getByRole('link', { name: /O Nome do Vento/ })).toBeInTheDocument();
    expect(within(similar).queryByRole('link', { name: /Duna/ })).not.toBeInTheDocument();
    expect(within(similar).getByRole('link', { name: 'Ver todos →' })).toHaveAttribute(
      'href',
      '/generos/4',
    );
  });

  it('shows nothing at the end when the book has no related books', async () => {
    const { http, harness } = await openBook();

    scrollToTheEnd();
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/shelf/books/42/related').flush({ series: [], similar: [] });
    });
    await harness.fixture.whenStable();

    expect(screen.queryByRole('region', { name: 'Livros da série' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Livros parecidos' })).not.toBeInTheDocument();
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
