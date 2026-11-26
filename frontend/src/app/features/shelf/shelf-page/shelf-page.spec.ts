import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ShelfPage from './shelf-page';

const FELLOWSHIP = {
  id: 42,
  title: 'A Sociedade do Anel',
  authors: ['J. R. R. Tolkien'],
  genres: ['Alta fantasia'],
  status: 'READ',
  ownership: 'OWNED',
  favorite: true,
  reread: true,
  rating: 4.5,
  publishedYear: 1954,
  series: { id: 3, name: 'O Senhor dos Anéis', position: 1 },
};

const DUNE = {
  id: 7,
  title: 'Duna',
  authors: ['Frank Herbert'],
  genres: [],
  status: 'WANT_TO_READ',
  ownership: 'WISHLIST',
  favorite: false,
  reread: false,
};

const SUMMARY = {
  shelf: 26,
  reading: 2,
  read: 15,
  wantToRead: 7,
  abandoned: 2,
  wishlist: 4,
  favorites: 6,
  rereads: 1,
};

function page(content: object[], totalElements = content.length, pageIndex = 0) {
  return {
    content,
    page: pageIndex,
    size: 12,
    totalElements,
    totalPages: Math.ceil(totalElements / 12),
  };
}

/** Opens /estante at the given URL and answers every request; returns what the listing asked. */
async function openShelf(url: string, body: object = page([FELLOWSHIP])) {
  TestBed.configureTestingModule({
    providers: [
      // Same binding the app uses: without it the query params never reach the inputs.
      provideRouter([{ path: 'estante', component: ShelfPage }], withComponentInputBinding()),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  const request = http.expectOne((candidate) => candidate.url === '/api/v1/shelf/books');
  request.flush(body);
  http.expectOne('/api/v1/shelf/summary').flush(SUMMARY);
  http
    .expectOne('/api/v1/genres')
    .flush([{ id: 1, name: 'Fantasia', bookCount: 3, subgenres: [] }]);
  for (const kind of ['authors', 'series', 'publishers']) {
    http
      .expectOne((candidate) => candidate.url === `/api/v1/${kind}`)
      .flush({
        content: [{ id: 9, name: `Um ${kind}` }],
        page: 0,
        size: 100,
        totalElements: 1,
        totalPages: 1,
      });
  }
  await harness.fixture.whenStable();
  return { harness, http, params: request.request.params };
}

/** After a change: answers the new listing, if the change asked for one, and lets the page settle. */
async function settle(harness: RouterTestingHarness) {
  TestBed.tick();
  const http = TestBed.inject(HttpTestingController);
  for (const request of http.match((candidate) => candidate.url === '/api/v1/shelf/books')) {
    request.flush(page([FELLOWSHIP]));
  }
  await harness.fixture.whenStable();
}

describe('ShelfPage', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the title, the numbers of the shelf and the books, each a link to its page', async () => {
    await openShelf('/estante');

    expect(screen.getByRole('heading', { name: 'Minha Estante', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('26 livros · 15 lidos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /A Sociedade do Anel/ })).toHaveAttribute(
      'href',
      '/livro/42',
    );
    expect(screen.getByText('Mostrando 1–1 de 1 livro')).toBeInTheDocument();
    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('leaves the wishlist out and asks for twelve books, the newest first', async () => {
    const { params } = await openShelf('/estante');

    expect(params.get('wishlist')).toBe('false');
    expect(params.get('size')).toBe('12');
    expect(params.get('sort')).toBe('addedAt');
    expect(params.has('status')).toBe(false);
  });

  it('counts every tab and chip, with Todos chosen', async () => {
    await openShelf('/estante');

    const tabs = screen.getByRole('tablist', { name: 'Status de leitura' });
    expect(within(tabs).getByRole('tab', { name: /Todos 26/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tabs).getByRole('tab', { name: /Lidos 15/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(within(tabs).getByRole('tab', { name: /Wishlist 4/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Favoritos 6/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Releituras 1/ })).toBeInTheDocument();
  });

  it('turns the tab of the address bar into the status of the request', async () => {
    const { params } = await openShelf('/estante?status=lidos');

    expect(params.get('status')).toBe('READ');
    expect(params.get('wishlist')).toBe('false');
  });

  it('still opens the tab of an address of the earlier version', async () => {
    const { params } = await openShelf('/estante?status=READING');

    expect(params.get('status')).toBe('READING');
  });

  it('shows only the wishlist on its tab, with the note and the WISHLIST label', async () => {
    const { params } = await openShelf('/estante?status=wishlist', page([DUNE]));

    expect(params.get('wishlist')).toBe('true');
    expect(params.has('status')).toBe(false);
    expect(screen.getByText('4 livros que você quer ter')).toBeInTheDocument();
    expect(screen.getByText(/Livros que você ainda não tem/)).toBeInTheDocument();
    expect(screen.getByText('Wishlist', { selector: '.status' })).toBeInTheDocument();
  });

  it('sends the chips, the selects and the order of the address bar', async () => {
    const { params } = await openShelf(
      '/estante?favoritos=1&releituras=1&genero=1&autor=2&serie=3&editora=4&ordem=nota&page=2',
    );

    expect(params.get('favorite')).toBe('true');
    expect(params.get('reread')).toBe('true');
    expect(params.get('genreId')).toBe('1');
    expect(params.get('authorId')).toBe('2');
    expect(params.get('seriesId')).toBe('3');
    expect(params.get('publisherId')).toBe('4');
    expect(params.get('sort')).toBe('rating,desc');
    expect(params.get('page')).toBe('2');
  });

  it('sorts by the year of publication, the newest first', async () => {
    const { params } = await openShelf('/estante?ordem=ano');

    expect(params.get('sort')).toBe('publishedYear,desc');
  });

  it('drops what is not a valid filter', async () => {
    const { params } = await openShelf('/estante?status=emprestado&ordem=preco&genero=abc&page=x');

    expect(params.has('status')).toBe(false);
    expect(params.get('sort')).toBe('addedAt');
    expect(params.has('genreId')).toBe(false);
    expect(params.get('page')).toBe('0');
  });

  it('puts the seals of favourite and reread on the cover', async () => {
    await openShelf('/estante');

    expect(screen.getByRole('img', { name: 'Favorito' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Relido' })).toBeInTheDocument();
    expect(screen.getByText('Lido', { selector: '.status' })).toBeInTheDocument();
  });

  it('choosing a tab goes back to page 1', async () => {
    const { harness } = await openShelf('/estante?page=2');

    await userEvent.click(screen.getByRole('tab', { name: /Abandonados/ }));
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante?status=abandonados');
  });

  it('moves between the tabs with the arrows', async () => {
    const { harness } = await openShelf('/estante');

    screen.getByRole('tab', { name: /Todos/ }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante?status=wishlist');
  });

  it('turns a chip on and off', async () => {
    const { harness } = await openShelf('/estante?favoritos=1');

    const favorites = screen.getByRole('button', { name: /Favoritos/ });
    expect(favorites).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(favorites);
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante');
  });

  it('filters by a select and by the order', async () => {
    const { harness } = await openShelf('/estante');

    await userEvent.selectOptions(screen.getByLabelText('Autor'), '9');
    await settle(harness);
    expect(TestBed.inject(Router).url).toBe('/estante?autor=9');

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'titulo');
    await settle(harness);
    expect(TestBed.inject(Router).url).toBe('/estante?autor=9&ordem=titulo');
  });

  it('searches as the reader types, after a short pause', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { harness } = await openShelf('/estante');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.type(screen.getByRole('searchbox', { name: 'Buscar na estante' }), 'anel');
    await vi.advanceTimersByTimeAsync(300);
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante?q=anel');
  });

  it('clears the search with its button', async () => {
    const { harness } = await openShelf('/estante?q=anel');

    expect(screen.getByRole('searchbox', { name: 'Buscar na estante' })).toHaveValue('anel');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante');
  });

  it('shows "Limpar filtros" only with a filter on, and keeps the order when clearing', async () => {
    const { harness } = await openShelf('/estante?status=lidos&favoritos=1&ordem=autor');

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante?ordem=autor');
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('switches between grid and list, the list with genre, series and rating', async () => {
    await openShelf('/estante');

    const grid = screen.getByRole('button', { name: 'Ver em grade' });
    expect(grid).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ver em lista' }));

    expect(screen.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('J. R. R. Tolkien · 1954')).toBeInTheDocument();
    expect(screen.getByText('O Senhor dos Anéis')).toBeInTheDocument();
    expect(screen.getByText('4,5 ★')).toBeInTheDocument();
  });

  it('pages twelve at a time, with the current page marked', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { harness } = await openShelf('/estante?page=1', page([FELLOWSHIP], 26, 1));

    expect(screen.getByText('Mostrando 13–13 de 26 livros')).toBeInTheDocument();
    const pages = screen.getByRole('navigation', { name: 'Paginação' });
    expect(within(pages).getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await userEvent.click(within(pages).getByRole('button', { name: 'Próxima ›' }));
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/estante?page=2');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('hides the pages when everything fits in one', async () => {
    await openShelf('/estante');

    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
  });

  it('says when no book matches the filters, with the way back', async () => {
    await openShelf('/estante?status=abandonados', page([]));

    expect(screen.getByRole('heading', { name: 'Nenhum livro com esses filtros' })).toBeVisible();
    expect(screen.getByText('0 livros')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Limpar filtros' })).toHaveLength(2);
  });

  it('invites to add the first book when the shelf is empty', async () => {
    await openShelf('/estante', page([]));

    expect(screen.getByRole('heading', { name: 'Sua estante está vazia' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /Adicionar livro/ })[0]).toHaveAttribute(
      'href',
      '/estante/novo',
    );
  });
});
