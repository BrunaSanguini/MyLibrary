import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ListPage from './list-page';

const LIST = {
  id: 4,
  name: 'Para as férias',
  description: 'Leituras leves',
  bookCount: 3,
  readCount: 1,
  wishlistCount: 0,
  status: 'IN_PROGRESS',
  color: 'PLUM',
  pinned: false,
  coverUrls: [],
  updatedAt: '2026-11-01T12:00:00Z',
};

const card = (id: number, title: string) => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status: 'WANT_TO_READ',
  genres: [],
  ownership: 'OWNED',
  favorite: false,
});

const BOOKS = [card(1, 'A Sociedade do Anel'), card(2, 'O Hobbit'), card(3, 'Duna')];

async function open(url = '/lista/4') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'lista/:id', component: ListPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openWithBooks() {
  const opened = await open();
  opened.http.expectOne('/api/v1/lists/4').flush(LIST);
  opened.http
    .expectOne((request) => request.url === '/api/v1/shelf/books')
    .flush({ content: BOOKS, page: 0, size: 100, totalElements: 3, totalPages: 1 });
  await opened.harness.fixture.whenStable();
  return opened;
}

const orderOfBooks = () =>
  Array.from(document.querySelectorAll('ol.books a.title')).map((link) => link.textContent.trim());

describe('ListPage', () => {
  it('marks the books already read and the ones in the wishlist', async () => {
    const opened = await open();
    opened.http.expectOne('/api/v1/lists/4').flush(LIST);
    opened.http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush({
        content: [
          { ...card(1, 'A Sociedade do Anel'), status: 'READ' },
          { ...card(2, 'O Hobbit'), ownership: 'WISHLIST' },
          card(3, 'Duna'),
        ],
        page: 0,
        size: 100,
        totalElements: 3,
        totalPages: 1,
      });
    await opened.harness.fixture.whenStable();

    const row = (title: string) => screen.getByRole('link', { name: title }).closest('li')!;
    expect(row('A Sociedade do Anel')).toHaveClass('read');
    expect(
      within(row('A Sociedade do Anel')).getByText('Lido', { selector: '.badge' }),
    ).toBeInTheDocument();
    expect(row('O Hobbit')).toHaveClass('wishlist');
    expect(within(row('O Hobbit')).getByText('Wishlist')).toBeInTheDocument();
    expect(row('Duna')).not.toHaveClass('read');
    expect(row('Duna')).not.toHaveClass('wishlist');
  });

  it('shows the list and its books in the order of the list', async () => {
    await openWithBooks();

    expect(screen.getByRole('heading', { level: 1, name: 'Para as férias' })).toBeInTheDocument();
    expect(screen.getByText('1 lido de 3')).toBeInTheDocument();
    expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'O Hobbit', 'Duna']);
    expect(
      screen.getByRole('button', { name: 'Mover A Sociedade do Anel para cima' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Duna para baixo' })).toBeDisabled();
  });

  it('moves a book with the keyboard, keeps the focus on it and says where it went', async () => {
    const { http, harness } = await openWithBooks();

    screen.getByRole('button', { name: 'Mover O Hobbit para cima' }).focus();
    await userEvent.keyboard('{Enter}');
    await harness.fixture.whenStable();

    expect(orderOfBooks()).toEqual(['O Hobbit', 'A Sociedade do Anel', 'Duna']);
    expect(screen.getByRole('status')).toHaveTextContent('O Hobbit agora é o 1º de 3.');
    const request = http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/order' });
    expect(request.request.body).toEqual({ bookIds: [2, 1, 3] });
    request.flush(null);
    // At the top, "up" is disabled, so the focus goes to its pair.
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mover O Hobbit para baixo' })).toHaveFocus(),
    );
  });

  it('fetches the list again when the server refuses the new order', async () => {
    const { http, harness } = await openWithBooks();

    await userEvent.click(screen.getByRole('button', { name: 'Mover Duna para cima' }));
    http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/order' }).flush(
      {
        code: 'list.invalid-order',
        detail: 'A nova ordem precisa ter exatamente os livros da lista.',
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('A nova ordem precisa ter'),
    );
    await vi.waitFor(() => http.expectOne('/api/v1/lists/4'));
  });

  it('removes a book from the list', async () => {
    const { http, harness } = await openWithBooks();

    await userEvent.click(screen.getByRole('button', { name: 'Remover O Hobbit da lista' }));
    await harness.fixture.whenStable();

    expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'Duna']);
    http.expectOne({ method: 'DELETE', url: '/api/v1/lists/4/books/2' }).flush(null);
    await vi.waitFor(() => http.expectOne('/api/v1/lists/4').flush({ ...LIST, bookCount: 2 }));
  });

  it('says the list does not exist when the API answers 404', async () => {
    const { harness, http } = await open();
    http
      .expectOne('/api/v1/lists/4')
      .flush(
        { code: 'list.not-found', detail: 'A lista solicitada não existe.' },
        { status: 404, statusText: 'Not Found' },
      );
    http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush(
        { code: 'list.not-found', detail: 'A lista solicitada não existe.' },
        { status: 404, statusText: 'Not Found' },
      );
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Lista não encontrada' })).toBeInTheDocument();
  });
});
