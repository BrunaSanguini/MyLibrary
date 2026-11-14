import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BookFormPage from './book-form-page';

const DUNE = {
  id: 42,
  title: 'Duna',
  authors: [{ id: 5, name: 'Frank Herbert' }],
  genres: [{ id: 1, name: 'Ficção científica' }],
  isbn13: '9788576573135',
  ownership: 'OWNED',
  favorite: false,
};

function configure() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'livros/novo', component: BookFormPage },
          { path: 'livros/:id/editar', component: BookFormPage },
          { path: 'livros/:id', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

async function openNew() {
  configure();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/livros/novo');
  await harness.fixture.whenStable();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openEdit() {
  configure();
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/livros/42/editar');
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/books/42').flush(DUNE);
  await harness.fixture.whenStable();
  return { harness, http };
}

const save = () => userEvent.click(screen.getByRole('button', { name: /Salvar|Cadastrar/ }));

describe('BookFormPage', () => {
  it('asks for the title and for an author before sending anything', async () => {
    const { http } = await openNew();

    await save();

    expect(screen.getByText('Informe o título.')).toBeInTheDocument();
    expect(screen.getByText('Informe ao menos um autor.')).toBeInTheDocument();
    http.expectNone({ method: 'POST', url: '/api/v1/books' });
  });

  it('points the field to its error message', async () => {
    await openNew();

    await save();

    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-describedby', 'erro-titulo');
  });

  it('refuses an ISBN-13 with the wrong check digit, like the back-end does', async () => {
    await openNew();

    await userEvent.type(screen.getByLabelText('ISBN-13'), '9788595084743');
    await userEvent.tab();

    expect(screen.getByText('ISBN-13 inválido: confira os 13 dígitos.')).toBeInTheDocument();
  });

  it('accepts an ISBN typed with hyphens, as printed on the book', async () => {
    await openNew();

    await userEvent.type(screen.getByLabelText('ISBN-13'), '978-85-9508-474-2');
    await userEvent.tab();

    expect(screen.queryByText(/ISBN-13 inválido/)).not.toBeInTheDocument();
  });

  it('refuses a position without a series', async () => {
    await openEdit();

    await userEvent.type(screen.getByLabelText('Posição na série'), '2');
    await userEvent.tab();

    expect(screen.getByText('Escolha a série antes de informar a posição.')).toBeInTheDocument();
  });

  it('fills the form with the book being edited', async () => {
    await openEdit();

    expect(screen.getByLabelText('Título')).toHaveValue('Duna');
    expect(screen.getByLabelText('ISBN-13')).toHaveValue('9788576573135');
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
  });

  it('saves the edited book and goes back to its page', async () => {
    const { http, harness } = await openEdit();
    const title = screen.getByLabelText('Título');

    await userEvent.clear(title);
    await userEvent.type(title, 'Duna (edição revista)');
    await save();

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/books/42' });
    expect(request.request.body).toMatchObject({
      title: 'Duna (edição revista)',
      authorIds: [5],
      genreIds: [1],
      isbn13: '9788576573135',
      ownership: 'OWNED',
    });
    request.flush({ ...DUNE, title: 'Duna (edição revista)' });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/livros/42'));
  });

  it('sends an emptied optional field as absent, not as empty text', async () => {
    const { http } = await openEdit();

    await userEvent.clear(screen.getByLabelText('ISBN-13'));
    await save();

    // What matters is the wire: undefined is dropped when the body is serialized.
    const body = http.expectOne({ method: 'PUT', url: '/api/v1/books/42' }).request.body;
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty('isbn13');
  });

  it('puts a field error of the server on its field', async () => {
    const { http, harness } = await openEdit();

    await save();
    http.expectOne({ method: 'PUT', url: '/api/v1/books/42' }).flush(
      {
        code: 'validation',
        detail: 'Há campos inválidos.',
        errors: [{ field: 'isbn13', message: 'ISBN-13 inválido: confira os 13 dígitos.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByLabelText('ISBN-13')).toHaveAttribute('aria-describedby', 'erro-isbn13'),
    );
    expect(screen.getByText('ISBN-13 inválido: confira os 13 dígitos.')).toBeInTheDocument();
  });

  it('shows a conflict at the top, with the detail the API wrote', async () => {
    const { http, harness } = await openEdit();

    await save();
    http
      .expectOne({ method: 'PUT', url: '/api/v1/books/42' })
      .flush(
        { code: 'book.isbn-duplicated', detail: 'Já existe um livro com este ISBN-13 no acervo.' },
        { status: 409, statusText: 'Conflict' },
      );
    await harness.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Já existe um livro com este ISBN-13 no acervo.',
      ),
    );
    expect(TestBed.inject(Router).url).toBe('/livros/42/editar');
  });

  it('knows about unsaved changes only after something changes', async () => {
    const { harness } = await openEdit();
    const page = harness.routeDebugElement!.componentInstance as HasUnsavedChanges;

    expect(page.hasUnsavedChanges()).toBe(false);

    await userEvent.type(screen.getByLabelText('Subtítulo'), 'Crônicas de Duna');

    expect(page.hasUnsavedChanges()).toBe(true);
  });

  it('counts removing an author as an unsaved change', async () => {
    const { harness } = await openEdit();
    const page = harness.routeDebugElement!.componentInstance as HasUnsavedChanges;

    await userEvent.click(screen.getByRole('button', { name: 'Remover autor Frank Herbert' }));

    expect(page.hasUnsavedChanges()).toBe(true);
    expect(screen.getByText('Informe ao menos um autor.')).toBeInTheDocument();
  });

  it('refuses an image that is not JPEG, PNG or WebP before uploading', async () => {
    await openEdit();

    await userEvent.upload(
      screen.getByLabelText('Capa'),
      new File(['gif'], 'capa.gif', { type: 'image/gif' }),
      { applyAccept: false },
    );

    expect(screen.getByText('Use uma imagem JPEG, PNG ou WebP.')).toBeInTheDocument();
  });

  it('sends the cover after saving the book', async () => {
    const { http, harness } = await openEdit();

    await userEvent.upload(
      screen.getByLabelText('Capa'),
      new File(['png'], 'capa.png', { type: 'image/png' }),
    );
    await save();
    http.expectOne({ method: 'PUT', url: '/api/v1/books/42' }).flush(DUNE);
    await harness.fixture.whenStable();

    const upload = await vi.waitFor(() =>
      http.expectOne({ method: 'PUT', url: '/api/v1/books/42/cover' }),
    );
    expect(upload.request.body).toBeInstanceOf(FormData);
  });
});
