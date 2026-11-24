import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TODAY } from '@core/time/today';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import HomePage from './home-page';

const EMPTY_PAGE = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 };

/**
 * The sections below the fold load on their own when they come near the screen; each one has
 * its own tests, empty state included.
 */
describe('HomePage', () => {
  it('welcomes a new library and leaves the sections below the fold for later', async () => {
    const view = await render(HomePage, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TODAY, useValue: () => '2026-11-17' },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    const favorites = http.expectOne((request) => request.url === '/api/v1/shelf/books');
    expect(favorites.request.params.get('favorite')).toBe('true');
    expect(favorites.request.params.get('sort')).toBe('rating,desc');
    favorites.flush(EMPTY_PAGE);
    const goals = http.expectOne((request) => request.url === '/api/v1/goals');
    expect(goals.request.params.get('year')).toBe('2026');
    goals.flush([]);
    // Nothing chosen in Configurações yet: the hero falls back to the favorites.
    http.expectOne('/api/v1/featured').flush([]);
    await view.fixture.whenStable();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Boas-vindas à Minha Livraria' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nenhum favorito ainda/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma meta para 2026/)).toBeInTheDocument();
    expect(await view.fixture.getDeferBlocks()).toHaveLength(3);
    http.verify();
  });

  it('features the books chosen in Configurações, with their own image, and only the goals that are on', async () => {
    const view = await render(HomePage, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TODAY, useValue: () => '2026-11-17' },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    http.expectOne((request) => request.url === '/api/v1/shelf/books').flush(EMPTY_PAGE);
    const goal = { type: 'BOOKS', year: 2026, target: 12, current: 3, percent: 25 };
    http
      .expectOne((request) => request.url === '/api/v1/goals')
      .flush([
        { ...goal, id: 1, period: 'YEAR', enabled: false },
        { ...goal, id: 2, period: 'MONTH', month: 10, target: 2, enabled: true },
        { ...goal, id: 3, period: 'MONTH', month: 11, target: 4, enabled: true },
      ]);
    http.expectOne('/api/v1/featured').flush([
      {
        slot: 1,
        bookId: 7,
        title: 'O Hobbit',
        authors: ['J. R. R. Tolkien'],
        imageUrl: '/api/v1/images/9',
      },
    ]);
    // The detail and the review of the book: neither matters here.
    await vi.waitFor(() => {
      TestBed.tick();
      for (const request of http.match(() => true)) {
        request.flush(null, { status: 404, statusText: 'Not Found' });
      }
      expect(screen.getByRole('heading', { level: 1, name: 'O Hobbit' })).toBeInTheDocument();
    });

    expect(view.container.querySelector('img[src="/api/v1/images/9"]')).not.toBeNull();
    expect(screen.getByText(/Livros em novembro/)).toBeInTheDocument();
    expect(screen.queryByText(/Livros em outubro/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Livros em 2026/)).not.toBeInTheDocument();
  });
});
