import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReadingNow } from './reading-now';

const card = (id: number, title: string) => ({
  id,
  title,
  authors: ['Patrick Rothfuss'],
  status: 'READING',
  genres: [],
  ownership: 'OWNED',
  favorite: false,
});

async function setup() {
  const view = await render(ReadingNow, {
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  return { view, http: TestBed.inject(HttpTestingController) };
}

describe('ReadingNow', () => {
  it('shows how far the current reading is and where to register the pages', async () => {
    const { http } = await setup();
    const shelf = http.expectOne((request) => request.url === '/api/v1/shelf/books');
    expect(shelf.request.params.getAll('status')).toEqual(['READING']);
    shelf.flush({
      content: [card(5, 'O Nome do Vento'), card(6, 'Duna')],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    });
    const readings = await vi.waitFor(() => {
      TestBed.tick();
      return http.expectOne('/api/v1/books/5/readings');
    });
    readings.flush([
      {
        id: 9,
        bookId: 5,
        status: 'IN_PROGRESS',
        startDate: '2026-10-20',
        reread: false,
        progress: { pagesRead: 196, pageCount: 656, percent: 29 },
        sessionCount: 14,
      },
    ]);
    TestBed.tick();

    const reading = await screen.findByRole('article', { name: 'O Nome do Vento' });
    expect(reading).toHaveTextContent('656 páginas · começou em 20 de outubro de 2026');
    expect(reading).toHaveTextContent('14 dias registrados');
    expect(reading).toHaveTextContent('29%');
    expect(reading).toHaveTextContent('página 196 de 656');
    expect(screen.getByRole('link', { name: 'Atualizar progresso' })).toHaveAttribute(
      'href',
      '/livro/5/leitura',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Próxima leitura' }));
    expect(screen.getByRole('article', { name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('suggests the next book when nothing is being read', async () => {
    const { view, http } = await setup();
    http
      .expectOne((request) => request.url === '/api/v1/shelf/books')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await view.fixture.whenStable();

    expect(await screen.findByText(/Nenhum livro em leitura/)).toBeInTheDocument();
  });
});
