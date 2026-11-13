import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import ShelfPage from './shelf-page';

const FELLOWSHIP = {
  id: 42,
  title: 'A Sociedade do Anel',
  authors: ['J. R. R. Tolkien'],
  genres: ['Alta fantasia'],
  ownership: 'OWNED',
  favorite: true,
  series: { id: 3, name: 'O Senhor dos Anéis', position: 1 },
};

function page(content: object[], totalPages = 1, pageIndex = 0) {
  return { content, page: pageIndex, size: 24, totalElements: content.length, totalPages };
}

/** Opens /estante at the given URL and answers the listing request, returning what was asked. */
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
  await harness.fixture.whenStable();
  return { harness, http, params: request.request.params };
}

describe('ShelfPage', () => {
  it('lists the books of the collection', async () => {
    await openShelf('/estante');

    expect(screen.getByRole('heading', { name: 'Minha Estante', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /A Sociedade do Anel/ })).toHaveAttribute(
      'href',
      '/livros/42',
    );
  });

  it('sends the filters of the URL to the API', async () => {
    const { params } = await openShelf(
      '/estante?q=anel&ownership=OWNED&favorite=true&genreId=3&sort=title&page=2',
    );

    expect(params.get('q')).toBe('anel');
    expect(params.get('ownership')).toBe('OWNED');
    expect(params.get('favorite')).toBe('true');
    expect(params.get('genreId')).toBe('3');
    expect(params.get('sort')).toBe('title');
    expect(params.get('page')).toBe('2');
  });

  it('drops a page that is not a number', async () => {
    const { params } = await openShelf('/estante?page=abc');

    expect(params.get('page')).toBe('0');
  });

  it('drops an ownership outside the enum', async () => {
    const { params } = await openShelf('/estante?ownership=EMPRESTADO');

    expect(params.has('ownership')).toBe(false);
  });

  it('drops a sort field the back-end would reject', async () => {
    const { params } = await openShelf('/estante?sort=synopsis');

    expect(params.has('sort')).toBe(false);
  });

  it('drops an id that is not a positive number', async () => {
    const { params } = await openShelf('/estante?genreId=-3&authorId=abc&seriesId=0');

    expect(params.has('genreId')).toBe(false);
    expect(params.has('authorId')).toBe(false);
    expect(params.has('seriesId')).toBe(false);
  });

  it('treats anything but true and false as no favorite filter', async () => {
    const { params } = await openShelf('/estante?favorite=sim');

    expect(params.has('favorite')).toBe(false);
  });

  it('keeps an empty term out of the request', async () => {
    const { params } = await openShelf('/estante?q=%20%20');

    expect(params.has('q')).toBe(false);
  });

  it('puts a filter in the URL, so it survives a reload', async () => {
    const { harness } = await openShelf('/estante');

    await userEvent.click(screen.getByRole('button', { name: 'Wishlist' }));

    expect(TestBed.inject(Router).url).toBe('/estante?ownership=WISHLIST');
    expect(harness).toBeDefined();
  });

  it('turns a filter off when its own tag is clicked again', async () => {
    await openShelf('/estante?ownership=WISHLIST');

    await userEvent.click(screen.getByRole('button', { name: 'Wishlist' }));

    expect(TestBed.inject(Router).url).toBe('/estante');
  });

  it('goes back to the first page when a filter changes', async () => {
    await openShelf('/estante?page=3', page([FELLOWSHIP], 5, 3));

    await userEvent.click(screen.getByRole('button', { name: 'Favoritos' }));

    expect(TestBed.inject(Router).url).toBe('/estante?favorite=true');
  });

  it('hides the paginator when everything fits in one page', async () => {
    await openShelf('/estante');

    expect(screen.queryByRole('button', { name: 'Próxima página' })).not.toBeInTheDocument();
  });

  it('shows the paginator when there is more than one page', async () => {
    await openShelf('/estante', page([FELLOWSHIP], 3));

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeInTheDocument();
  });

  it('offers to add a book when the shelf is empty', async () => {
    await openShelf('/estante', page([]));

    expect(screen.getByRole('heading', { name: 'Sua estante está vazia' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Adicionar livro' })).toHaveAttribute(
      'href',
      '/livros/novo',
    );
  });

  it('offers to clear the filters when they are what emptied the shelf', async () => {
    await openShelf('/estante?q=xyz', page([]));

    expect(
      screen.getByRole('heading', { name: 'Nenhum livro com esses filtros' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('shows the detail the API wrote when the request fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'estante', component: ShelfPage }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estante');
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http
      .expectOne((candidate) => candidate.url === '/api/v1/shelf/books')
      .flush(
        { code: 'request.invalid-sort', detail: 'A ordenação pedida não existe.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('A ordenação pedida não existe.')).toBeInTheDocument();
  });
});
