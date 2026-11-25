import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CatalogPage from './catalog-page';

const card = (id: number, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  authors: ['Machado de Assis'],
  status: 'READ',
  genres: ['Romance', 'Realismo'],
  ownership: 'OWNED',
  favorite: false,
  reread: false,
  ...extra,
});

const CARDS = [
  card(1, 'Dom Casmurro', { series: { id: 5, name: 'Trilogia', position: 1 } }),
  card(2, 'Quincas Borba', { status: 'READING', series: { id: 5, name: 'Trilogia', position: 2 } }),
  card(3, 'Triste Fim', { authors: ['Lima Barreto'], genres: ['Sátira'], status: 'WANT_TO_READ' }),
];

const TREE = [
  { id: 1, name: 'Romance', bookCount: 2, subgenres: [{ id: 2, name: 'Realismo', bookCount: 2 }] },
  { id: 3, name: 'Sátira', bookCount: 1, subgenres: [] },
];

const page = (content: unknown[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'catalogos/:aba', component: CatalogPage },
          { path: '**', children: [] },
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
  const http = TestBed.inject(HttpTestingController);
  const flush = (path: string, body: object) =>
    http.match((request) => request.url === path).forEach((request) => request.flush(body));
  flush('/api/v1/shelf/books', page(CARDS));
  flush('/api/v1/genres', TREE);
  flush(
    '/api/v1/authors',
    page([
      { id: 7, name: 'Machado de Assis', bookCount: 2, coverUrls: [] },
      { id: 8, name: 'Lima Barreto', bookCount: 1, coverUrls: [] },
    ]),
  );
  flush(
    '/api/v1/series',
    page([{ id: 5, name: 'Trilogia', totalVolumes: 3, bookCount: 2, coverUrls: [] }]),
  );
  flush(
    '/api/v1/publishers',
    page([
      { id: 9, name: 'Garnier', bookCount: 2, coverUrls: [] },
      { id: 10, name: 'Penguin', bookCount: 1, coverUrls: [] },
    ]),
  );
  flush('/api/v1/shelf/summary', { shelf: 3, wishlist: 1, read: 1, reading: 1 });
  await harness.fixture.whenStable();
  return { harness, http };
}

describe('CatalogPage', () => {
  it('shows the totals in roman numerals and the tabs with their counts', async () => {
    await open('/catalogos/generos');

    const totals = screen.getByText('Livros', { selector: 'dt' }).closest('dl')!;
    expect(within(totals).getByText('IV')).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Tipo de catálogo' });
    const genres = within(tabs).getByRole('tab', { name: /Gêneros/ });
    expect(genres).toHaveAttribute('aria-selected', 'true');
    expect(genres).toHaveAttribute('href', '/catalogos/generos');
    expect(within(tabs).getByRole('tab', { name: /Autores 2/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('lists the genres with their books, read count and the mascot to unlock', async () => {
    await open('/catalogos/generos');

    const romance = screen.getByRole('article', { name: 'Romance' });
    expect(within(romance).getByText('2 livros · 1 lido')).toBeInTheDocument();
    expect(within(romance).getByText('faltam IX leituras')).toBeInTheDocument();
    const panel = screen.getByRole('complementary', { name: 'Livros do gênero selecionado' });
    expect(within(panel).getByRole('heading', { name: 'Romance' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Ver na Minha Estante' })).toHaveAttribute(
      'href',
      '/estante?genero=1',
    );
  });

  it('narrows the panel to a subgenre and picks another genre', async () => {
    const user = userEvent.setup();
    await open('/catalogos/generos');

    await user.click(screen.getByRole('button', { name: /Realismo/ }));
    const panel = screen.getByRole('complementary', { name: 'Livros do gênero selecionado' });
    expect(
      within(panel).getByRole('button', { name: 'Remover filtro de subgênero' }),
    ).toBeVisible();
    expect(within(panel).getByRole('link', { name: 'Ver na Minha Estante' })).toHaveAttribute(
      'href',
      '/estante?genero=2',
    );

    await user.click(screen.getByRole('button', { name: 'Sátira' }));
    expect(within(panel).getByRole('heading', { name: 'Sátira' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /Triste Fim/ })).toHaveAttribute(
      'href',
      '/livro/3',
    );
  });

  it('shows the authors with their initials and books read', async () => {
    await open('/catalogos/autores');

    const machado = screen.getByRole('link', { name: /Machado de Assis/ });
    expect(machado).toHaveAttribute('href', '/autor/7');
    expect(within(machado).getByText('MA')).toBeInTheDocument();
  });

  it('shows each series with its progress out of the whole series', async () => {
    await open('/catalogos/series');

    const trilogia = screen.getByRole('link', { name: /Trilogia/ });
    expect(trilogia).toHaveAttribute('href', '/serie/5');
    expect(within(trilogia).getByText('1 de 3 lidos')).toBeInTheDocument();
    expect(within(trilogia).getByText('2 na estante')).toBeInTheDocument();
  });

  it('ranks the publishers by books', async () => {
    await open('/catalogos/editoras');

    const links = screen.getAllByRole('link', { name: /Garnier|Penguin/ });
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Garnier', 'Penguin']);
  });

  it('searches the tab without accents and says when nothing is found', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { harness } = await open('/catalogos/generos');

      await user.type(screen.getByRole('searchbox', { name: 'Buscar no catálogo' }), 'satira');
      vi.advanceTimersByTime(200);
      await harness.fixture.whenStable();
      expect(screen.queryByRole('article', { name: 'Romance' })).not.toBeInTheDocument();
      expect(screen.getByRole('article', { name: 'Sátira' })).toBeInTheDocument();

      await user.type(screen.getByRole('searchbox', { name: 'Buscar no catálogo' }), 'x');
      vi.advanceTimersByTime(200);
      await harness.fixture.whenStable();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Nada encontrado para “satirax” neste catálogo.',
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
