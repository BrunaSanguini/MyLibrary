import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BookCard, BookCardData } from './book-card';

const FELLOWSHIP: BookCardData = {
  id: 42,
  title: 'A Sociedade do Anel',
  authors: ['J. R. R. Tolkien'],
  pageCount: 576,
  rating: 5,
};

async function renderCard(book: BookCardData, compact = false) {
  return render(BookCard, {
    inputs: { book, compact },
    providers: [provideRouter([])],
  });
}

describe('BookCard', () => {
  it('is a single link to the book, named by what it shows', async () => {
    await renderCard(FELLOWSHIP);

    const link = screen.getByRole('link', {
      name: 'A Sociedade do Anel J. R. R. Tolkien Nota 5 de 5 576 páginas',
    });
    expect(link).toHaveAttribute('href', '/livros/42');
  });

  it('joins several authors into one line', async () => {
    await renderCard({ ...FELLOWSHIP, authors: ['Neil Gaiman', 'Terry Pratchett'] });

    expect(screen.getByText('Neil Gaiman, Terry Pratchett')).toBeInTheDocument();
  });

  it('shows the pages and the rating', async () => {
    await renderCard(FELLOWSHIP);

    expect(screen.getByText('576 páginas')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nota 5 de 5' })).toBeInTheDocument();
  });

  it('leaves the progress bar out of a book that is not being read', async () => {
    await renderCard(FELLOWSHIP);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the progress bar for a book being read', async () => {
    await renderCard({ ...FELLOWSHIP, progress: 62 });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  });

  it('shows where the book sits in its series', async () => {
    await renderCard({ ...FELLOWSHIP, seriesName: 'O Senhor dos Anéis', seriesPosition: 1 });

    expect(screen.getByText(/O Senhor dos Anéis · Livro 1/)).toBeInTheDocument();
  });

  it('leaves the series out when the book has none', async () => {
    await renderCard(FELLOWSHIP);

    expect(screen.queryByText(/Livro/)).not.toBeInTheDocument();
  });

  it('names the link without a rating when the book has none', async () => {
    await renderCard({ ...FELLOWSHIP, rating: undefined });

    expect(
      screen.getByRole('link', { name: 'A Sociedade do Anel J. R. R. Tolkien 576 páginas' }),
    ).toBeInTheDocument();
  });

  it('is reachable by the keyboard', async () => {
    await renderCard(FELLOWSHIP);

    await userEvent.tab();

    expect(screen.getByRole('link')).toHaveFocus();
  });

  it('falls back to the placeholder cover', async () => {
    const { container } = await renderCard(FELLOWSHIP);

    expect(container.querySelector('.placeholder')).toBeInTheDocument();
    // Decorative inside the card: the title next to it already names the link.
    expect(container.querySelector('ml-book-cover')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toBeNull();
  });
});
