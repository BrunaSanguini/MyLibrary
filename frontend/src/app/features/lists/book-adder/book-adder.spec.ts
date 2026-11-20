import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BookAdder } from './book-adder';

const card = (id: number, title: string, authors = ['J. R. R. Tolkien']) => ({
  id,
  title,
  authors,
  status: 'WANT_TO_READ',
  genres: [],
  ownership: 'OWNED',
  favorite: false,
  reread: false,
});

const LIBRARY = [
  card(1, 'O Hobbit'),
  card(2, 'O Silmarillion'),
  card(3, 'Os Anéis de Poder', ['Vários']),
];

function pageOf(content: unknown[], page = 0, totalPages = 1) {
  return { content, page, size: 100, totalElements: content.length, totalPages };
}

async function setup(inList: ReadonlySet<number> = new Set([1]), library = LIBRARY) {
  const added = vi.fn();
  const done = vi.fn();
  const view = await render(BookAdder, {
    inputs: { listId: 4, inList },
    on: { added, done },
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  await vi.waitFor(() => {
    TestBed.tick();
    const request = http.expectOne((candidate) => candidate.url === '/api/v1/shelf/books');
    expect(request.request.params.get('sort')).toBe('title,asc');
    expect(request.request.params.get('size')).toBe('100');
    request.flush(pageOf(library));
  });
  await view.fixture.whenStable();
  return { view, added, done, http };
}

const titles = () =>
  screen
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('.title')?.textContent?.trim());

describe('BookAdder', () => {
  it('shows the library without the books the list already has, with the focus on the search', async () => {
    await setup();

    expect(titles()).toEqual(['O Silmarillion', 'Os Anéis de Poder']);
    expect(
      screen.getByText('2 livros disponíveis · os que já estão na lista não aparecem aqui'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar na estante')).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Adicionar O Hobbit à lista' }),
    ).not.toBeInTheDocument();
  });

  it('filters as the reader types, ignoring accents and case, by title and author', async () => {
    await setup();

    await userEvent.type(screen.getByLabelText('Buscar na estante'), 'ANEIS');
    expect(titles()).toEqual(['Os Anéis de Poder']);

    await userEvent.clear(screen.getByLabelText('Buscar na estante'));
    await userEvent.type(screen.getByLabelText('Buscar na estante'), 'tolkien');
    expect(titles()).toEqual(['O Silmarillion']);
  });

  it('says when nothing matches the search', async () => {
    await setup();

    await userEvent.type(screen.getByLabelText('Buscar na estante'), 'Duna');

    expect(screen.getByText('Nenhum livro encontrado para “Duna”.')).toBeInTheDocument();
  });

  it('says when every book of the library is already in the list', async () => {
    await setup(new Set([1, 2, 3]));

    expect(
      screen.getByText('Todos os livros da biblioteca já estão nesta lista.'),
    ).toBeInTheDocument();
  });

  it('walks every page of the library', async () => {
    const added = vi.fn();
    const view = await render(BookAdder, {
      inputs: { listId: 4, inList: new Set<number>() },
      on: { added },
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      TestBed.tick();
      http
        .expectOne((request) => request.params.get('page') === '0')
        .flush(pageOf([card(1, 'O Hobbit')], 0, 2));
    });
    http
      .expectOne((request) => request.params.get('page') === '1')
      .flush(pageOf([card(2, 'O Silmarillion')], 1, 2));
    await view.fixture.whenStable();

    expect(titles()).toEqual(['O Hobbit', 'O Silmarillion']);
  });

  it('adds a book to the end of the list', async () => {
    const { http, added, view } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar O Silmarillion à lista' }));
    http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/books/2' }).flush(null);
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(added).toHaveBeenCalledWith(expect.objectContaining({ id: 2 })));
  });

  it('shows what the server says when adding fails', async () => {
    const { http, added, view } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar O Silmarillion à lista' }));
    http
      .expectOne({ method: 'PUT', url: '/api/v1/lists/4/books/2' })
      .flush(
        { code: 'list.not-found', detail: 'A lista solicitada não existe.' },
        { status: 404, statusText: 'Not Found' },
      );
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('A lista solicitada não existe.'),
    );
    expect(added).not.toHaveBeenCalled();
  });

  it('closes with Concluir and with Escape', async () => {
    const { done } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    await userEvent.type(screen.getByLabelText('Buscar na estante'), '{Escape}');

    expect(done).toHaveBeenCalledTimes(2);
  });
});
