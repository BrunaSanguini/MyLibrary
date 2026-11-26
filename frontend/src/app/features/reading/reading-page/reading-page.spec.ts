import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { TODAY } from '@core/time/today';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ReadingPage from './reading-page';

// A Sunday, which makes the week of the page run from 2 to 8 November.
const NOV_8 = '2026-11-08';

const FELLOWSHIP = {
  id: 42,
  title: 'A Sociedade do Anel',
  authors: [{ id: 7, name: 'J. R. R. Tolkien' }],
  genres: [],
  pageCount: 576,
  ownership: 'OWNED',
  favorite: false,
};

const READING = {
  id: 9,
  bookId: 42,
  status: 'IN_PROGRESS',
  startDate: '2026-11-05',
  endDate: null,
  reread: false,
  progress: { pagesRead: 120, pageCount: 576, percent: 20 },
  sessionCount: 2,
};

const FINISHED = {
  ...READING,
  id: 8,
  status: 'FINISHED',
  startDate: '2025-01-02',
  endDate: '2025-02-10',
  progress: { pagesRead: 576, pageCount: 576, percent: 100 },
};

const SESSIONS = [
  { id: 1, date: '2026-11-05', pagesRead: 80, note: null },
  { id: 2, date: '2026-11-08', pagesRead: 40, note: 'Conselho de Elrond.' },
];

interface Opening {
  book?: object;
  readings?: object[];
  sessions?: object[];
  /** The reading asked for with `?leitura=`, as "Editar leitura" in the history does. */
  leitura?: number;
}

async function open({
  book = FELLOWSHIP,
  readings = [READING],
  sessions = SESSIONS,
  leitura,
}: Opening = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'livro/:id/leitura', component: ReadingPage },
          { path: 'livro/:id/editar', children: [] },
          { path: 'livro/:id', children: [] },
          { path: 'estante', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: TODAY, useValue: () => NOV_8 },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(
    leitura === undefined ? '/livro/42/leitura' : `/livro/42/leitura?leitura=${leitura}`,
  );
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/books/42').flush(book);
  http.expectOne('/api/v1/books/42/readings').flush(readings);
  http
    .expectOne((request) => request.url === '/api/v1/shelf/books')
    .flush({
      content: [{ id: 50, title: 'Duna', authors: [], genres: [] }],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
  const followed = readings[0] as typeof READING | undefined;
  const asked = readings.find((reading) => (reading as typeof READING).id === leitura);
  if (asked) {
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne(`/api/v1/readings/${leitura}/sessions`).flush(sessions);
    });
  } else if (
    readings.some((reading) => (reading as typeof READING).status === 'IN_PROGRESS') ||
    followed?.status === 'ABANDONED'
  ) {
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/readings/9/sessions').flush(sessions);
    });
  }
  await harness.fixture.whenStable();
  return { harness, http };
}

/** Answers the two requests the page repeats after a change. */
async function answerRefresh(
  http: HttpTestingController,
  readings: object[],
  sessions?: object[],
): Promise<void> {
  await vi.waitFor(() => {
    TestBed.tick();
    http.expectOne('/api/v1/books/42/readings').flush(readings);
  });
  if (sessions) {
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/readings/9/sessions').flush(sessions);
    });
  }
}

const region = (name: string) => screen.getByRole('region', { name });
const body = (request: { request: { body: unknown } }) =>
  JSON.parse(JSON.stringify(request.request.body)) as unknown;

describe('ReadingPage', () => {
  it('shows the title, the book of the reading and its status', async () => {
    await open();

    expect(screen.getByRole('heading', { name: 'Registrar leitura', level: 1 })).toBeVisible();
    expect(screen.getByRole('link', { name: /Voltar ao livro/ })).toHaveAttribute(
      'href',
      '/livro/42',
    );
    expect(screen.getByRole('combobox', { name: 'Livro desta leitura' })).toHaveValue('42');
    expect(screen.getByText('J. R. R. Tolkien · Lendo')).toBeInTheDocument();
  });

  it('shows the progress in the ring, what is left and the forecast at the pace of the week', async () => {
    await open();

    const progress = region('Progresso do livro');
    expect(within(progress).getByRole('img', { name: '120 de 576 páginas lidas' })).toBeVisible();
    expect(within(progress).getByText('21%')).toBeInTheDocument();
    expect(within(progress).getByText('Faltam 456 páginas')).toBeInTheDocument();
    // From Thursday 5 to Sunday 8: 120 pages in 4 days, 30 a day; 456 left take 16 days.
    expect(
      within(progress).getByText(
        'No seu ritmo de 30 páginas por dia, você termina em cerca de 16 dias.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the week with the day picked, and the three numbers', async () => {
    await open();

    const week = region('Calendário da semana');
    expect(within(week).getByRole('link', { name: /Novembro de MMXXVI/ })).toHaveAttribute(
      'href',
      '/calendario',
    );
    expect(within(week).getByText('120 páginas nesta semana · média de 30 por dia')).toBeVisible();
    expect(
      within(week).getByRole('button', { name: 'Dom 8 de novembro, 40 páginas' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // Before the start of the reading there is nothing to pick.
    expect(
      within(week).getByRole('button', { name: 'Seg 2 de novembro, 0 páginas' }),
    ).toBeDisabled();
    expect(within(week).getByRole('button', { name: 'Próxima semana' })).toBeDisabled();
    expect(screen.getByText('em dom, 8/11')).toBeInTheDocument();
    expect(screen.getByText('com este livro')).toBeInTheDocument();
  });

  it('picks a day of the week for the session, and the numbers follow', async () => {
    const { harness } = await open();

    await userEvent.click(screen.getByRole('button', { name: 'Qui 5 de novembro, 80 páginas' }));
    await harness.fixture.whenStable();

    expect(screen.getByLabelText('Dia')).toHaveValue('2026-11-05');
    expect(screen.getByText('em qui, 5/11')).toBeInTheDocument();
  });

  it('charts the week, or the last 30 days', async () => {
    await open();

    expect(
      screen.getByRole('img', { name: 'Páginas lidas por dia: 0, 0, 0, 80, 0, 0, 40' }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('tab', { name: 'Mês' }));

    expect(screen.getByRole('tab', { name: 'Mês' })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('img', { name: /^Páginas lidas por dia: (\d+, ){29}40$/ }),
    ).toBeVisible();
  });

  it('recalculates everything as soon as a session is saved', async () => {
    const { http, harness } = await open();

    await userEvent.type(screen.getByLabelText('Páginas lidas neste dia'), '24');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar sessão' }));
    http
      .expectOne({ method: 'POST', url: '/api/v1/readings/9/sessions' })
      .flush({ id: 3, date: NOV_8, pagesRead: 24 });
    await answerRefresh(
      http,
      [{ ...READING, progress: { pagesRead: 144, pageCount: 576, percent: 25 }, sessionCount: 3 }],
      [...SESSIONS, { id: 3, date: NOV_8, pagesRead: 24, note: null }],
    );
    await harness.fixture.whenStable();

    expect(screen.getByText('Faltam 432 páginas')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dom 8 de novembro, 64 páginas' }),
    ).toBeInTheDocument();
    expect(within(region('Sessões desta leitura')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('deletes a session and gives its pages back', async () => {
    const { http, harness } = await open();

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir a sessão de 8 de nov., 40 páginas' }),
    );
    http.expectOne({ method: 'DELETE', url: '/api/v1/readings/9/sessions/2' }).flush(null);
    await answerRefresh(
      http,
      [{ ...READING, progress: { pagesRead: 80, pageCount: 576, percent: 13 }, sessionCount: 1 }],
      [SESSIONS[0]!],
    );
    await harness.fixture.whenStable();

    expect(within(region('Sessões desta leitura')).getAllByRole('listitem')).toHaveLength(1);
  });

  it('corrects the start of the reading and the reread mark', async () => {
    const { http, harness } = await open();
    const start = screen.getByLabelText('Início');
    expect(start).toHaveValue('2026-11-05');
    expect(screen.getByLabelText('Fim')).toBeDisabled();

    await userEvent.clear(start);
    await userEvent.type(start, '2026-11-03');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Esta é uma releitura' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar período' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/readings/9' });
    expect(body(request)).toEqual({ startDate: '2026-11-03', reread: true });
    request.flush({ ...READING, startDate: '2026-11-03', reread: true });
    await answerRefresh(http, [{ ...READING, startDate: '2026-11-03', reread: true }]);
    await harness.fixture.whenStable();

    expect(screen.getByText('✦ Início da leitura salvo.')).toBeInTheDocument();
  });

  it('finishes the reading with "Terminei", which turns the status into Lido, and goes to the book', async () => {
    const { http, harness } = await open();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Terminei este livro' }));
    expect(screen.getByText('J. R. R. Tolkien · Lido')).toBeInTheDocument();
    expect(screen.getByLabelText('Fim')).toHaveValue(NOV_8);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar período' }));

    http.expectOne({ method: 'PUT', url: '/api/v1/readings/9' }).flush(READING);
    const finish = await vi.waitFor(() =>
      http.expectOne({ method: 'POST', url: '/api/v1/readings/9/finish' }),
    );
    expect(finish.request.body).toEqual({ endDate: NOV_8 });
    finish.flush({ ...READING, status: 'FINISHED', endDate: NOV_8 });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livro/42'));
  });

  it('marks Terminei or Abandonei, never both, and names the end after it', async () => {
    await open();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Terminei este livro' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Abandonei este livro' }));

    expect(screen.getByRole('checkbox', { name: 'Terminei este livro' })).not.toBeChecked();
    expect(screen.getByLabelText('Parou em')).toBeEnabled();
    expect(screen.getByText('J. R. R. Tolkien · Abandonado')).toBeInTheDocument();
  });

  it('refuses an end before the start', async () => {
    const { http } = await open();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Terminei este livro' }));
    const end = screen.getByLabelText('Fim');
    await userEvent.clear(end);
    await userEvent.type(end, '2026-11-04');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar período' }));

    expect(screen.getByText('A data final precisa ser depois do início.')).toBeInTheDocument();
    http.expectNone({ method: 'PUT', url: '/api/v1/readings/9' });
  });

  it('follows an abandoned reading, and takes it up again when Abandonei is unmarked', async () => {
    const abandoned = { ...READING, status: 'ABANDONED', endDate: '2026-11-07' };
    const { http } = await open({ readings: [abandoned] });

    expect(screen.getByText('J. R. R. Tolkien · Abandonado')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Abandonei este livro' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Abandonei este livro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar período' }));

    http.expectOne({ method: 'POST', url: '/api/v1/readings/9/resume' }).flush(READING);
    await vi.waitFor(() => http.expectOne({ method: 'PUT', url: '/api/v1/readings/9' }));
  });

  it('edits the reading asked for in the address, even a finished one, and goes back to the book', async () => {
    const { http } = await open({ readings: [FINISHED], sessions: [], leitura: 8 });

    expect(screen.getByRole('heading', { level: 1, name: 'Editar leitura' })).toBeInTheDocument();
    expect(screen.getByLabelText('Início')).toHaveValue('2025-01-02');
    expect(screen.getByLabelText('Fim')).toHaveValue('2025-02-10');
    expect(screen.queryByRole('checkbox', { name: 'Terminei este livro' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Este livro não está sendo lido' }),
    ).not.toBeInTheDocument();

    const end = screen.getByLabelText('Fim');
    await userEvent.clear(end);
    await userEvent.type(end, '2025-02-12');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar período' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/readings/8' });
    expect(body(request)).toEqual({
      startDate: '2025-01-02',
      endDate: '2025-02-12',
      reread: false,
    });
    request.flush({ ...FINISHED, endDate: '2025-02-12' });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livro/42'));
  });

  it('follows the reading in progress when the one in the address does not exist', async () => {
    await open({ readings: [READING], leitura: 99 });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Registrar leitura' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Início')).toHaveValue('2026-11-05');
  });

  it('changes book in the selector', async () => {
    await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Livro desta leitura' }),
      '50',
    );

    expect(navigate).toHaveBeenCalledWith(['/livro', 50, 'leitura']);
  });

  it('offers to start a reading today when the book has none to follow', async () => {
    await open({ readings: [] });

    expect(screen.getByRole('heading', { name: 'Este livro não está sendo lido' })).toBeVisible();
    expect(screen.getByLabelText('O que você quer registrar?')).toHaveValue('IN_PROGRESS');
    expect(screen.getByLabelText('Início')).toHaveValue(NOV_8);
  });

  it('starts the reading and begins to follow it', async () => {
    const { http, harness } = await open({ readings: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Começar leitura' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/books/42/readings' });
    expect(body(request)).toEqual({ status: 'IN_PROGRESS', startDate: NOV_8, reread: false });
    request.flush(READING, { status: 201, statusText: 'Created' });
    await answerRefresh(http, [READING], []);
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Quanto você leu?' })).toBeVisible();
  });

  it('suggests a reread for a book already finished once', async () => {
    await open({ readings: [FINISHED] });

    expect(screen.getByRole('checkbox', { name: 'Esta é uma releitura' })).toBeChecked();
  });

  it('registers a reading that is already over and goes back to the book', async () => {
    const { http, harness } = await open({ readings: [] });

    await userEvent.selectOptions(screen.getByLabelText('O que você quer registrar?'), 'FINISHED');
    await userEvent.clear(screen.getByLabelText(/Início/));
    await userEvent.type(screen.getByLabelText('Fim'), '2026-10-30');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    http
      .expectOne({ method: 'POST', url: '/api/v1/books/42/readings' })
      .flush({ ...FINISHED, id: 10 }, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livro/42'));
  });

  it('asks for the page count of the book instead of offering the session form', async () => {
    await open({ book: { ...FELLOWSHIP, pageCount: undefined } });

    expect(screen.getByRole('heading', { name: 'Falta o número de páginas' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Editar o livro' })).toHaveAttribute(
      'href',
      '/livro/42/editar',
    );
  });

  it('knows about a session being typed', async () => {
    const { harness } = await open();
    const page = harness.routeDebugElement!.componentInstance as HasUnsavedChanges;

    expect(page.hasUnsavedChanges()).toBe(false);
    await userEvent.type(screen.getByLabelText('Páginas lidas neste dia'), '24');

    expect(page.hasUnsavedChanges()).toBe(true);
  });

  it('says the book is not in the collection when the API answers 404', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'livro/:id/leitura', component: ReadingPage }],
          withComponentInputBinding(),
        ),
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/livro/42/leitura');
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    const missing = { code: 'book.not-found', detail: 'O livro solicitado não existe.' };
    const notFound = { status: 404, statusText: 'Not Found' };
    http.expectOne('/api/v1/books/42').flush(missing, notFound);
    http.expectOne('/api/v1/books/42/readings').flush(missing, notFound);
    http.expectOne((request) => request.url === '/api/v1/shelf/books').flush({ content: [] });
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Livro não encontrado' })).toBeInTheDocument();
  });
});
