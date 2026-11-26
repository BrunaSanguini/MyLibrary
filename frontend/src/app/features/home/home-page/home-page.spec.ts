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
    http.expectOne('/api/v1/goals/deadlines').flush([]);
    // Nothing chosen in Configurações yet: the hero falls back to the favorites.
    http.expectOne('/api/v1/featured').flush([]);
    await view.fixture.whenStable();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Boas-vindas ao Ex·Libru' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Marque livros como favoritos para vê-los aqui.')).toBeInTheDocument();
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
    const deadline = { type: 'BOOKS', genre: null, current: 0, percent: 0 };
    http.expectOne('/api/v1/goals/deadlines').flush([
      { ...deadline, id: 7, target: 5, startDate: '2026-11-01', endDate: '2027-01-31' },
      { ...deadline, id: 8, target: 20, startDate: '2027-01-01', endDate: '2027-12-31' },
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
    expect(screen.getByRole('article', { name: 'Meta de novembro' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Meta de outubro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Meta anual' })).not.toBeInTheDocument();
    // Only the goal with a deadline that is running today; next year's waits for its turn.
    expect(screen.getByRole('heading', { name: '5 livros' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '20 livros' })).not.toBeInTheDocument();
  });
});
