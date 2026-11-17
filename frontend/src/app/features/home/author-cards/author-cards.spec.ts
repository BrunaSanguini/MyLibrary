import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { AuthorCards } from './author-cards';

const author = (id: number, name: string, bookCount: number) => ({
  id,
  name,
  bookCount,
  coverUrls: [],
});

describe('AuthorCards', () => {
  it('shows the four authors with the most books', async () => {
    const view = await render(AuthorCards, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/v1/authors')
      .flush({
        content: [
          author(1, 'Austen', 3),
          author(2, 'Sem livros', 0),
          author(3, 'Tolkien', 6),
          author(4, 'Assis', 1),
          author(5, 'Rothfuss', 2),
          author(6, 'Shelley', 1),
        ],
        page: 0,
        size: 100,
        totalElements: 6,
        totalPages: 1,
      });
    await view.fixture.whenStable();

    const links = await screen.findAllByRole('link', { name: /livro/ });
    expect(
      links.map((link) =>
        [link.querySelector('.name'), link.querySelector('.meta')]
          .map((part) => part?.textContent?.trim())
          .join(' '),
      ),
    ).toEqual(['Tolkien 6 livros', 'Austen 3 livros', 'Rothfuss 2 livros', 'Assis 1 livro']);
    expect(links[0]).toHaveAttribute('href', '/autores/3');
  });
});
