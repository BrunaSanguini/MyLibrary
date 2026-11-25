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

const PINNED = {
  id: 7,
  name: 'Fantasia épica essencial',
  description: 'Mundos enormes, mapas no começo e jornadas longas.',
  bookCount: 8,
  readCount: 5,
  wishlistCount: 0,
  status: 'IN_PROGRESS',
  color: 'FOREST',
  pinned: true,
  coverUrls: [],
  updatedAt: '2026-11-02T12:00:00Z',
};

const BOOK = { authors: [], genres: [], favorite: false, reread: false, ownership: 'OWNED' };

/** The books of the pinned list: two read, one being read and one not started. */
const PINNED_BOOKS = [
  { ...BOOK, id: 1, title: 'A Sociedade do Anel', status: 'READ' },
  { ...BOOK, id: 2, title: 'O Hobbit', status: 'READ' },
  { ...BOOK, id: 3, title: 'O Nome do Vento', status: 'READING' },
  { ...BOOK, id: 4, title: 'O Império Final', status: 'WANT_TO_READ' },
];

/** How many books the shelf has under each special list. */
function specialCountOf(params: { get(name: string): string | null }): number {
  if (params.get('ownership') === 'WISHLIST') {
    return 12;
  }
  return params.get('favorite') === 'true' ? 8 : 1;
}

/** Answers the shelf: the count of each special list, and the books of the pinned one. */
function answerShelf(http: HttpTestingController) {
  for (const request of http.match((candidate) => candidate.url === '/api/v1/shelf/books')) {
    const params = request.request.params;
    if (params.has('listId')) {
      request.flush(pageOf(PINNED_BOOKS));
    } else {
      request.flush(pageOf([], specialCountOf(params), 1));
    }
  }
}

/**
 * Answers every request the page has made: the cards, the count of each tab, the pinned list
 * (none, unless given) and the shelf behind the special lists.
 */
async function answer(
  http: HttpTestingController,
  harness: RouterTestingHarness,
  cards: object = CARDS,
  pinned: object = pageOf([]),
) {
  for (const request of http.match((candidate) => candidate.url === '/api/v1/lists')) {
    const params = request.request.params;
    if (params.get('pinned') === 'true') {
      request.flush(pinned);
    } else if (params.get('size') === '1') {
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
  answerShelf(http);
  if ((pinned as { content: unknown[] }).content.length > 0) {
    // The pinned list asks for its books only once it is on the screen.
    await vi.waitFor(() => {
      TestBed.tick();
      const books = http.match((candidate) => candidate.params.has('listId'));
      expect(books).toHaveLength(1);
      books[0]!.flush(pageOf(PINNED_BOOKS));
    });
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
    const counts = requests.filter(
      (request) =>
        request.request.params.get('size') === '1' &&
        request.request.params.get('pinned') === 'false',
    );
    const pinned = requests.filter((request) => request.request.params.get('pinned') === 'true');

    expect(pinned).toHaveLength(1);
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
    answerShelf(http);
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado.');
    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    TestBed.tick();
    expect(http.match((request) => request.url === '/api/v1/lists').length).toBeGreaterThan(0);
  });

  describe('special lists', () => {
    it('counts the books of each one and opens the shelf already filtered', async () => {
      await openAnswered();

      const specials = screen.getByRole('region', { name: 'Listas especiais' });
      const wishlist = within(specials).getByRole('link', { name: /Wishlist/ });
      expect(wishlist).toHaveAttribute('href', '/estante?status=wishlist');
      expect(wishlist).toHaveTextContent('Livros que você quer ter');
      expect(wishlist).toHaveTextContent('12 livros');
      expect(within(specials).getByRole('link', { name: /Favoritos/ })).toHaveAttribute(
        'href',
        '/estante?favoritos=1',
      );
      const rereads = within(specials).getByRole('link', { name: /Releituras/ });
      expect(rereads).toHaveAttribute('href', '/estante?releituras=1');
      expect(rereads).toHaveTextContent('1 livro');
    });
  });

  describe('pinned list', () => {
    it('shows the pinned list in large, with its progress and both ways in', async () => {
      const { http, harness } = await open();
      await answer(http, harness, CARDS, pageOf([PINNED]));

      const pinned = screen.getByRole('region', { name: 'Fantasia épica essencial' });
      expect(within(pinned).getByText(/Lista fixada/)).toBeInTheDocument();
      expect(
        within(pinned).getByRole('heading', { level: 2, name: 'Fantasia épica essencial' }),
      ).toBeInTheDocument();
      expect(within(pinned).getByText('5 de 8 lidos')).toBeInTheDocument();
      expect(within(pinned).getByText('63%')).toBeInTheDocument();
      expect(within(pinned).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '63');
      expect(within(pinned).getByRole('link', { name: 'Abrir lista' })).toHaveAttribute(
        'href',
        '/lista/7',
      );
      expect(within(pinned).getByRole('link', { name: 'Adicionar livros' })).toHaveAttribute(
        'href',
        '/lista/7?adicionar=true',
      );
    });

    it('draws one spine per book, marking the read one and the one being read', async () => {
      const { http, harness } = await open();
      await answer(http, harness, CARDS, pageOf([PINNED]));

      const states = [...document.querySelectorAll<HTMLElement>('.spine')].map((spine) => [
        spine.title,
        spine.dataset['state'],
      ]);
      expect(states).toEqual([
        ['A Sociedade do Anel', 'read'],
        ['O Hobbit', 'read'],
        ['O Nome do Vento', 'reading'],
        ['O Império Final', 'unread'],
      ]);
    });

    it('hides the section when no list is pinned', async () => {
      await openAnswered();

      expect(screen.queryByText(/Lista fixada/)).not.toBeInTheDocument();
    });

    it('does not call the page empty when the pinned list is the only one', async () => {
      const { http, harness } = await open();
      COUNTS['todas'] = 0;
      try {
        await answer(http, harness, pageOf([]), pageOf([PINNED]));
      } finally {
        COUNTS['todas'] = 2;
      }

      expect(
        screen.queryByRole('heading', { name: 'Nenhuma lista ainda' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Fantasia épica essencial' })).toBeInTheDocument();
    });
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
      expect(
        requests.filter(
          (request) =>
            request.request.params.get('size') === '1' &&
            request.request.params.get('pinned') === 'false',
        ),
      ).toHaveLength(4);
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
