import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Registry } from './registry';
import { RegistryKind } from './registry-kinds';

const TREE = [
  {
    id: 1,
    name: 'Fantasia',
    bookCount: 13,
    subgenres: [{ id: 11, name: 'Alta fantasia', bookCount: 4 }],
  },
  {
    id: 2,
    name: 'Terror',
    bookCount: 0,
    subgenres: [{ id: 21, name: 'Horror cósmico', bookCount: 0 }],
  },
];

const page = (content: unknown[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 100,
  totalElements,
  totalPages: 1,
});

/** jsdom has no modal dialogs; the dialog itself is covered in the browser suite. */
function stubModalDialogs(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

async function setup(kind: RegistryKind, data: unknown = undefined) {
  stubModalDialogs();
  const kindChange = vi.fn();
  const view = await render(Registry, {
    inputs: { kind },
    on: { kindChange },
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  await answer(http, data);
  await view.fixture.whenStable();
  return { view, http, kindChange };
}

/** The tree, the counts of the menu and the items of the open catalog. */
async function answer(http: HttpTestingController, data: unknown) {
  TestBed.tick();
  for (const request of http.match(() => true)) {
    const { url, params } = request.request;
    if (url === '/api/v1/genres') {
      request.flush(TREE);
    } else if (params.get('size') === '1') {
      request.flush(page([], url.includes('lists') ? 6 : 23));
    } else {
      request.flush(data ?? page([]));
    }
  }
}

describe('Registry', () => {
  it('counts every catalog on the menu and marks the open one', async () => {
    await setup('generos');

    const menu = screen.getByRole('navigation', { name: 'Tipos de cadastro' });
    expect(within(menu).getByRole('button', { name: /Gêneros\s*2/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(menu).getByRole('button', { name: /Subgêneros\s*2/ })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Listas\s*6/ })).toBeInTheDocument();
  });

  it('asks to change the catalog', async () => {
    const { kindChange } = await setup('generos');

    await userEvent.click(screen.getByRole('button', { name: /Autores/ }));

    expect(kindChange).toHaveBeenCalledWith('autores');
  });

  it('lists the genres with their use, and filters them without accents', async () => {
    await setup('generos');

    expect(screen.getByRole('heading', { name: 'Gêneros' })).toBeInTheDocument();
    expect(screen.getByText('2 gêneros')).toBeInTheDocument();
    const fantasy = screen.getByText('Fantasia').closest('li')!;
    expect(fantasy).toHaveTextContent('13 livros · 1 subgênero');
    expect(within(fantasy).getByText('Em uso')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Filtrar gêneros'), 'TERRÓR');
    expect(screen.getByText('1 encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Fantasia')).not.toBeInTheDocument();
  });

  it('refuses an empty name and a name that already exists, ignoring case and accents', async () => {
    const { http } = await setup('generos');

    await userEvent.click(screen.getByRole('button', { name: 'Criar gênero' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escreva um nome antes de criar.');

    await userEvent.type(screen.getByLabelText('Nome do gênero'), 'fantasía');
    await userEvent.click(screen.getByRole('button', { name: 'Criar gênero' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Já existe um gênero chamado “fantasía”.');
    http.expectNone({ method: 'POST', url: '/api/v1/genres' });
  });

  it('creates a genre and says so', async () => {
    const { http, view } = await setup('generos');

    await userEvent.type(screen.getByLabelText('Nome do gênero'), 'Mistério');
    await userEvent.click(screen.getByRole('button', { name: 'Criar gênero' }));
    const request = http.expectOne({ method: 'POST', url: '/api/v1/genres' });
    expect(request.request.body).toEqual({ name: 'Mistério', parentId: null });
    request.flush({ id: 3, name: 'Mistério' });
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Gênero “Mistério” criado. Ele já aparece na lista do cadastro de livros.',
      ),
    );
    expect(screen.getByLabelText('Nome do gênero')).toHaveValue('');
  });

  it('creates a subgenre inside the genre chosen', async () => {
    const { http } = await setup('subgeneros');

    await userEvent.type(screen.getByLabelText('Nome do subgênero'), 'Fantasia sombria');
    await userEvent.click(screen.getByRole('button', { name: 'Criar subgênero' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o gênero');

    await userEvent.selectOptions(screen.getByLabelText('Pertence ao gênero'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar subgênero' }));
    expect(http.expectOne({ method: 'POST', url: '/api/v1/genres' }).request.body).toEqual({
      name: 'Fantasia sombria',
      parentId: 1,
    });
  });

  it('shows the genre of each subgenre', async () => {
    await setup('subgeneros');

    expect(screen.getByText('Alta fantasia').closest('li')).toHaveTextContent(
      'Pertence a Fantasia · 4 livros',
    );
  });

  it('keeps an item that books use, and says why', async () => {
    const { http } = await setup('generos');

    const button = screen.getByRole('button', { name: 'Excluir Fantasia' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);

    expect(screen.getByRole('status')).toHaveTextContent(
      '“Fantasia” não pode ser excluído: 17 livros usam este gênero.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    http.expectNone((request) => request.method === 'DELETE');
  });

  it('deletes a genre after its subgenres, once confirmed', async () => {
    const { http, view } = await setup('generos');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Terror' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir o gênero “Terror”?' });
    expect(dialog).toHaveTextContent('O 1 subgênero dele também será excluído.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir gênero' }));

    http.expectOne({ method: 'DELETE', url: '/api/v1/genres/21' }).flush(null);
    await vi.waitFor(() =>
      http.expectOne({ method: 'DELETE', url: '/api/v1/genres/2' }).flush(null),
    );
    await view.fixture.whenStable();
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Gênero “Terror” excluído.'),
    );
  });

  it('lists the authors with their books and deletes one without books', async () => {
    const { http, view } = await setup(
      'autores',
      page([
        { id: 5, name: 'Ursula K. Le Guin', bookCount: 0, coverUrls: [] },
        { id: 6, name: 'J. R. R. Tolkien', bookCount: 1, coverUrls: [] },
      ]),
    );

    expect(screen.getByText('J. R. R. Tolkien').closest('li')).toHaveTextContent('1 livro');
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Ursula K. Le Guin' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir autor' }),
    );
    http.expectOne({ method: 'DELETE', url: '/api/v1/authors/5' }).flush(null);
    await view.fixture.whenStable();
  });

  it('points to the page of a book and creates none', async () => {
    await setup(
      'livros',
      page([
        {
          id: 7,
          title: 'O Hobbit',
          authors: ['J. R. R. Tolkien'],
          status: 'READ',
          genres: [],
          ownership: 'OWNED',
          favorite: false,
          reread: false,
        },
      ]),
    );

    expect(screen.getByRole('link', { name: 'O Hobbit' })).toHaveAttribute('href', '/livro/7');
    expect(screen.getByRole('link', { name: /Adicionar livro/ })).toHaveAttribute(
      'href',
      '/estante/novo',
    );
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('creates a list with its description', async () => {
    const { http } = await setup('listas');

    await userEvent.type(screen.getByLabelText('Nome da lista'), 'Para o inverno');
    await userEvent.type(screen.getByLabelText('Descrição · opcional'), 'Livros longos');
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));

    expect(http.expectOne({ method: 'POST', url: '/api/v1/lists' }).request.body).toEqual({
      name: 'Para o inverno',
      description: 'Livros longos',
    });
  });
});
