import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BookAdder } from './book-adder';

const card = (id: number, title: string) => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status: 'WANT_TO_READ',
  genres: [],
  ownership: 'OWNED',
  favorite: false,
});

async function setup() {
  const added = vi.fn();
  const view = await render(BookAdder, {
    inputs: { listId: 4, inList: new Set([1]) },
    on: { added },
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { view, added, http: TestBed.inject(HttpTestingController) };
}

async function search(
  view: Awaited<ReturnType<typeof setup>>['view'],
  http: HttpTestingController,
) {
  await userEvent.type(screen.getByLabelText('Buscar na estante'), 'tolkien');
  await vi.waitFor(() => {
    TestBed.tick();
    http
      .expectOne(
        (request) => request.url === '/api/v1/shelf/books' && request.params.get('q') === 'tolkien',
      )
      .flush({
        content: [card(1, 'O Hobbit'), card(2, 'O Silmarillion')],
        page: 0,
        size: 8,
        totalElements: 2,
        totalPages: 1,
      });
  });
  await view.fixture.whenStable();
}

describe('BookAdder', () => {
  it('finds books of the shelf and marks the ones already in the list', async () => {
    const { view, http } = await setup();

    await search(view, http);

    expect(
      await screen.findByRole('button', { name: 'Adicionar O Silmarillion à lista' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Já está na lista')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adicionar O Hobbit à lista' }),
    ).not.toBeInTheDocument();
  });

  it('adds a book with one click', async () => {
    const { view, http, added } = await setup();
    await search(view, http);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Adicionar O Silmarillion à lista' }),
    );
    http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/books/2' }).flush(null);
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(added).toHaveBeenCalledWith(expect.objectContaining({ id: 2 })));
  });

  it('asks nothing for a single letter', async () => {
    const { http } = await setup();

    await userEvent.type(screen.getByLabelText('Buscar na estante'), 't');
    await new Promise((resolve) => setTimeout(resolve, 300));
    TestBed.tick();

    http.expectNone((request) => request.url === '/api/v1/shelf/books');
  });
});
