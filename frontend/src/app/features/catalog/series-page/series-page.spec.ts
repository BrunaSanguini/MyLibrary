import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SeriesPage from './series-page';

const SERIES = { id: 3, name: 'O Senhor dos Anéis', totalVolumes: 3, bookCount: 3, coverUrls: [] };

const card = (id: number, title: string, position: number, status: string, rating?: number) => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status,
  rating,
  genres: ['Fantasia', 'Alta fantasia'],
  ownership: 'OWNED',
  favorite: false,
  series: { id: 3, name: 'O Senhor dos Anéis', position },
});

const BOOKS = [
  card(1, 'A Sociedade do Anel', 1, 'READ', 5),
  card(2, 'As Duas Torres', 2, 'READ', 4.5),
  card(4, 'O Retorno do Rei', 3, 'READING'),
];

const TREE = [
  {
    id: 10,
    name: 'Fantasia',
    bookCount: 3,
    subgenres: [{ id: 11, name: 'Alta fantasia', bookCount: 3 }],
  },
];

async function open(books = BOOKS) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'series/:id', component: SeriesPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/series/3');
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/series/3').flush(SERIES);
  const listing = http.expectOne((request) => request.url === '/api/v1/shelf/books');
  expect(listing.request.params.get('seriesId')).toBe('3');
  expect(listing.request.params.get('sort')).toBe('seriesPosition');
  listing.flush({ content: books, page: 0, size: 100, totalElements: books.length, totalPages: 1 });
  await vi.waitFor(() => {
    TestBed.tick();
    http.expectOne('/api/v1/genres').flush(TREE);
  });
  await harness.fixture.whenStable();
  return { harness, http };
}

const volumeTitles = () =>
  within(screen.getByRole('region', { name: 'Livros da série' }))
    .getAllByRole('link')
    .map((link) => link.textContent.replace(/Livro \d+:/, '').trim());

describe('SeriesPage', () => {
  it('names the series, its authors and how many volumes were read', async () => {
    await open();

    expect(
      screen.getByRole('heading', { level: 1, name: 'O Senhor dos Anéis' }),
    ).toBeInTheDocument();
    expect(screen.getByText('J. R. R. Tolkien', { selector: '.authors' })).toBeInTheDocument();
    const summary = screen.getByRole('list', { name: 'Resumo da série' });
    expect(summary).toHaveTextContent('3 livros');
    expect(summary).toHaveTextContent('2 lidos');
    expect(within(summary).queryByText('Série completa')).not.toBeInTheDocument();
  });

  it('calls the series complete once every volume was read', async () => {
    await open(BOOKS.map((book) => ({ ...book, status: 'READ' })));

    expect(screen.getByText('Série completa')).toBeInTheDocument();
  });

  it('shows the genres, the progress and the average rating in Sobre a série', async () => {
    await open();

    expect(screen.getByRole('link', { name: 'Fantasia' })).toHaveAttribute('href', '/generos/10');
    expect(screen.getByRole('link', { name: 'Alta fantasia' })).toHaveAttribute(
      'href',
      '/generos/11',
    );
    expect(screen.getByText('2 de 3')).toBeInTheDocument();
    expect(screen.getByText('4,8')).toBeInTheDocument();
  });

  it('lists the volumes in reading order and turns the order around', async () => {
    await open();

    expect(volumeTitles()).toEqual(['A Sociedade do Anel', 'As Duas Torres', 'O Retorno do Rei']);
    await userEvent.click(screen.getByRole('button', { name: /Ordem da série/ }));
    expect(volumeTitles()).toEqual(['O Retorno do Rei', 'As Duas Torres', 'A Sociedade do Anel']);
  });

  it('marks a volume as favorite from the list', async () => {
    const { http } = await open();
    const toggle = screen.getByRole('button', { name: 'Favoritar As Duas Torres' });

    await userEvent.click(toggle);

    http.expectOne({ method: 'PUT', url: '/api/v1/books/2/favorite' }).flush(null);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the reviews of the volumes in Minhas resenhas', async () => {
    const { http, harness } = await open();

    await userEvent.click(screen.getByRole('tab', { name: 'Minhas resenhas' }));
    await vi.waitFor(() => {
      TestBed.tick();
      http
        .expectOne('/api/v1/books/1/review')
        .flush({ bookId: 1, rating: 5, content: 'Uma jornada que não envelhece.' });
    });
    http
      .expectOne('/api/v1/books/2/review')
      .flush({ code: 'review.not-found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/v1/books/4/review')
      .flush({ code: 'review.not-found' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: '1. A Sociedade do Anel' })).toBeInTheDocument();
    expect(screen.getByText('Uma jornada que não envelhece.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2. As Duas Torres' })).not.toBeInTheDocument();
  });

  it('says so when the series does not exist', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'series/:id', component: SeriesPage }], withComponentInputBinding()),
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/series/99');
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http
      .expectOne('/api/v1/series/99')
      .flush({ code: 'series.not-found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush({
        content: [],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
      });

    await vi.waitFor(() => {
      TestBed.tick();
      expect(screen.getByRole('heading', { name: 'Série não encontrada' })).toBeInTheDocument();
    });
    harness.fixture.destroy();
  });
});
