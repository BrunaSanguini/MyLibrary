import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchPanel } from './search-panel';

const DUNE = {
  id: 7,
  title: 'Duna',
  authors: ['Frank Herbert'],
  genres: [],
  ownership: 'OWNED',
  favorite: false,
};
const FELLOWSHIP = {
  id: 42,
  title: 'A Sociedade do Anel',
  authors: ['J. R. R. Tolkien'],
  genres: [],
  ownership: 'OWNED',
  favorite: true,
};

function page(content: object[]) {
  return { content, page: 0, size: 6, totalElements: content.length, totalPages: 1 };
}

async function renderPanel() {
  const result = await render(SearchPanel, {
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  return { ...result, http: TestBed.inject(HttpTestingController) };
}

/** Types in the field and answers the request that the typing pause triggers. */
async function search(
  user: ReturnType<typeof userEvent.setup>,
  http: HttpTestingController,
  fixture: { whenStable(): Promise<unknown> },
  term: string,
  results: object[] = [FELLOWSHIP, DUNE],
) {
  await user.type(screen.getByRole('searchbox'), term);
  await vi.advanceTimersByTimeAsync(300);
  TestBed.tick();
  http.expectOne((request) => request.url === '/api/v1/shelf/books').flush(page(results));
  await fixture.whenStable();
}

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('starts closed and says so', async () => {
    await renderPanel();

    expect(screen.getByRole('button', { name: 'Pesquisar no acervo' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens from the keyboard and puts the focus in the field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderPanel();

    screen.getByRole('button', { name: 'Pesquisar no acervo' }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('asks nothing for a term shorter than two letters', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http } = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));

    await user.type(screen.getByRole('searchbox'), 'a');
    await vi.advanceTimersByTimeAsync(300);
    TestBed.tick();

    http.expectNone((request) => request.url === '/api/v1/shelf/books');
    expect(screen.getByText('Digite ao menos duas letras.')).toBeInTheDocument();
  });

  it('waits for a pause instead of asking on every keystroke', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));

    await user.type(screen.getByRole('searchbox'), 'duna');
    TestBed.tick();
    http.expectNone((request) => request.url === '/api/v1/shelf/books');

    await vi.advanceTimersByTimeAsync(300);
    TestBed.tick();
    http.expectOne((request) => request.url === '/api/v1/shelf/books').flush(page([DUNE]));
    await fixture.whenStable();

    expect(screen.getByRole('link', { name: /Duna/ })).toBeInTheDocument();
  });

  it('lists each result as a link to the book', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));

    await search(user, http, fixture, 'anel');

    expect(screen.getByRole('link', { name: /A Sociedade do Anel/ })).toHaveAttribute(
      'href',
      '/livros/42',
    );
    expect(screen.getByText('J. R. R. Tolkien')).toBeInTheDocument();
  });

  it('walks the results with the arrow keys and opens with Enter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));
    await search(user, http, fixture, 'anel');

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(navigate).toHaveBeenCalledWith(['/livros', 7], { queryParams: {} });
  });

  it('goes to the shelf with the term when nothing is highlighted', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));
    await search(user, http, fixture, 'anel');

    await user.keyboard('{Enter}');

    expect(navigate).toHaveBeenCalledWith(['/estante'], { queryParams: { q: 'anel' } });
  });

  it('closes with Escape and gives the focus back to the button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    const trigger = screen.getByRole('button', { name: 'Pesquisar no acervo' });
    await user.click(trigger);
    await search(user, http, fixture, 'anel');

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('says when the collection has nothing for the term', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));

    await search(user, http, fixture, 'xyz', []);

    expect(screen.getByText('Nenhum livro encontrado.')).toBeInTheDocument();
  });

  it('offers the full shelf for the same term', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPanel();
    await user.click(screen.getByRole('button', { name: 'Pesquisar no acervo' }));

    await search(user, http, fixture, 'anel');

    expect(screen.getByRole('link', { name: /Ver todos na Estante/ })).toHaveAttribute(
      'href',
      '/estante?q=anel',
    );
  });
});
