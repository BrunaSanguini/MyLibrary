import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { ProfileStore } from '@core/profile/profile-store';
import { CURRENT_HOUR, TODAY } from '@core/time/today';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './profile-page';

const OVERVIEW = {
  year: 2026,
  month: 11,
  finishedInMonth: 1,
  finishedInYear: 3,
  averageRating: 4.6,
  rereadsInYear: 1,
  pagesInYear: 1240,
  currentStreak: 6,
  longestStreak: 21,
  finishedLast30Days: 1,
  inProgress: 2,
  fastestInYear: { bookId: 2, title: 'O Hobbit', days: 6 },
  readingDays: 102,
  notes: 51,
  readerSince: 2019,
};

const page = (content: unknown[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});

async function setup(profile: object = { displayName: 'Bru', theme: 'LIGHT' }) {
  const view = await render(ProfilePage, {
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: TODAY, useValue: () => '2026-11-17' },
      { provide: CURRENT_HOUR, useValue: () => 21 },
    ],
  });
  void TestBed.inject(ProfileStore).load();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/api/v1/profile').flush(profile);
  return { view, http };
}

function flushStats(http: HttpTestingController, overview: object = OVERVIEW, reviews = true) {
  TestBed.tick();
  const flush = (url: string, body: object) =>
    http.match((request) => request.url === url).forEach((request) => request.flush(body));
  flush('/api/v1/stats/overview', overview);
  flush('/api/v1/stats/daily-pages', [{ date: '2026-11-16', pages: 25 }]);
  flush('/api/v1/stats/books-time', [
    { bookId: 1, title: 'A Sociedade do Anel', days: 18, pages: 400 },
  ]);
  flush(
    '/api/v1/reviews',
    page(
      reviews
        ? [
            {
              bookId: 1,
              title: 'A Sociedade do Anel',
              rating: 5,
              updatedAt: '2026-11-01T10:00:00Z',
            },
          ]
        : [],
    ),
  );
  flush('/api/v1/shelf/summary', {
    shelf: 8,
    reading: 2,
    read: 4,
    wantToRead: 2,
    abandoned: 0,
    wishlist: 1,
    favorites: 1,
  });
  flush('/api/v1/genres', [{ id: 1, name: 'Fantasia', bookCount: 2, subgenres: [] }]);
  flush(
    '/api/v1/shelf/books',
    page([
      {
        id: 1,
        title: 'A Sociedade do Anel',
        authors: ['J. R. R. Tolkien'],
        status: 'READ',
        genres: ['Fantasia'],
        ownership: 'OWNED',
        favorite: false,
        reread: false,
      },
    ]),
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('greets the reader, says since when she reads and shows the four numbers', async () => {
    const { view, http } = await setup();
    flushStats(http);
    await view.fixture.whenStable();

    expect(screen.getByText('Boa noite,')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Bru' })).toBeInTheDocument();
    expect(screen.getByText('✦ Leitora desde MMXIX')).toBeInTheDocument();
    const numbers = screen.getByLabelText('Livros terminados e nota média');
    const value = (label: string) =>
      within(numbers).getByText(label).nextElementSibling?.textContent?.trim();
    expect(value('Terminado neste mês')).toBe('I');
    expect(value('Terminados neste ano')).toBe('III');
    expect(value('Terminados no total')).toBe('IV');
    expect(value('Nota média')).toBe('4,6');
  });

  it('shows the month going on and leads to the calendar', async () => {
    const { view, http } = await setup();
    flushStats(http);
    await view.fixture.whenStable();

    expect(
      screen.getByRole('heading', { name: '✦ Novembro de MMXXVI · em andamento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 livro terminado até agora.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver calendário/ })).toHaveAttribute(
      'href',
      '/calendario',
    );
  });

  it('lists the latest reviews with their authors and the reading numbers', async () => {
    const { view, http } = await setup();
    flushStats(http);
    await view.fixture.whenStable();

    const reviews = screen.getByRole('region', { name: '✦ Últimas resenhas' });
    const review = within(reviews).getByRole('link', { name: /A Sociedade do Anel/ });
    expect(review).toHaveAttribute('href', '/livro/1');
    expect(within(review).getByText('J. R. R. Tolkien')).toBeInTheDocument();
    expect(within(reviews).getByRole('link', { name: /Estante/ })).toHaveAttribute(
      'href',
      '/estante',
    );

    const reading = screen.getByRole('region', { name: 'Sua leitura' });
    const stat = (label: string) =>
      within(reading).getByText(label).nextElementSibling?.textContent?.trim();
    expect(stat('Dias com livro aberto')).toBe('102');
    expect(stat('Dias seguidos')).toBe('6');
    expect(stat('Livros terminados')).toBe('4');
    expect(stat('Notas registradas')).toBe('51');
    expect(stat('Gênero mais lido')).toBe('Fantasia');
    expect(stat('Páginas viradas')).toBe('1.240 em 2026');
  });

  it('keeps a place for the reviews before the first one', async () => {
    const { view, http } = await setup({ theme: 'SYSTEM' });
    flushStats(http, { ...OVERVIEW, readerSince: undefined, finishedInMonth: 0 }, false);
    await view.fixture.whenStable();

    expect(screen.getByText('Boa noite!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Seu perfil' })).toBeInTheDocument();
    expect(screen.getByText('✦ Leitora desde MMXXVI')).toBeInTheDocument();
    expect(screen.getByText('Nenhum livro terminado ainda.')).toBeInTheDocument();
    expect(screen.getByText('Suas resenhas aparecerão aqui.')).toBeInTheDocument();
  });

  it('edits the name and the year in the modal, keeping the theme', async () => {
    const { view, http } = await setup();
    flushStats(http);
    await view.fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Editar perfil e foto' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar perfil e foto' });
    const name = within(dialog).getByLabelText('Como quer ser chamada(o)');
    expect(name).toHaveValue('Bru');
    await userEvent.clear(name);
    expect(within(dialog).getByText('O nome não pode ficar vazio.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar perfil' })).toBeDisabled();
    await userEvent.type(name, 'Bruna');
    const since = within(dialog).getByLabelText('Leitora desde');
    await userEvent.type(since, '2030');
    expect(within(dialog).getByText('Use um ano de 1900 até 2026.')).toBeInTheDocument();
    await userEvent.clear(since);
    await userEvent.type(since, '2019');
    expect(within(dialog).getByText('Aparece como MMXIX')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar perfil' }));

    const save = http.expectOne({ method: 'PUT', url: '/api/v1/profile' });
    expect(save.request.body).toEqual({ displayName: 'Bruna', theme: 'LIGHT', readerSince: 2019 });
    save.flush({ displayName: 'Bruna', theme: 'LIGHT', readerSince: 2019 });
    await vi.waitFor(() =>
      expect(within(dialog).getByRole('status')).toHaveTextContent('Perfil salvo ✓'),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Bruna' })).toBeInTheDocument();
    delete document.documentElement.dataset['theme'];
    localStorage.clear();
  });

  it('sends a new photo from the modal and shows the error of an invalid one', async () => {
    const { view, http } = await setup();
    flushStats(http);
    await view.fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Trocar foto do perfil' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar perfil e foto' });
    expect(within(dialog).getByRole('button', { name: 'Remover foto' })).toBeDisabled();
    const input = view.container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'eu.txt', { type: 'text/plain' })] },
    });
    http
      .expectOne({ method: 'PUT', url: '/api/v1/profile/avatar' })
      .flush(
        { code: 'image.invalid-type', detail: 'Envie uma imagem JPEG, PNG ou WebP.' },
        { status: 415, statusText: 'Unsupported Media Type' },
      );

    await vi.waitFor(() =>
      expect(within(dialog).getByRole('alert')).toHaveTextContent(
        'Envie uma imagem JPEG, PNG ou WebP.',
      ),
    );
  });
});
