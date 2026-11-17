import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TODAY } from '@core/time/today';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

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
    await view.fixture.whenStable();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Boas-vindas à Minha Livraria' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nenhum favorito ainda/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma meta para 2026/)).toBeInTheDocument();
    expect(await view.fixture.getDeferBlocks()).toHaveLength(3);
    http.verify();
  });
});
