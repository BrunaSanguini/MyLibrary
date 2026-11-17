import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { ProfileStore } from '@core/profile/profile-store';
import { CURRENT_HOUR, TODAY } from '@core/time/today';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProfilePage from './profile-page';

const OVERVIEW = {
  year: 2026,
  month: 11,
  finishedInMonth: 1,
  finishedInYear: 9,
  averageRating: 4.5,
  rereadsInYear: 1,
  pagesInYear: 3240,
  currentStreak: 6,
  longestStreak: 21,
  finishedLast30Days: 1,
  inProgress: 2,
  fastestInYear: { bookId: 2, title: 'O Hobbit', days: 6 },
};

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

function flushStats(http: HttpTestingController) {
  http.expectOne((request) => request.url === '/api/v1/stats/overview').flush(OVERVIEW);
  http
    .expectOne((request) => request.url === '/api/v1/stats/daily-pages')
    .flush([{ date: '2026-11-16', pages: 25 }]);
  http
    .expectOne((request) => request.url === '/api/v1/stats/books-time')
    .flush([{ bookId: 1, title: 'A Sociedade do Anel', days: 18, pages: 400 }]);
  http
    .expectOne((request) => request.url === '/api/v1/reviews')
    .flush({
      content: [
        { bookId: 1, title: 'A Sociedade do Anel', rating: 5, updatedAt: '2026-11-01T10:00:00Z' },
      ],
      page: 0,
      size: 4,
      totalElements: 1,
      totalPages: 1,
    });
}

describe('ProfilePage', () => {
  it('greets the reader by the hour and shows the numbers of the month and the year', async () => {
    const { view, http } = await setup();
    TestBed.tick();
    const overview = http.expectOne((request) => request.url === '/api/v1/stats/overview');
    expect(overview.request.params.get('year')).toBe('2026');
    expect(overview.request.params.get('month')).toBe('11');
    overview.flush(OVERVIEW);
    http
      .expectOne((request) => request.url === '/api/v1/stats/daily-pages')
      .flush([{ date: '2026-11-16', pages: 25 }]);
    http.expectOne((request) => request.url === '/api/v1/stats/books-time').flush([]);
    http
      .expectOne((request) => request.url === '/api/v1/reviews')
      .flush({ content: [], page: 0, size: 4, totalElements: 0, totalPages: 0 });
    await view.fixture.whenStable();

    expect(screen.getByText('Boa noite,')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Bru' })).toBeInTheDocument();
    expect(await screen.findByText('Nota média')).toBeInTheDocument();
    expect(screen.getByText('4,5')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Novembro de 2026 · em andamento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 livro terminado até agora.')).toBeInTheDocument();
    expect(
      screen.getByText('Suas resenhas aparecem aqui depois que você avaliar um livro.'),
    ).toBeInTheDocument();
  });

  it('shows the reading of the last months', async () => {
    const { view, http } = await setup();
    TestBed.tick();
    flushStats(http);
    await view.fixture.whenStable();

    const reading = await screen.findByRole('region', { name: 'Sua leitura' });
    expect(within(reading).getByText('Dias seguidos').nextElementSibling).toHaveTextContent('6');
    expect(within(reading).getByRole('link', { name: 'A Sociedade do Anel' })).toHaveAttribute(
      'href',
      '/livros/1',
    );
    expect(within(reading).getByText('O Hobbit · 6 dias')).toBeInTheDocument();
    const reviews = screen.getByRole('region', { name: 'Últimas resenhas' });
    expect(within(reviews).getByText('5,0')).toBeInTheDocument();
  });

  it('sends a new avatar and shows the error of an invalid one', async () => {
    const { view, http } = await setup();
    TestBed.tick();
    flushStats(http);
    await view.fixture.whenStable();

    const input = view.container.querySelector('input[type=file]') as HTMLInputElement;
    const file = new File(['x'], 'eu.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    http
      .expectOne({ method: 'PUT', url: '/api/v1/profile/avatar' })
      .flush(
        { code: 'image.invalid-type', detail: 'Envie uma imagem JPEG, PNG ou WebP.' },
        { status: 415, statusText: 'Unsupported Media Type' },
      );

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Envie uma imagem JPEG, PNG ou WebP.'),
    );
  });

  it('opens the form that changes the name and the theme', async () => {
    const { view, http } = await setup();
    TestBed.tick();
    flushStats(http);
    await view.fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Bru');
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Escuro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    const save = http.expectOne({ method: 'PUT', url: '/api/v1/profile' });
    expect(save.request.body).toEqual({ displayName: 'Bru', theme: 'DARK' });
    save.flush({ displayName: 'Bru', theme: 'DARK' });

    await vi.waitFor(() => expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument());
    expect(document.documentElement.dataset['theme']).toBe('dark');
    delete document.documentElement.dataset['theme'];
    localStorage.clear();
  });

  it('names the page when the reader has no name', async () => {
    const { view, http } = await setup({ theme: 'SYSTEM' });
    TestBed.tick();
    flushStats(http);
    await view.fixture.whenStable();

    expect(screen.getByText('Boa noite!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Seu perfil' })).toBeInTheDocument();
  });
});
