import { BookListResponse } from '@core/api/lists-api';
import { NOW } from '@core/time/today';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { provideRouter } from '@angular/router';

import { ListCard } from './list-card';

const LIST: BookListResponse = {
  id: 4,
  name: 'Clássicos para reler',
  description: 'Os que merecem uma segunda leitura com calma.',
  bookCount: 5,
  readCount: 3,
  wishlistCount: 1,
  status: 'IN_PROGRESS',
  color: 'NIGHT',
  pinned: false,
  coverUrls: ['/api/v1/images/a.webp', '/api/v1/images/b.webp', '/api/v1/images/c.webp'],
  updatedAt: '2026-11-01T12:00:00Z',
};

async function setup(list: Partial<BookListResponse> = {}) {
  return render(ListCard, {
    inputs: { list: { ...LIST, ...list } },
    providers: [
      provideRouter([]),
      { provide: NOW, useValue: () => new Date('2026-11-04T12:00:00Z') },
    ],
  });
}

describe('ListCard', () => {
  it('has one link, the name, that opens the list', async () => {
    await setup();

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Clássicos para reler' })).toHaveAttribute(
      'href',
      '/lista/4',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Clássicos para reler' })).toBeVisible();
  });

  it('tells the books read, the status, the progress and when it changed', async () => {
    await setup();

    expect(screen.getByText('3 de 5 lidos')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Livros lidos de Clássicos para reler' }),
    ).toHaveAttribute('aria-valuenow', '60');
    const time = screen.getByText('há 3 dias');
    expect(time).toHaveAttribute('datetime', '2026-11-01T12:00:00Z');
  });

  it.each([
    ['NOT_STARTED', 'Não iniciada', 0],
    ['COMPLETED', 'Concluída', 5],
  ] as const)('writes the status %s as "%s"', async (status, label, readCount) => {
    await setup({ status, readCount });

    expect(screen.getByText(label)).toHaveAttribute('data-status', status);
  });

  it('fills the fan with the covers of the list, and none of them is read aloud', async () => {
    const { container } = await setup();

    expect(container.querySelectorAll('ml-list-covers img')).toHaveLength(3);
    expect(container.querySelector('ml-list-covers')).toHaveAttribute('aria-hidden', 'true');
  });

  it('writes the name of a list without covers on the cover in front, in its own colour', async () => {
    const { container } = await setup({ coverUrls: [], name: 'Lidos no inverno' });

    const front = container.querySelector<HTMLElement>('ml-list-covers .front')!;
    expect(front).toHaveTextContent('Lidos no inverno');
    expect(front.style.background).toBe('var(--ml-color-book-navy)');
    expect(container.querySelectorAll('ml-list-covers img')).toHaveLength(0);
  });

  it('does not divide by zero for a list with no books', async () => {
    await setup({ bookCount: 0, readCount: 0, status: 'NOT_STARTED' });

    expect(screen.getByText('0 de 0 lidos')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('says there is no description yet when the list has none', async () => {
    await setup({ description: undefined });

    expect(screen.getByText('Sem descrição por enquanto.')).toBeInTheDocument();
  });
});
