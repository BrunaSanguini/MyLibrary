import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { NOW } from '@core/time/today';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ListsPage from './lists-page';

@Component({ template: '' })
class ListStub {}

const VACATION = {
  id: 4,
  name: 'Para as férias',
  description: 'Leituras leves',
  bookCount: 4,
  readCount: 1,
  wishlistCount: 0,
  status: 'IN_PROGRESS',
  color: 'PLUM',
  pinned: false,
  coverUrls: ['/api/v1/images/a.webp'],
  updatedAt: '2026-11-01T12:00:00Z',
};

const CLASSICS = {
  id: 5,
  name: 'Clássicos',
  bookCount: 0,
  readCount: 0,
  wishlistCount: 0,
  status: 'NOT_STARTED',
  color: 'RUST',
  pinned: false,
  coverUrls: [],
  updatedAt: '2026-10-01T12:00:00Z',
};

function pageOf(content: unknown[], totalElements = content.length, size = 100) {
  return { content, page: 0, size, totalElements, totalPages: Math.ceil(totalElements / size) };
}

const CARDS = pageOf([VACATION, CLASSICS]);

/** What each tab counts: all of them, then the ones with some, all and none of their books read. */
const COUNTS: Record<string, number> = { todas: 2, IN_PROGRESS: 1, COMPLETED: 0, NOT_STARTED: 1 };

async function open(url = '/listas') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'listas', component: ListsPage },
          { path: 'lista/:id', component: ListStub },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: NOW, useValue: () => new Date('2026-11-04T12:00:00Z') },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

/** Answers every request the page has made to the lists: the cards, and the count of each tab. */
async function answer(
  http: HttpTestingController,
  harness: RouterTestingHarness,
  cards: object = CARDS,
) {
  for (const request of http.match((candidate) => candidate.url === '/api/v1/lists')) {
    const params = request.request.params;
    if (params.get('size') === '1') {
      const total = COUNTS[params.get('status') ?? 'todas']!;
      request.flush(
        pageOf(
          Array.from({ length: Math.min(total, 1) }, () => VACATION),
          total,
          1,
        ),
      );
    } else {
      request.flush(cards);
    }
  }
  await harness.fixture.whenStable();
}

async function openAnswered(url = '/listas') {
  const view = await open(url);
  await answer(view.http, view.harness);
  return view;
}

describe('ListsPage', () => {
  it('asks for the cards by the last change, without the pinned list, and counts each tab', async () => {
    const { http } = await open();

    const requests = http.match((request) => request.url === '/api/v1/lists');
    const cards = requests.filter((request) => request.request.params.get('size') === '100');
    const counts = requests.filter((request) => request.request.params.get('size') === '1');

    expect(cards).toHaveLength(1);
    expect(cards[0]!.request.params.get('sort')).toBe('updatedAt,desc');
    expect(cards[0]!.request.params.get('pinned')).toBe('false');
    expect(cards[0]!.request.params.has('status')).toBe(false);
    expect(counts.map((request) => request.request.params.get('status'))).toEqual([
      null,
      'IN_PROGRESS',
      'COMPLETED',
      'NOT_STARTED',
    ]);
  });

  it('shows each list with how much of it was read and when it changed', async () => {
    await openAnswered();

    expect(screen.getByRole('heading', { level: 1, name: 'Listas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Para as férias' })).toHaveAttribute(
      'href',
      '/lista/4',
    );
    expect(screen.getByText('Leituras leves')).toBeInTheDocument();
    expect(screen.getByText('1 de 4 lidos')).toBeInTheDocument();
    expect(screen.getByText('Em andamento', { selector: '.status' })).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Livros lidos de Para as férias' }),
    ).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('há 3 dias')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Clássicos' })).toBeInTheDocument();
    expect(screen.getByText('0 de 0 lidos')).toBeInTheDocument();
    expect(screen.getByText('Sem descrição por enquanto.')).toBeInTheDocument();
    expect(screen.getByText('Não iniciada', { selector: '.status' })).toBeInTheDocument();
    expect(screen.getByText('há 1 mês')).toBeInTheDocument();
  });

  it('shows the four tabs with their counts, and "Todas" open', async () => {
    await openAnswered();

    const tabs = within(screen.getByRole('tablist', { name: 'Filtrar listas' })).getAllByRole(
      'tab',
    );
    expect(tabs.map((tab) => tab.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Todas 2',
      'Em andamento 1',
      'Concluídas 0',
      'Não iniciadas 1',
    ]);
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Em andamento/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByText('ordenadas pelas mais recentes')).toBeInTheDocument();
  });

  it('narrows the cards to the tab that was clicked, in the URL', async () => {
    const { http, harness } = await openAnswered();

    await userEvent.click(screen.getByRole('tab', { name: /Em andamento/ }));
    TestBed.tick();

    const request = http.expectOne(
      (candidate) =>
        candidate.params.get('status') === 'IN_PROGRESS' && candidate.params.get('size') === '100',
    );
    request.flush(pageOf([VACATION]));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/listas?filtro=andamento');
    expect(screen.getByRole('tab', { name: /Em andamento/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('link', { name: 'Clássicos' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Para as férias' })).toBeInTheDocument();
  });

  it('opens on the tab the URL asks for, and ignores one it does not know', async () => {
    const { http } = await open('/listas?filtro=concluida');
    const cards = http
      .match((request) => request.url === '/api/v1/lists')
      .filter((request) => request.request.params.get('size') === '100');
    expect(cards[0]!.request.params.get('status')).toBe('COMPLETED');

    TestBed.resetTestingModule();
    const unknown = await open('/listas?filtro=qualquer');
    const all = unknown.http
      .match((request) => request.url === '/api/v1/lists')
      .filter((request) => request.request.params.get('size') === '100');
    expect(all[0]!.request.params.has('status')).toBe(false);
  });

  it('moves between the tabs with the arrows, carrying the focus', async () => {
    const { http, harness } = await openAnswered();

    screen.getByRole('tab', { name: /Todas/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    TestBed.tick();
    http
      .match((request) => request.url === '/api/v1/lists')
      .forEach((request) => request.flush(CARDS));
    await harness.fixture.whenStable();

    expect(screen.getByRole('tab', { name: /Em andamento/ })).toHaveFocus();
    expect(TestBed.inject(Router).url).toBe('/listas?filtro=andamento');
    expect(screen.getByRole('tab', { name: /Em andamento/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveAttribute('tabindex', '-1');
  });

  it('says so when no list has the status', async () => {
    const { http, harness } = await open('/listas?filtro=concluida');
    await answer(http, harness, pageOf([]));

    expect(screen.getByText('Nenhuma lista com esse status por enquanto.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Concluídas/ })).toBeInTheDocument();
  });

  it('invites to create the first list when there is none', async () => {
    const { http, harness } = await open();
    COUNTS['todas'] = 0;
    try {
      await answer(http, harness, pageOf([]));
    } finally {
      COUNTS['todas'] = 2;
    }

    expect(screen.getByRole('heading', { name: 'Nenhuma lista ainda' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('shows the error of the server and tries again', async () => {
    const { http, harness } = await open();
    for (const request of http.match((candidate) => candidate.url === '/api/v1/lists')) {
      request.flush(
        { code: 'internal', detail: 'Algo deu errado.' },
        { status: 500, statusText: 'Server Error' },
      );
    }
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado.');
    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    TestBed.tick();
    expect(http.match((request) => request.url === '/api/v1/lists').length).toBeGreaterThan(0);
  });

  describe('new list', () => {
    it('opens the form under the title and closes it with Cancelar, back on the button', async () => {
      await openAnswered();
      const button = screen.getByRole('button', { name: 'Nova lista' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('form', { name: 'Criar nova lista' })).not.toBeInTheDocument();

      await userEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('form', { name: 'Criar nova lista' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome da lista')).toHaveFocus();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('form', { name: 'Criar nova lista' })).not.toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveFocus();
    });

    it('toggles the form with the same button', async () => {
      await openAnswered();

      await userEvent.click(screen.getByRole('button', { name: 'Nova lista' }));
      await userEvent.click(screen.getByRole('button', { name: 'Nova lista' }));

      expect(screen.queryByRole('form', { name: 'Criar nova lista' })).not.toBeInTheDocument();
    });

    it('stays on the page after creating, confirms it and brings the new card and the counts', async () => {
      const { http, harness } = await openAnswered();

      await userEvent.click(screen.getByRole('button', { name: 'Nova lista' }));
      await userEvent.type(screen.getByLabelText('Nome da lista'), 'Para o inverno');
      await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));
      http
        .expectOne({ method: 'POST', url: '/api/v1/lists' })
        .flush({ ...CLASSICS, id: 9, name: 'Para o inverno' });
      await harness.fixture.whenStable();
      TestBed.tick();

      await vi.waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Lista “Para o inverno” criada.'),
      );
      expect(screen.queryByRole('form', { name: 'Criar nova lista' })).not.toBeInTheDocument();
      expect(TestBed.inject(Router).url).toBe('/listas');

      const requests = http.match((request) => request.url === '/api/v1/lists');
      expect(
        requests.filter((request) => request.request.params.get('size') === '100'),
      ).toHaveLength(1);
      expect(requests.filter((request) => request.request.params.get('size') === '1')).toHaveLength(
        4,
      );
    });

    it('goes back to all the lists when it was created under another tab', async () => {
      const { http, harness } = await openAnswered('/listas?filtro=andamento');

      await userEvent.click(screen.getByRole('button', { name: 'Nova lista' }));
      await userEvent.type(screen.getByLabelText('Nome da lista'), 'Para o inverno');
      await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));
      http
        .expectOne({ method: 'POST', url: '/api/v1/lists' })
        .flush({ ...CLASSICS, id: 9, name: 'Para o inverno' });
      await harness.fixture.whenStable();

      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/listas'));
      expect(screen.getByRole('tab', { name: /Todas/ })).toHaveAttribute('aria-selected', 'true');
    });
  });
});
