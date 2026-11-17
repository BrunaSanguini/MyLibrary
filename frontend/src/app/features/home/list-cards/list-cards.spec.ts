import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ListCards } from './list-cards';

async function setup(content: object[]) {
  const view = await render(ListCards, {
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const request = TestBed.inject(HttpTestingController).expectOne(
    (candidate) => candidate.url === '/api/v1/lists',
  );
  expect(request.request.params.get('sort')).toBe('updatedAt,desc');
  request.flush({ content, page: 0, size: 3, totalElements: content.length, totalPages: 1 });
  await view.fixture.whenStable();
}

describe('ListCards', () => {
  it('shows the lists changed last with how much was read', async () => {
    await setup([
      {
        id: 4,
        name: 'Clássicos para reler',
        description: 'Com calma.',
        bookCount: 5,
        readCount: 1,
        coverUrls: [],
        updatedAt: '2026-11-01T10:00:00Z',
      },
    ]);

    const link = await screen.findByRole('link', { name: /Clássicos para reler/ });
    expect(link).toHaveAttribute('href', '/listas/4');
    expect(link).toHaveTextContent('5 livros');
    expect(link).toHaveTextContent('1 lido');
  });

  it('points to the page of lists when there is none', async () => {
    await setup([]);

    expect(await screen.findByRole('link', { name: 'Crie a primeira' })).toHaveAttribute(
      'href',
      '/listas',
    );
  });
});
