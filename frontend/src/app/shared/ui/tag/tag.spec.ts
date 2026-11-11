import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tag } from './tag';

@Component({
  imports: [Tag],
  template: `
    <button
      mlTag="state"
      type="button"
      [pressed]="owned"
      [attr.aria-pressed]="owned"
      (click)="owned = !owned"
    >
      Tenho este livro
    </button>
    <a mlTag="genre" href="/catalogos/generos/1">Fantasia</a>
    <a mlTag="subgenre" href="/catalogos/generos/2">Alta fantasia</a>
    <span mlTag="seal">Relido</span>
  `,
})
class Host {
  owned = false;
}

describe('Tag', () => {
  it('reads a state tag as a toggle button', async () => {
    await render(Host);

    const tag = screen.getByRole('button', { name: 'Tenho este livro' });
    expect(tag).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(tag);

    expect(tag).toHaveAttribute('aria-pressed', 'true');
  });

  it('paints the state tag as pressed only once it is', async () => {
    await render(Host);

    const tag = screen.getByRole('button', { name: 'Tenho este livro' });
    expect(tag).not.toHaveAttribute('data-pressed');

    await userEvent.click(tag);

    expect(tag).toHaveAttribute('data-pressed', '');
  });

  it('is reachable by the keyboard and toggles with the space bar', async () => {
    await render(Host);

    const tag = screen.getByRole('button', { name: 'Tenho este livro' });
    await userEvent.tab();
    expect(tag).toHaveFocus();

    await userEvent.keyboard(' ');

    expect(tag).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps genre and subgenre as links to the catalog', async () => {
    await render(Host);

    expect(screen.getByRole('link', { name: 'Fantasia' })).toHaveAttribute(
      'href',
      '/catalogos/generos/1',
    );
    expect(screen.getByRole('link', { name: 'Alta fantasia' })).toHaveAttribute(
      'data-variant',
      'subgenre',
    );
  });

  it('leaves a seal out of the accessibility tree as a control', async () => {
    await render(Host);

    expect(screen.queryByRole('button', { name: 'Relido' })).not.toBeInTheDocument();
    expect(screen.getByText('Relido')).toHaveAttribute('data-variant', 'seal');
  });

  it('gives a state tag a target of at least 36px', async () => {
    await render(Host);

    const tag = screen.getByRole('button', { name: 'Tenho este livro' });
    expect(tag.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
  });
});
