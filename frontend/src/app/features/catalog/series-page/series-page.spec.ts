import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SeriesPage from './series-page';

const SERIES = { id: 3, name: 'O Senhor dos Anéis', totalVolumes: 3, bookCount: 3, coverUrls: [] };

const card = (id: number, title: string, position: number, status: string, rating?: number) => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status,
  rating,
  genres: ['Fantasia', 'Alta fantasia'],
  ownership: 'OWNED',
  favorite: false,
  series: { id: 3, name: 'O Senhor dos Anéis', position },
});

const BOOKS = [
  card(1, 'A Sociedade do Anel', 1, 'READ', 5),
  card(2, 'As Duas Torres', 2, 'READ', 4.5),
  card(4, 'O Retorno do Rei', 3, 'READING'),
];

const TREE = [
  {
    id: 10,
    name: 'Fantasia',
    bookCount: 3,
    subgenres: [{ id: 11, name: 'Alta fantasia', bookCount: 3 }],
  },
];

async function open(books = BOOKS, series: object = SERIES) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'serie/:id', component: SeriesPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/serie/3');
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/series/3').flush(series);
  const listing = http.expectOne((request) => request.url === '/api/v1/shelf/books');
  expect(listing.request.params.get('seriesId')).toBe('3');
  expect(listing.request.params.get('sort')).toBe('seriesPosition');
  listing.flush({ content: books, page: 0, size: 100, totalElements: books.length, totalPages: 1 });
  await vi.waitFor(() => {
    TestBed.tick();
    http.expectOne('/api/v1/genres').flush(TREE);
  });
  await harness.fixture.whenStable();
  return { harness, http };
}

const volumeTitles = () =>
  within(screen.getByRole('region', { name: 'Livros da série' }))
    .getAllByRole('link')
    .map((link) => link.textContent.replace(/Livro \d+:/, '').trim());

describe('SeriesPage', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    });
  });

  it('counts the volumes still missing and folds a long description', async () => {
    const description = `${'Uma jornada pela Terra-média. '.repeat(15)}Fim.`;
    await open(BOOKS, { ...SERIES, totalVolumes: 5, description });

    expect(screen.getByRole('list', { name: 'Resumo da série' })).toHaveTextContent(
      'Faltam 2 volumes',
    );
    const more = screen.getByRole('button', { name: 'Mostrar tudo' });
    expect(screen.queryByText(/Fim\.$/)).not.toBeInTheDocument();
    await userEvent.click(more);
    expect(screen.getByText(/Fim\.$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('adds a book of the collection after the last volume', async () => {
    const { http } = await open();

    await userEvent.click(screen.getByRole('button', { name: '+ Adicionar livro à série' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar livro à série' });
    await vi.waitFor(() =>
      http
        .expectOne((request) => request.url === '/api/v1/shelf/books')
        .flush({
          content: [BOOKS[0], { ...card(9, 'O Hobbit', 1, 'READ'), series: undefined }],
          page: 0,
          size: 40,
          totalElements: 2,
          totalPages: 1,
        }),
    );
    const choices = await within(dialog).findByRole('radiogroup', { name: 'Livros do acervo' });
    expect(within(choices).getAllByRole('radio')).toHaveLength(1);
    expect(within(dialog).getByLabelText('Posição na série')).toHaveValue(4);
    expect(within(dialog).getByText('Será o livro IV.')).toBeInTheDocument();
    await userEvent.click(within(choices).getByRole('radio', { name: /O Hobbit/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar à série' }));

    http.expectOne({ method: 'GET', url: '/api/v1/books/9' }).flush({
      id: 9,
      title: 'O Hobbit',
      authors: [{ id: 7, name: 'J. R. R. Tolkien' }],
      publishers: [],
      genres: [],
      ownership: 'OWNED',
      favorite: false,
    });
    const put = await vi.waitFor(() => http.expectOne({ method: 'PUT', url: '/api/v1/books/9' }));
    expect(put.request.body).toMatchObject({ seriesId: 3, seriesPosition: 4 });
    put.flush({ id: 9, title: 'O Hobbit' });
    await vi.waitFor(() =>
      expect(screen.getByText('O Hobbit entrou na série.')).toBeInTheDocument(),
    );
  });

  it('edits the series and takes a volume out of it', async () => {
    const { http } = await open();

    await userEvent.click(screen.getByRole('button', { name: '✎ Editar série' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar série' });
    const name = within(dialog).getByLabelText('Nome da série');
    await userEvent.clear(name);
    await userEvent.type(name, 'O Senhor dos Anéis (edição única)');
    await userEvent.type(
      within(dialog).getByLabelText('Descrição · escrita por você'),
      'A guerra do Anel.',
    );
    const takeOut = within(dialog).getAllByRole('button', { name: 'Tirar da série' });
    await userEvent.click(takeOut[2]!);
    expect(within(dialog).getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar série' }));

    const update = http.expectOne({ method: 'PUT', url: '/api/v1/series/3' });
    expect(update.request.body).toEqual({
      name: 'O Senhor dos Anéis (edição única)',
      totalVolumes: 3,
      description: 'A guerra do Anel.',
    });
    update.flush({ ...SERIES, name: 'O Senhor dos Anéis (edição única)' });
    await vi.waitFor(() =>
      http.expectOne({ method: 'GET', url: '/api/v1/books/4' }).flush({
        id: 4,
        title: 'O Retorno do Rei',
        authors: [{ id: 7, name: 'J. R. R. Tolkien' }],
        publishers: [],
        genres: [{ id: 10, name: 'Fantasia' }],
        series: { id: 3, name: 'O Senhor dos Anéis', position: 3 },
        ownership: 'OWNED',
        favorite: false,
      }),
    );
    const book = await vi.waitFor(() => http.expectOne({ method: 'PUT', url: '/api/v1/books/4' }));
    expect(book.request.body).toMatchObject({
      title: 'O Retorno do Rei',
      authorIds: [7],
      genreIds: [10],
      seriesId: undefined,
      seriesPosition: undefined,
    });
    book.flush({});
    await vi.waitFor(() => expect(screen.getByText('Série salva.')).toBeInTheDocument());
  });

  it('names the series, its authors and how many volumes were read', async () => {
    await open();

    expect(
      screen.getByRole('heading', { level: 1, name: 'O Senhor dos Anéis' }),
    ).toBeInTheDocument();
    expect(screen.getByText('J. R. R. Tolkien', { selector: '.authors' })).toBeInTheDocument();
    const summary = screen.getByRole('list', { name: 'Resumo da série' });
    expect(summary).toHaveTextContent('3 livros');
    expect(summary).toHaveTextContent('2 lidos');
    expect(within(summary).queryByText('Série completa')).not.toBeInTheDocument();
  });

  it('calls the series complete once every volume was read', async () => {
    await open(BOOKS.map((book) => ({ ...book, status: 'READ' })));

    expect(screen.getByText('Série completa')).toBeInTheDocument();
  });

  it('shows the genres, the progress and the average rating in Sobre a série', async () => {
    await open();

    expect(screen.getByRole('link', { name: 'Fantasia' })).toHaveAttribute('href', '/generos/10');
    expect(screen.getByRole('link', { name: 'Alta fantasia' })).toHaveAttribute(
      'href',
      '/generos/11',
    );
    expect(screen.getByText('2 de 3')).toBeInTheDocument();
    expect(screen.getByText('4,8')).toBeInTheDocument();
  });

  it('lists the volumes in reading order and turns the order around', async () => {
    await open();

    expect(volumeTitles()).toEqual(['A Sociedade do Anel', 'As Duas Torres', 'O Retorno do Rei']);
    await userEvent.click(screen.getByRole('button', { name: /Ordem da série/ }));
    expect(volumeTitles()).toEqual(['O Retorno do Rei', 'As Duas Torres', 'A Sociedade do Anel']);
  });

  it('marks a volume as favorite from the list', async () => {
    const { http } = await open();
    const toggle = screen.getByRole('button', { name: 'Favoritar As Duas Torres' });

    await userEvent.click(toggle);

    http.expectOne({ method: 'PUT', url: '/api/v1/books/2/favorite' }).flush(null);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the reviews of the volumes in Minhas resenhas', async () => {
    const { http, harness } = await open();

    await userEvent.click(screen.getByRole('tab', { name: 'Minhas resenhas' }));
    await vi.waitFor(() => {
      TestBed.tick();
      http
        .expectOne('/api/v1/books/1/review')
        .flush({ bookId: 1, rating: 5, content: 'Uma jornada que não envelhece.' });
    });
    http
      .expectOne('/api/v1/books/2/review')
      .flush({ code: 'review.not-found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/v1/books/4/review')
      .flush({ code: 'review.not-found' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: '1. A Sociedade do Anel' })).toBeInTheDocument();
    expect(screen.getByText('Uma jornada que não envelhece.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2. As Duas Torres' })).not.toBeInTheDocument();
  });

  it('says so when the series does not exist', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'serie/:id', component: SeriesPage }], withComponentInputBinding()),
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/serie/99');
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http
      .expectOne('/api/v1/series/99')
      .flush({ code: 'series.not-found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush({
        content: [],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
      });

    await vi.waitFor(() => {
      TestBed.tick();
      expect(screen.getByRole('heading', { name: 'Série não encontrada' })).toBeInTheDocument();
    });
    harness.fixture.destroy();
  });
});
