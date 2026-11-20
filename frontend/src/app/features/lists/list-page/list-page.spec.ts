import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { NOW } from '@core/time/today';
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
  wishlistCount: 1,
  status: 'IN_PROGRESS',
  color: 'PLUM',
  pinned: false,
  coverUrls: [],
  updatedAt: '2026-11-01T12:00:00Z',
};

const card = (id: number, title: string, extra: object = {}) => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status: 'WANT_TO_READ',
  genres: ['Fantasia'],
  ownership: 'OWNED',
  favorite: false,
  reread: false,
  ...extra,
});

const BOOKS = [
  card(1, 'A Sociedade do Anel', { status: 'READ', rating: 4.5 }),
  card(2, 'O Hobbit', { ownership: 'WISHLIST' }),
  card(3, 'Duna', { status: 'READING', genres: [] }),
];

const pageOf = (content: unknown[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});

async function open(url = '/lista/4') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'lista/:id', component: ListPage },
          { path: 'listas', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: NOW, useValue: () => new Date('2026-11-04T12:00:00Z') },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openWithBooks(url = '/lista/4', list: object = LIST, books: unknown[] = BOOKS) {
  const opened = await open(url);
  opened.http.expectOne('/api/v1/lists/4').flush(list);
  opened.http.expectOne((request) => request.params.get('listId') === '4').flush(pageOf(books));
  await opened.harness.fixture.whenStable();
  return opened;
}

/** The panel asks for the whole library once it is open. */
async function answerLibrary(opened: Awaited<ReturnType<typeof open>>, books: unknown[]) {
  await vi.waitFor(() => {
    TestBed.tick();
    opened.http
      .expectOne(
        (request) => request.url === '/api/v1/shelf/books' && !request.params.has('listId'),
      )
      .flush(pageOf(books));
  });
  await opened.harness.fixture.whenStable();
}

/** jsdom has no modal dialogs; the dialog itself is covered in the browser suite. */
function stubModalDialogs(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

const orderOfBooks = () =>
  Array.from(document.querySelectorAll('ol.books .title-link .title')).map((title) =>
    title.textContent.trim(),
  );

describe('ListPage', () => {
  describe('the card about the list', () => {
    it('shows the trail, the name, the progress and when it changed', async () => {
      await openWithBooks();

      const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
      expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(within(trail).getByRole('link', { name: 'Listas' })).toHaveAttribute(
        'href',
        '/listas',
      );
      expect(within(trail).getByText('Para as férias')).toHaveAttribute('aria-current', 'page');

      const about = screen.getByRole('region', { name: 'Para as férias' });
      expect(within(about).getByText('Lista', { selector: '.eyebrow' })).toBeInTheDocument();
      expect(within(about).getByText('Leituras leves')).toBeInTheDocument();
      expect(within(about).getByText('1 de 3 lidos')).toBeInTheDocument();
      expect(within(about).getByText('33%')).toBeInTheDocument();
      expect(within(about).getByText('atualizada há 3 dias · 1 na wishlist')).toBeInTheDocument();
    });

    it('says every book is on the shelf when none is in the wishlist', async () => {
      await openWithBooks('/lista/4', { ...LIST, wishlistCount: 0, pinned: true });

      expect(screen.getByText('atualizada há 3 dias · todos na estante')).toBeInTheDocument();
      expect(screen.getByText('Lista fixada', { selector: '.eyebrow' })).toBeInTheDocument();
    });

    it('pins the list and says where it now shows', async () => {
      const { http, harness } = await openWithBooks();
      const pin = screen.getByRole('button', { name: /Fixar na página Listas/ });
      expect(pin).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(pin);
      http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/pin' }).flush(null);
      await vi.waitFor(() => http.expectOne('/api/v1/lists/4').flush({ ...LIST, pinned: true }));
      await harness.fixture.whenStable();

      expect(screen.getByRole('status')).toHaveTextContent(
        'Lista fixada: ela agora aparece em destaque na página Listas.',
      );
      expect(screen.getByRole('button', { name: /Fixada na página Listas/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('unpins a pinned list', async () => {
      const { http, harness } = await openWithBooks('/lista/4', { ...LIST, pinned: true });

      await userEvent.click(screen.getByRole('button', { name: /Fixada na página Listas/ }));
      http.expectOne({ method: 'DELETE', url: '/api/v1/lists/4/pin' }).flush(null);
      await vi.waitFor(() => http.expectOne('/api/v1/lists/4').flush(LIST));
      await harness.fixture.whenStable();

      expect(screen.getByRole('status')).toHaveTextContent('Lista desafixada.');
    });

    it('turns into the form, saves and goes back to the card', async () => {
      const { http, harness } = await openWithBooks();

      await userEvent.click(screen.getByRole('button', { name: /Editar lista/ }));
      expect(screen.getByRole('form', { name: 'Editar lista' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Para as férias' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Para as férias' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Salvar lista' }));
      http.expectOne({ method: 'PUT', url: '/api/v1/lists/4' }).flush(LIST);
      await harness.fixture.whenStable();
      await vi.waitFor(() => http.expectOne('/api/v1/lists/4').flush(LIST));
      await harness.fixture.whenStable();

      expect(screen.getByRole('status')).toHaveTextContent('Lista atualizada.');
      expect(screen.queryByRole('form', { name: 'Editar lista' })).not.toBeInTheDocument();
      await vi.waitFor(() =>
        expect(screen.getByRole('button', { name: /Editar lista/ })).toHaveFocus(),
      );
    });

    it('deletes the list after confirming and says it is gone', async () => {
      stubModalDialogs();
      const { http, harness } = await openWithBooks();

      await userEvent.click(screen.getByRole('button', { name: 'Excluir lista' }));
      const dialog = screen.getByRole('dialog', { name: 'Excluir “Para as férias”?' });
      expect(dialog).toHaveTextContent('Os livros dela continuam na sua estante');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir lista' }));
      http.expectOne({ method: 'DELETE', url: '/api/v1/lists/4' }).flush(null);
      await harness.fixture.whenStable();

      await vi.waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Lista excluída' })).toBeInTheDocument(),
      );
      expect(screen.getByRole('link', { name: 'Voltar às listas' })).toHaveAttribute(
        'href',
        '/listas',
      );
    });
  });

  describe('the books', () => {
    it('numbers them in Roman, in the order of the list, with genre, status and rating', async () => {
      await openWithBooks();

      expect(
        screen.getByRole('heading', { level: 2, name: /Livros da lista\s*3/ }),
      ).toBeInTheDocument();
      expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'O Hobbit', 'Duna']);
      const row = (title: string) =>
        screen.getByRole('link', { name: new RegExp(title) }).closest('li')!;
      expect(row('A Sociedade do Anel')).toHaveTextContent('I');
      expect(within(row('A Sociedade do Anel')).getByText('Lido')).toBeInTheDocument();
      expect(within(row('A Sociedade do Anel')).getByText('4,5 ★')).toBeInTheDocument();
      expect(within(row('A Sociedade do Anel')).getByText('Fantasia')).toBeInTheDocument();
      expect(within(row('O Hobbit')).getByText('Wishlist')).toBeInTheDocument();
      expect(within(row('O Hobbit')).getByText('sem nota')).toBeInTheDocument();
      expect(within(row('Duna')).getByText('Lendo agora')).toBeInTheDocument();
      expect(row('Duna').querySelector('.position')).toHaveTextContent('III');
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

    it('removes a book and puts it back in its place with Desfazer', async () => {
      const { http, harness } = await openWithBooks();

      await userEvent.click(screen.getByRole('button', { name: 'Remover O Hobbit da lista' }));
      await harness.fixture.whenStable();

      expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'Duna']);
      expect(screen.getByRole('status')).toHaveTextContent('“O Hobbit” saiu da lista.');
      http.expectOne({ method: 'DELETE', url: '/api/v1/lists/4/books/2' }).flush(null);
      await vi.waitFor(() => http.expectOne('/api/v1/lists/4').flush({ ...LIST, bookCount: 2 }));

      await userEvent.click(screen.getByRole('button', { name: /Desfazer/ }));
      await harness.fixture.whenStable();

      expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'O Hobbit', 'Duna']);
      expect(screen.getByRole('status')).toHaveTextContent('Remoção desfeita.');
      expect(screen.queryByRole('button', { name: /Desfazer/ })).not.toBeInTheDocument();
      await vi.waitFor(() =>
        http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/books/2' }).flush(null),
      );
      await vi.waitFor(() => http.expectOne('/api/v1/lists/4').flush(LIST));
      await vi.waitFor(() => {
        const order = http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/order' });
        expect(order.request.body).toEqual({ bookIds: [1, 2, 3] });
        order.flush(null);
      });
    });

    it('invites to add books when the list is empty', async () => {
      await openWithBooks('/lista/4', { ...LIST, bookCount: 0, readCount: 0 }, []);

      expect(screen.getByText('Esta lista ainda está vazia')).toBeInTheDocument();
      expect(screen.getByText('0 de 0 lidos')).toBeInTheDocument();
      expect(screen.getByText('atualizada há 3 dias')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Adicionar livros/ })).toHaveLength(2);
    });
  });

  describe('adding books', () => {
    it('opens the panel in place of the card and closes it back on its button', async () => {
      const opened = await openWithBooks();

      await userEvent.click(screen.getByRole('button', { name: /Adicionar livros/ }));
      await answerLibrary(opened, [...BOOKS, card(9, 'O Silmarillion')]);

      expect(screen.queryByRole('region', { name: 'Para as férias' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('Buscar na estante')).toHaveFocus();
      expect(screen.getByText(/1 livro disponível/)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Concluir' }));
      await vi.waitFor(() =>
        expect(screen.getByRole('button', { name: /Adicionar livros/ })).toHaveFocus(),
      );
    });

    it('opens the panel right away from the address', async () => {
      const opened = await open('/lista/4?adicionar=true');
      opened.http.expectOne('/api/v1/lists/4').flush(LIST);
      opened.http.expectOne((request) => request.params.get('listId') === '4').flush(pageOf(BOOKS));
      await answerLibrary(opened, BOOKS);

      await vi.waitFor(() => expect(screen.getByLabelText('Buscar na estante')).toHaveFocus());
    });

    it('puts the new book at the end and takes it out again with Desfazer', async () => {
      const opened = await openWithBooks();
      const { http, harness } = opened;
      await userEvent.click(screen.getByRole('button', { name: /Adicionar livros/ }));
      await answerLibrary(opened, [...BOOKS, card(9, 'O Silmarillion')]);

      await userEvent.click(
        screen.getByRole('button', { name: 'Adicionar O Silmarillion à lista' }),
      );
      http.expectOne({ method: 'PUT', url: '/api/v1/lists/4/books/9' }).flush(null);
      await vi.waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('“O Silmarillion” entrou na lista.'),
      );
      expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'O Hobbit', 'Duna', 'O Silmarillion']);
      expect(
        screen.getByText('Todos os livros da biblioteca já estão nesta lista.'),
      ).toBeInTheDocument();
      http.expectOne('/api/v1/lists/4').flush({ ...LIST, bookCount: 4 });

      await userEvent.click(screen.getByRole('button', { name: /Desfazer/ }));
      await harness.fixture.whenStable();

      expect(orderOfBooks()).toEqual(['A Sociedade do Anel', 'O Hobbit', 'Duna']);
      expect(screen.getByRole('status')).toHaveTextContent('Adição desfeita.');
      await vi.waitFor(() =>
        http.expectOne({ method: 'DELETE', url: '/api/v1/lists/4/books/9' }).flush(null),
      );
    });
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
