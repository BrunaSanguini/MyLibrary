import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AuthorPage from './author-page';

const card = (
  id: number,
  title: string,
  publishedYear: number | undefined,
  status: string,
  extra: object = {},
) => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status,
  genres: [],
  ownership: 'OWNED',
  favorite: false,
  publishedYear,
  ...extra,
});

const lotr = (position: number) => ({
  series: { id: 3, name: 'O Senhor dos Anéis', position },
});

const BOOKS = [
  card(2, 'A Sociedade do Anel', 1954, 'READ', { rating: 5, reread: true, ...lotr(1) }),
  card(5, 'O Silmarillion', 1977, 'READING', {
    progress: { pagesRead: 120, pageCount: 352, percent: 34 },
    startedOn: '2026-11-01',
  }),
  card(1, 'O Hobbit', 1937, 'READ', { rating: 4.5 }),
  card(6, 'Contos Inacabados', 1980, 'WANT_TO_READ'),
  card(3, 'As Duas Torres', 1954, 'READ', lotr(2)),
];

async function open(url = '/autor/7') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'autor/:id', component: AuthorPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openTolkien() {
  const opened = await open();
  opened.http.expectOne('/api/v1/authors/7').flush({ id: 7, name: 'J. R. R. Tolkien' });
  const listing = opened.http.expectOne((request) => request.url === '/api/v1/shelf/books');
  expect(listing.request.params.get('authorId')).toBe('7');
  listing.flush({ content: BOOKS, page: 0, size: 100, totalElements: 5, totalPages: 1 });
  await opened.harness.fixture.whenStable();
  return opened;
}

const titles = () =>
  within(screen.getByRole('list', { name: 'Livros do autor' }))
    .getAllByRole('link')
    .map((link) => link.querySelector('.book-title')?.textContent);

describe('AuthorPage', () => {
  it('shows the monogram, the numbers of the collection and the series', async () => {
    await openTolkien();

    expect(screen.getByRole('heading', { level: 1, name: 'J. R. R. Tolkien' })).toBeInTheDocument();
    expect(screen.getByText('JT')).toBeInTheDocument();
    const kpis = screen.getByRole('list', { name: 'Este autor no acervo' });
    expect(kpis).toHaveTextContent('5 na estante');
    expect(kpis).toHaveTextContent('3 lidos');
    expect(kpis).toHaveTextContent('1 lendo');
    expect(kpis).toHaveTextContent('4,8 nota média');
    expect(screen.getByRole('link', { name: 'O Senhor dos Anéis · II' })).toHaveAttribute(
      'href',
      '/serie/3',
    );
  });

  it('lists the books in publication order, or in the order picked', async () => {
    await openTolkien();

    expect(titles()).toEqual([
      'O Hobbit',
      'A Sociedade do Anel',
      'As Duas Torres',
      'O Silmarillion',
      'Contos Inacabados',
    ]);
    const order = screen.getByRole('combobox', { name: 'Ordem' });
    await userEvent.selectOptions(order, 'Título (A–Z)');
    expect(titles()[0]).toBe('A Sociedade do Anel');
    await userEvent.selectOptions(order, 'Maior nota');
    expect(titles().slice(0, 2)).toEqual(['A Sociedade do Anel', 'O Hobbit']);
    await userEvent.selectOptions(order, 'Adicionados recentemente');
    expect(titles()[0]).toBe('Contos Inacabados');
  });

  it('filters the books by status, with the count of each', async () => {
    await openTolkien();

    const tabs = screen.getByRole('tablist', { name: 'Filtrar por status' });
    expect(within(tabs).getByRole('tab', { name: 'Todos 5' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(within(tabs).getByRole('tab', { name: 'Lendo 1' }));

    expect(titles()).toEqual(['O Silmarillion']);
    expect(
      screen.getByRole('progressbar', { name: 'Progresso de O Silmarillion' }),
    ).toBeInTheDocument();
  });

  it('marks what was read and what is still to read', async () => {
    await openTolkien();

    const hobbit = screen.getByRole('link', { name: /O Hobbit/ });
    expect(hobbit).toHaveTextContent('1937');
    expect(within(hobbit).getByText('Lido')).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: /A Sociedade do Anel/ })).getByText('Relido'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: /Contos Inacabados/ })).getByText('Quero ler'),
    ).toBeInTheDocument();
  });

  it('says so when the author is not in the collection', async () => {
    const { http } = await open('/autor/99');
    http
      .expectOne('/api/v1/authors/99')
      .flush({ code: 'author.not-found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 });

    await vi.waitFor(() => {
      TestBed.tick();
      expect(screen.getByRole('heading', { name: 'Autor não encontrado' })).toBeInTheDocument();
    });
  });
});
