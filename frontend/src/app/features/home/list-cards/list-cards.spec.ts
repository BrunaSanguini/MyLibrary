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
  expect(request.request.params.get('size')).toBe('3');
  expect(request.request.params.has('pinned')).toBe(false);
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
        wishlistCount: 0,
        status: 'IN_PROGRESS',
        color: 'PLUM',
        pinned: false,
        coverUrls: [],
        updatedAt: '2026-11-01T10:00:00Z',
      },
    ]);

    const link = await screen.findByRole('link', { name: /Clássicos para reler/ });
    expect(link).toHaveAttribute('href', '/lista/4');
    expect(link).toHaveTextContent('5 livros');
    expect(link).toHaveTextContent('1 lido');
    // No cover yet: the book in front of the fan carries the name, on the colour of the list.
    const front = link.querySelector<HTMLElement>('ml-list-covers .front');
    expect(front).toHaveTextContent('Clássicos para reler');
    expect(front?.style.background).toBe('var(--ml-color-book-plum)');
  });

  it('points to the page of lists when there is none', async () => {
    await setup([]);

    expect(await screen.findByRole('link', { name: 'Crie a primeira' })).toHaveAttribute(
      'href',
      '/listas',
    );
  });
});
