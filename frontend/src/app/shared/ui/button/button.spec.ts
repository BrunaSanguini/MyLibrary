import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

@Component({
  imports: [Button],
  template: `
    <button mlButton type="button" [disabled]="disabled" (click)="clicked()">Abrir livro</button>
    <a mlButton="secondary" href="/estante">Ler minha resenha</a>
    <button mlButton="icon" type="button" aria-label="Excluir livro"></button>
  `,
})
class Host {
  disabled = false;
  readonly clicked = vi.fn();
}

describe('Button', () => {
  it('keeps the host a real button, with its own type and disabled state', async () => {
    await render(Host, { componentProperties: { disabled: true } });

    const button = screen.getByRole('button', { name: 'Abrir livro' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toBeDisabled();
  });

  it('keeps the host a real link, with its own href', async () => {
    await render(Host);

    expect(screen.getByRole('link', { name: 'Ler minha resenha' })).toHaveAttribute(
      'href',
      '/estante',
    );
  });

  it('is reachable and activated by the keyboard', async () => {
    const { fixture } = await render(Host);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Abrir livro' })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(fixture.componentInstance.clicked).toHaveBeenCalled();
  });

  it('names an icon-only button by its aria-label', async () => {
    await render(Host);

    expect(screen.getByRole('button', { name: 'Excluir livro' })).toBeInTheDocument();
  });

  it('marks the variant so the stylesheet can paint it', async () => {
    await render(Host);

    expect(screen.getByRole('button', { name: 'Abrir livro' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    expect(screen.getByRole('link', { name: 'Ler minha resenha' })).toHaveAttribute(
      'data-variant',
      'secondary',
    );
  });

  it('shows a 44px target for an icon-only button', async () => {
    await render(Host);

    const button = screen.getByRole('button', { name: 'Excluir livro' });
    expect(button.getBoundingClientRect().width).toBe(44);
    expect(button.getBoundingClientRect().height).toBe(44);
  });
});
