import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { BookCardResponse } from '@core/api/shelf-api';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { excerptOf, HomeHero } from './home-hero';

const card = (id: number, title: string, rating?: number): BookCardResponse => ({
  id,
  title,
  authors: ['J. R. R. Tolkien'],
  status: 'READ',
  genres: [],
  ownership: 'OWNED',
  favorite: true,
  reread: false,
  rating,
});

async function setup(books: BookCardResponse[], loading = false) {
  const view = await render(HomeHero, {
    inputs: { books, loading },
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { view, http: TestBed.inject(HttpTestingController) };
}

describe('excerptOf', () => {
  it('cuts a long review at a word', () => {
    const text = `${'palavra '.repeat(40)}fim`;
    const excerpt = excerptOf(text) ?? '';

    expect(excerpt.endsWith('palavra…')).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(221);
    expect(excerptOf('  Curta.  ')).toBe('Curta.');
    expect(excerptOf(null)).toBeUndefined();
  });
});

describe('HomeHero', () => {
  it('features a favorite with its banner, rating and the start of the review', async () => {
    const { view, http } = await setup([card(1, 'A Sociedade do Anel', 4.5), card(2, 'O Hobbit')]);
    TestBed.tick();
    http.expectOne('/api/v1/books/1').flush({
      ...card(1, 'A Sociedade do Anel'),
      authors: [{ id: 1, name: 'J. R. R. Tolkien' }],
      subtitle: 'O Senhor dos Anéis, volume 1',
      genres: [{ id: 1, name: 'Fantasia' }],
      bannerUrl: '/api/v1/images/9',
    });
    http.expectOne('/api/v1/books/1/review').flush({
      bookId: 1,
      rating: 4.5,
      content: 'Uma jornada linda.',
      updatedAt: '2026-11-01T10:00:00Z',
    });
    await view.fixture.whenStable();

    expect(
      screen.getByRole('heading', { level: 1, name: 'A Sociedade do Anel' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('O Senhor dos Anéis, volume 1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText('Uma jornada linda.')).toBeInTheDocument();
    expect(screen.getByText('Fantasia')).toBeInTheDocument();
    expect(view.container.querySelector('img.art')).toHaveAttribute('src', '/api/v1/images/9');
    expect(screen.getByRole('link', { name: 'Ler minha resenha' })).toHaveAttribute(
      'href',
      '/livro/1#minha-resenha',
    );
  });

  it('goes to the next favorite and back around', async () => {
    const { http } = await setup([card(1, 'A Sociedade do Anel'), card(2, 'O Hobbit')]);
    TestBed.tick();
    http.match(() => true);

    expect(screen.getByText('I')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo destaque' }));
    expect(screen.getByRole('heading', { level: 1, name: 'O Hobbit' })).toBeInTheDocument();
    expect(screen.getByText('/ II')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo destaque' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'A Sociedade do Anel' }),
    ).toBeInTheDocument();
  });

  it('scrolls down to the favorites without leaving the page', async () => {
    const favorites = document.createElement('section');
    favorites.id = 'favoritos';
    favorites.scrollIntoView = vi.fn();
    document.body.append(favorites);
    await setup([card(1, 'O Hobbit')]);

    await userEvent.click(screen.getByRole('link', { name: /Role para ver os favoritos/ }));

    expect(favorites.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    favorites.remove();
  });

  it('does not quote a book without review', async () => {
    const { view, http } = await setup([card(1, 'O Hobbit')]);
    TestBed.tick();
    http.expectOne('/api/v1/books/1').flush({ ...card(1, 'O Hobbit'), authors: [], genres: [] });
    http
      .expectOne('/api/v1/books/1/review')
      .flush({ code: 'review.not-found' }, { status: 404, statusText: 'Not Found' });
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('link', { name: /Abrir livro/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('link', { name: 'Ler minha resenha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximo destaque' })).not.toBeInTheDocument();
  });

  it('welcomes the reader when there are no favorites yet', async () => {
    await setup([]);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Boas-vindas ao Ex·Libru' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar livro' })).toHaveAttribute(
      'href',
      '/estante/novo',
    );
  });

  it('waits for the favorites before welcoming', async () => {
    await setup([], true);

    expect(screen.queryByText('Boas-vindas ao Ex·Libru')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument();
  });

  it('moves on by itself every eight seconds and stops while the mouse is on it', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const { view, http } = await setup([card(1, 'A Sociedade do Anel'), card(2, 'O Hobbit')]);
      TestBed.tick();
      http.match(() => true);

      vi.advanceTimersByTime(8000);
      TestBed.tick();
      expect(screen.getByRole('heading', { level: 1, name: 'O Hobbit' })).toBeInTheDocument();

      view.container.querySelector('section')!.dispatchEvent(new MouseEvent('mouseenter'));
      TestBed.tick();
      vi.advanceTimersByTime(16000);
      TestBed.tick();
      expect(screen.getByRole('heading', { level: 1, name: 'O Hobbit' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
