import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <ml-empty-state title="Sua estante está vazia" message="Adicione o primeiro livro.">
      <button type="button">Adicionar livro</button>
    </ml-empty-state>
  `,
})
class Host {}

describe('EmptyState', () => {
  it('announces the title as a heading', async () => {
    await render(Host);

    expect(screen.getByRole('heading', { name: 'Sua estante está vazia' })).toBeInTheDocument();
  });

  it('shows the message', async () => {
    await render(Host);

    expect(screen.getByText('Adicione o primeiro livro.')).toBeInTheDocument();
  });

  it('keeps the action each screen projects into it', async () => {
    await render(Host);

    expect(screen.getByRole('button', { name: 'Adicionar livro' })).toBeInTheDocument();
  });

  it('works without a message', async () => {
    await render(EmptyState, { inputs: { title: 'Nenhum resultado' } });

    expect(screen.getByRole('heading', { name: 'Nenhum resultado' })).toBeInTheDocument();
  });
});
