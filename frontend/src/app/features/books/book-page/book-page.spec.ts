import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BookPage from './book-page';

const FELLOWSHIP = {
  id: 42,
  title: 'A Sociedade do Anel',
  subtitle: 'O Senhor dos Anéis',
  authors: [{ id: 7, name: 'J. R. R. Tolkien' }],
  publisher: { id: 2, name: 'HarperCollins Brasil' },
  series: { id: 3, name: 'O Senhor dos Anéis', position: 1, totalVolumes: 3 },
  genres: [
    { id: 1, name: 'Fantasia' },
    { id: 4, name: 'Alta fantasia', parentId: 1 },
  ],
  isbn13: '9788595084742',
  pageCount: 576,
  publishedYear: 2019,
  languageCode: 'por',
  synopsis: 'Uma jornada até a Montanha da Perdição.',
  ownership: 'NONE',
  favorite: false,
};

/** Opens /livros/:id and answers the detail request with the given body or failure. */
async function openBook(
  url = '/livros/42',
  body: object = FELLOWSHIP,
  failure?: { status: number; statusText: string },
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'livros/:id', component: BookPage },
          { path: 'estante', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/books/42').flush(body, failure);
  await harness.fixture.whenStable();
  return { harness, http };
}

describe('BookPage', () => {
  it('shows the book with its catalog links', async () => {
    await openBook();

    expect(
      screen.getByRole('heading', { name: 'A Sociedade do Anel', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'J. R. R. Tolkien' })).toHaveAttribute(
      'href',
      '/autores/7',
    );
    expect(screen.getByRole('link', { name: 'HarperCollins Brasil' })).toHaveAttribute(
      'href',
      '/editoras/2',
    );
    expect(screen.getByRole('link', { name: 'Alta fantasia' })).toHaveAttribute(
      'href',
      '/generos/4',
    );
  });

  it('shows where the book sits in its series', async () => {
    await openBook();

    expect(screen.getByRole('link', { name: 'O Senhor dos Anéis' })).toHaveAttribute(
      'href',
      '/series/3',
    );
    expect(screen.getByText('Livro 1 de 3')).toBeInTheDocument();
  });

  it('lists only the details the book has, with the language spelled out', async () => {
    await openBook();

    expect(screen.getByText('Português')).toBeInTheDocument();
    expect(screen.getByText('576')).toBeInTheDocument();
    expect(screen.getByText('9788595084742')).toBeInTheDocument();
    expect(screen.queryByText('ISBN-10')).not.toBeInTheDocument();
  });

  it('offers the state tags as toggles that say whether they are pressed', async () => {
    await openBook();

    for (const name of ['Tenho este livro', 'Wishlist', 'Favorito']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('marks the book as owned at once and tells the server', async () => {
    const { http } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Tenho este livro' }));

    expect(screen.getByRole('button', { name: 'Tenho este livro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const request = http.expectOne('/api/v1/books/42/ownership');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ownership: 'OWNED' });
  });

  it('turns ownership off when the pressed tag is clicked again', async () => {
    const { http } = await openBook('/livros/42', { ...FELLOWSHIP, ownership: 'WISHLIST' });

    await userEvent.click(screen.getByRole('button', { name: 'Wishlist' }));

    expect(http.expectOne('/api/v1/books/42/ownership').request.body).toEqual({
      ownership: 'NONE',
    });
  });

  it('adds and removes the favorite with the matching verb', async () => {
    const { http } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Favorito' }));
    const add = http.expectOne('/api/v1/books/42/favorite');
    expect(add.request.method).toBe('PUT');
    add.flush(null);

    await userEvent.click(screen.getByRole('button', { name: 'Favorito' }));

    expect(http.expectOne('/api/v1/books/42/favorite').request.method).toBe('DELETE');
  });

  it('goes back to what is saved and says why when the server refuses', async () => {
    const { http, harness } = await openBook();

    await userEvent.click(screen.getByRole('button', { name: 'Favorito' }));
    http
      .expectOne('/api/v1/books/42/favorite')
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
        { status: 500, statusText: 'Server Error' },
      );
    TestBed.tick();
    http.expectOne('/api/v1/books/42').flush(FELLOWSHIP);
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
    expect(screen.getByRole('button', { name: 'Favorito' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('links to the edit form', async () => {
    await openBook();

    expect(screen.getByRole('link', { name: 'Editar informações' })).toHaveAttribute(
      'href',
      '/livros/42/editar',
    );
  });

  it('asks before deleting, and only deletes once confirmed', async () => {
    const { http, harness } = await openBook();
    // jsdom has no modal dialogs, and the dialog itself is covered in the browser suite.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };

    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));
    http.expectNone({ method: 'DELETE', url: '/api/v1/books/42' });

    const dialog = screen.getByRole('dialog', { name: 'Excluir este livro?' });
    await userEvent.click(
      Array.from(dialog.querySelectorAll('button')).find(
        (button) => button.textContent.trim() === 'Excluir livro',
      )!,
    );
    http.expectOne({ method: 'DELETE', url: '/api/v1/books/42' }).flush(null);
    await harness.fixture.whenStable();

    // The page navigates after the response, one async step later.
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/estante'));
  });

  it('says the book is not in the collection when the API answers 404', async () => {
    await openBook(
      '/livros/42',
      { code: 'book.not-found', detail: 'O livro solicitado não existe.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(screen.getByRole('heading', { name: 'Livro não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para a Estante' })).toHaveAttribute(
      'href',
      '/estante',
    );
  });

  it('offers to try again on any other failure', async () => {
    await openBook(
      '/livros/42',
      { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
