import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('announces itself as an alert when it replaces the content', async () => {
    await render(ErrorState, {});

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the detail that came from the API', async () => {
    await render(ErrorState, { inputs: { message: 'O livro solicitado não existe.' } });

    expect(screen.getByText('O livro solicitado não existe.')).toBeInTheDocument();
  });

  it('offers to try again', async () => {
    const retry = vi.fn();
    await render(ErrorState, { on: { retry } });

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(retry).toHaveBeenCalled();
  });

  it('retries from the keyboard too', async () => {
    const retry = vi.fn();
    await render(ErrorState, { on: { retry } });

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(retry).toHaveBeenCalled();
  });

  it('has a title of its own by default', async () => {
    await render(ErrorState, {});

    expect(screen.getByRole('heading', { name: 'Não foi possível carregar' })).toBeInTheDocument();
  });
});
