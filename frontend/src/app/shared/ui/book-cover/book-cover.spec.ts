import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { BookCover } from './book-cover';

describe('BookCover', () => {
  it('shows the stored cover when the book has one', async () => {
    const { container } = await render(BookCover, {
      inputs: { title: 'Duna', coverUrl: '/api/v1/images/17' },
    });

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/images/17');
    expect(container.querySelector('.placeholder')).toBeNull();
  });

  it('leaves the cover out of the accessibility tree, since the link names the book', async () => {
    const { container } = await render(BookCover, {
      inputs: { title: 'Duna', coverUrl: '/api/v1/images/17' },
    });

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('falls back to a typographic placeholder with title and author', async () => {
    await render(BookCover, {
      inputs: { title: 'A Sociedade do Anel', author: 'J. R. R. Tolkien' },
    });

    expect(screen.getByText('A Sociedade do Anel')).toBeInTheDocument();
    expect(screen.getByText('J. R. R. Tolkien')).toBeInTheDocument();
  });

  it('gives the same book the same placeholder colour every time', async () => {
    const { fixture, rerender } = await render(BookCover, { inputs: { title: 'Duna' } });
    const colour = () =>
      fixture.nativeElement.querySelector('.placeholder').style.background as string;
    const first = colour();

    await rerender({ inputs: { title: 'O Hobbit' } });
    expect(colour()).not.toBe('');

    await rerender({ inputs: { title: 'Duna' } });

    expect(colour()).toBe(first);
  });

  it('keeps the 2:3 proportion of a cover', async () => {
    const { fixture } = await render(BookCover, { inputs: { title: 'Duna', size: 'sm' } });

    const box = (fixture.nativeElement as HTMLElement).getBoundingClientRect();
    expect(box.width).toBe(96);
    expect(Math.round(box.height)).toBe(144);
  });
});
