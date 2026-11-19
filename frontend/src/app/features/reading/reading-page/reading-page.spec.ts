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
}

async function open({
  book = FELLOWSHIP,
  readings = [READING],
  sessions = SESSIONS,
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
  await harness.navigateByUrl('/livro/42/leitura');
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/books/42').flush(book);
  http.expectOne('/api/v1/books/42/readings').flush(readings);
  if (readings.some((reading) => (reading as typeof READING).status === 'IN_PROGRESS')) {
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
  it('shows the progress of the reading in the ring and in pages', async () => {
    await open();

    expect(
      screen.getByRole('heading', { name: 'A Sociedade do Anel', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Leitura iniciada em 5 de novembro de 2026/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
    expect(within(region('Progresso')).getByText('120 de 576 páginas')).toBeInTheDocument();
  });

  it('forecasts the end from the pace so far', async () => {
    await open();

    // 120 pages in 4 days is 30 a day; the 456 left take 16 days from the 8th.
    expect(within(region('Progresso')).getByText('24 de novembro de 2026')).toBeInTheDocument();
    expect(
      within(region('Progresso')).getByText('No ritmo de 30 páginas por dia, faltam 456 páginas.'),
    ).toBeInTheDocument();
  });

  it('waits for the first session before forecasting', async () => {
    await open({
      readings: [{ ...READING, progress: { pagesRead: 0, pageCount: 576, percent: 0 } }],
      sessions: [],
    });

    expect(
      within(region('Progresso')).getByText('A previsão aparece depois da primeira sessão.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sessões registradas' })).not.toBeInTheDocument();
  });

  it('shows the week from Monday to Sunday, with the pages of each day and today marked', async () => {
    await open();

    const week = within(region('Esta semana')).getAllByRole('listitem');
    expect(week).toHaveLength(7);
    expect(week[0]).toHaveAccessibleName('segunda-feira, 2 de nov.: sem leitura');
    expect(week[3]).toHaveAccessibleName('quinta-feira, 5 de nov.: 80 páginas');
    expect(week[6]).toHaveAccessibleName('domingo, 8 de nov.: 40 páginas');
    expect(week[6]).toHaveAttribute('aria-current', 'date');
    expect(week[5]).not.toHaveAttribute('aria-current');
    expect(within(region('Esta semana')).getByText('120 páginas')).toBeInTheDocument();
  });

  it('charts the pages of each of the last 14 days', async () => {
    await open();

    const days = within(region('Páginas por dia')).getAllByRole('listitem');
    expect(days).toHaveLength(14);
    expect(days[0]).toHaveAccessibleName('26 de out.: sem leitura');
    expect(days[10]).toHaveAccessibleName('5 de nov.: 80 páginas');
    expect(days[13]).toHaveAccessibleName('8 de nov.: 40 páginas');
  });

  it('lists the sessions from the latest to the oldest, with their notes', async () => {
    await open();

    const sessions = within(region('Sessões registradas')).getAllByRole('listitem');
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toHaveTextContent('8 de nov.');
    expect(sessions[0]).toHaveTextContent('40 páginas');
    expect(sessions[0]).toHaveTextContent('Conselho de Elrond.');
    expect(sessions[1]).toHaveTextContent('80 páginas');
  });

  it('updates the ring, the forecast, the week and the chart as soon as a session is saved', async () => {
    const { http, harness } = await open();

    await userEvent.type(screen.getByLabelText('Quantas páginas você leu?'), '24');
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

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(within(region('Progresso')).getByText('144 de 576 páginas')).toBeInTheDocument();
    // 144 pages in 4 days is 36 a day; the 432 left take 12 days.
    expect(within(region('Progresso')).getByText('20 de novembro de 2026')).toBeInTheDocument();
    expect(within(region('Esta semana')).getAllByRole('listitem')[6]).toHaveAccessibleName(
      'domingo, 8 de nov.: 64 páginas',
    );
    expect(within(region('Páginas por dia')).getAllByRole('listitem')[13]).toHaveAccessibleName(
      '8 de nov.: 64 páginas',
    );
    expect(within(region('Sessões registradas')).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Você está na página 144 de 576.')).toBeInTheDocument();
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

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '13');
    expect(within(region('Sessões registradas')).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Sessão excluída.')).toBeInTheDocument();
  });

  it('corrects the start of the reading and the reread mark', async () => {
    const { http, harness } = await open();
    const start = screen.getByLabelText('Início');
    expect(start).toHaveValue('2026-11-05');

    await userEvent.clear(start);
    await userEvent.type(start, '2026-11-03');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Esta é uma releitura' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar período' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/readings/9' });
    expect(body(request)).toEqual({ startDate: '2026-11-03', reread: true });
    request.flush({ ...READING, startDate: '2026-11-03', reread: true });
    await answerRefresh(http, [{ ...READING, startDate: '2026-11-03', reread: true }]);
    await harness.fixture.whenStable();

    expect(screen.getByText(/Leitura iniciada em 3 de novembro de 2026/)).toBeInTheDocument();
    expect(screen.getByText('Período da leitura atualizado.')).toBeInTheDocument();
  });

  it('finishes the reading on the chosen day and goes to the book', async () => {
    const { http, harness } = await open();
    expect(screen.getByLabelText('Dia do término')).toHaveValue(NOV_8);

    await userEvent.click(screen.getByRole('button', { name: 'Concluir leitura' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/readings/9/finish' });
    expect(request.request.body).toEqual({ endDate: NOV_8 });
    request.flush({ ...READING, status: 'FINISHED', endDate: NOV_8 });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livro/42'));
  });

  it('abandons the reading with its own action', async () => {
    const { http, harness } = await open();

    await userEvent.click(screen.getByRole('button', { name: 'Abandonar leitura' }));

    http
      .expectOne({ method: 'POST', url: '/api/v1/readings/9/abandon' })
      .flush({ ...READING, status: 'ABANDONED', endDate: NOV_8 });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livro/42'));
  });

  it('refuses to finish before the reading started', async () => {
    const { http } = await open();
    const end = screen.getByLabelText('Dia do término');

    await userEvent.clear(end);
    await userEvent.type(end, '2026-11-04');
    await userEvent.click(screen.getByRole('button', { name: 'Concluir leitura' }));

    expect(screen.getByText('O término não pode ser antes do início.')).toBeInTheDocument();
    http.expectNone({ method: 'POST', url: '/api/v1/readings/9/finish' });
  });

  it('stays on the page and says why when finishing is refused', async () => {
    const { http, harness } = await open();

    await userEvent.click(screen.getByRole('button', { name: 'Concluir leitura' }));
    http
      .expectOne({ method: 'POST', url: '/api/v1/readings/9/finish' })
      .flush(
        { code: 'session.out-of-period', detail: 'A data da sessão precisa ficar no período.' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A data da sessão precisa ficar no período.',
      ),
    );
    expect(TestBed.inject(Router).url).toBe('/livro/42/leitura');
  });

  it('offers to start a reading today when the book has none in progress', async () => {
    await open({ readings: [] });

    expect(screen.getByRole('heading', { name: 'Nova leitura' })).toBeInTheDocument();
    expect(screen.getByLabelText('Início')).toHaveValue(NOV_8);
    expect(screen.getByRole('checkbox', { name: 'Esta é uma releitura' })).not.toBeChecked();
    expect(screen.queryByLabelText('Fim')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('starts the reading and begins to follow it', async () => {
    const { http, harness } = await open({ readings: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Começar leitura' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/books/42/readings' });
    expect(body(request)).toEqual({ status: 'IN_PROGRESS', startDate: NOV_8, reread: false });
    const started = {
      ...READING,
      startDate: NOV_8,
      progress: { pagesRead: 0, pageCount: 576, percent: 0 },
      sessionCount: 0,
    };
    request.flush(started);
    await answerRefresh(http, [started], []);
    await harness.fixture.whenStable();

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('heading', { name: 'Registrar sessão' })).toBeInTheDocument();
  });

  it('suggests a reread for a book already finished once', async () => {
    await open({ readings: [FINISHED] });

    expect(screen.getByRole('checkbox', { name: 'Esta é uma releitura' })).toBeChecked();
  });

  it('registers a reading that is already over and goes back to the book', async () => {
    const { http, harness } = await open({ readings: [] });

    await userEvent.selectOptions(screen.getByLabelText('O que você quer registrar?'), 'FINISHED');
    const start = screen.getByLabelText(/Início/);
    await userEvent.clear(start);
    await userEvent.type(screen.getByLabelText('Fim'), '2019-07-01');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/books/42/readings' });
    expect(body(request)).toEqual({ status: 'FINISHED', endDate: '2019-07-01', reread: false });
    request.flush({ ...FINISHED, startDate: null, endDate: '2019-07-01' });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livro/42'));
  });

  it('asks for the end of a reading that is already over', async () => {
    const { http } = await open({ readings: [] });

    await userEvent.selectOptions(screen.getByLabelText('O que você quer registrar?'), 'ABANDONED');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar leitura' }));

    expect(screen.getByText('Informe quando a leitura terminou.')).toBeInTheDocument();
    http.expectNone({ method: 'POST', url: '/api/v1/books/42/readings' });
  });

  it('shows the conflict when the book is already being read somewhere else', async () => {
    const { http, harness } = await open({ readings: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Começar leitura' }));
    http.expectOne({ method: 'POST', url: '/api/v1/books/42/readings' }).flush(
      {
        code: 'reading.in-progress-exists',
        detail: 'Este livro já tem uma leitura em andamento.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Este livro já tem uma leitura em andamento.',
      ),
    );
  });

  it('asks for the page count of the book instead of offering the session form', async () => {
    await open({
      book: { ...FELLOWSHIP, pageCount: null },
      readings: [{ ...READING, progress: { pagesRead: 0, pageCount: null, percent: 0 } }],
      sessions: [],
    });

    expect(screen.getByRole('heading', { name: 'Falta o número de páginas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar o livro' })).toHaveAttribute(
      'href',
      '/livro/42/editar',
    );
    expect(screen.queryByRole('button', { name: 'Salvar sessão' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Sem o número de páginas do livro, não há como prever o fim.'),
    ).toBeInTheDocument();
  });

  it('knows about a session being typed', async () => {
    const { harness } = await open();
    const page = harness.routeDebugElement!.componentInstance as HasUnsavedChanges;

    expect(page.hasUnsavedChanges()).toBe(false);

    await userEvent.type(screen.getByLabelText('Quantas páginas você leu?'), '10');

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
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Livro não encontrado' })).toBeInTheDocument();
  });
});
