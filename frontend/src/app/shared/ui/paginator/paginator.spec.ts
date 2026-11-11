import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Paginator } from './paginator';

describe('Paginator', () => {
  it('counts pages from one, though the API counts from zero', async () => {
    await render(Paginator, { inputs: { page: 2, totalPages: 7 } });

    expect(screen.getByText(/Página/)).toHaveTextContent('Página 3 de 7');
  });

  it('asks for the next and the previous page', async () => {
    const pageChange = vi.fn();
    await render(Paginator, {
      inputs: { page: 2, totalPages: 7 },
      on: { pageChange },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(pageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(pageChange).toHaveBeenCalledWith(1);
  });

  it('disables the ends instead of asking for a page that does not exist', async () => {
    const pageChange = vi.fn();
    await render(Paginator, { inputs: { page: 0, totalPages: 1 }, on: { pageChange } });

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
    expect(pageChange).not.toHaveBeenCalled();
  });

  it('is operated by the keyboard', async () => {
    const pageChange = vi.fn();
    await render(Paginator, { inputs: { page: 1, totalPages: 4 }, on: { pageChange } });

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(pageChange).toHaveBeenCalledWith(0);
  });

  it('announces the page change to a screen reader', async () => {
    await render(Paginator, { inputs: { page: 0, totalPages: 3 } });

    expect(screen.getByText(/Página/)).toHaveAttribute('aria-live', 'polite');
  });
});
