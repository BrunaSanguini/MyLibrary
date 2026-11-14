import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import GroupPage from './group-page';

const QUINCAS = {
  id: 2,
  title: 'Quincas Borba',
  authors: ['Machado de Assis'],
  genres: ['Realismo'],
  ownership: 'OWNED',
  favorite: false,
  series: { id: 1, name: 'Trilogia Realista', position: 2 },
};

const TREE = [
  {
    id: 1,
    name: 'Romance',
    bookCount: 5,
    subgenres: [{ id: 2, name: 'Realismo', bookCount: 3 }],
  },
];

function page(content: object[], totalPages = 1) {
  return { content, page: 0, size: 24, totalElements: content.length, totalPages };
}

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'autores/:id', component: GroupPage, data: { kind: 'authors' } },
          { path: 'series/:id', component: GroupPage, data: { kind: 'series' } },
          { path: 'generos/:id', component: GroupPage, data: { kind: 'genres' } },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

const isShelf = (request: { url: string }) => request.url === '/api/v1/shelf/books';

describe('GroupPage', () => {
  it('shows the author with the books of the collection', async () => {
    const { harness, http } = await open('/autores/7');
    http.expectOne('/api/v1/authors/7').flush({ id: 7, name: 'Machado de Assis' });
    const shelf = http.expectOne(isShelf);
    shelf.flush(page([QUINCAS]));
    await harness.fixture.whenStable();

    expect(shelf.request.params.get('authorId')).toBe('7');
    expect(screen.getByRole('heading', { name: 'Machado de Assis', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Autor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quincas Borba/ })).toHaveAttribute(
      'href',
      '/livros/2',
    );
  });

  it('lists a series in reading order', async () => {
    const { http } = await open('/series/1');

    const shelf = http.expectOne(isShelf);

    expect(shelf.request.params.get('seriesId')).toBe('1');
    expect(shelf.request.params.get('sort')).toBe('seriesPosition');
  });

  it('leaves the other groupings in the default order of the shelf', async () => {
    const { http } = await open('/autores/7');

    expect(http.expectOne(isShelf).request.params.has('sort')).toBe(false);
  });

  it('finds the name of a subgenre in the tree, since genres have no page of their own', async () => {
    const { harness, http } = await open('/generos/2');
    http.expectOne('/api/v1/genres').flush(TREE);
    http.expectOne(isShelf).flush(page([QUINCAS]));
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Realismo', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Gênero')).toBeInTheDocument();
  });

  it('says so when the genre is not in the tree', async () => {
    const { harness, http } = await open('/generos/99');
    http.expectOne('/api/v1/genres').flush(TREE);
    http.expectOne(isShelf).flush(page([]));
    await harness.fixture.whenStable();

    expect(
      screen.getByRole('heading', { name: 'Gênero não encontrado no acervo' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver gêneros' })).toHaveAttribute(
      'href',
      '/catalogos?tipo=generos',
    );
  });

  it('says so when the author does not exist', async () => {
    const { harness, http } = await open('/autores/404');
    http
      .expectOne('/api/v1/authors/404')
      .flush(
        { code: 'author.not-found', detail: 'O autor solicitado não existe.' },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne(isShelf).flush(page([]));
    await harness.fixture.whenStable();

    expect(
      screen.getByRole('heading', { name: 'Autor não encontrado no acervo' }),
    ).toBeInTheDocument();
  });

  it('asks nothing for an id that is not a number', async () => {
    const { harness, http } = await open('/autores/abc');
    await harness.fixture.whenStable();

    http.expectNone(isShelf);
    expect(
      screen.getByRole('heading', { name: 'Autor não encontrado no acervo' }),
    ).toBeInTheDocument();
  });

  it('says when the group has no book yet', async () => {
    const { harness, http } = await open('/autores/7');
    http.expectOne('/api/v1/authors/7').flush({ id: 7, name: 'Machado de Assis' });
    http.expectOne(isShelf).flush(page([]));
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Nenhum livro aqui ainda' })).toBeInTheDocument();
  });

  it('paginates a long group', async () => {
    const { harness, http } = await open('/autores/7');
    http.expectOne('/api/v1/authors/7').flush({ id: 7, name: 'Machado de Assis' });
    http.expectOne(isShelf).flush(page([QUINCAS], 3));
    await harness.fixture.whenStable();

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeInTheDocument();
  });

  it('offers to try again when the listing fails', async () => {
    const { harness, http } = await open('/autores/7');
    http.expectOne('/api/v1/authors/7').flush({ id: 7, name: 'Machado de Assis' });
    http
      .expectOne(isShelf)
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
        { status: 500, statusText: 'Server Error' },
      );
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
  });
});
