import { Component, viewChild } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <button type="button" (click)="dialog().open()">Excluir livro</button>
    <ml-confirm-dialog
      title="Excluir este livro?"
      message="A capa e o banner vão para a lixeira."
      (confirmed)="confirmed()"
    />
  `,
})
class Host {
  readonly dialog = viewChild.required(ConfirmDialog);
  readonly confirmed = vi.fn();
}

describe('ConfirmDialog', () => {
  it('stays closed until it is asked to open', async () => {
    await render(Host);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a modal named by its title', async () => {
    await render(Host);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));

    expect(screen.getByRole('dialog', { name: 'Excluir este livro?' })).toBeVisible();
    expect(screen.getByText('A capa e o banner vão para a lixeira.')).toBeVisible();
  });

  it('puts the first focus on the safe choice', async () => {
    await render(Host);

    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('tells the page when the action is confirmed', async () => {
    const { fixture } = await render(Host);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(fixture.componentInstance.confirmed).toHaveBeenCalledOnce();
  });

  // Escape itself is the browser's doing on a modal dialog and ignores synthetic key events, so
  // the real key press is exercised by the E2E journey; here it is the focus that matters.
  it('gives the focus back to what opened it when it closes', async () => {
    await render(Host);
    const opener = screen.getByRole('button', { name: 'Excluir livro' });
    await userEvent.click(opener);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on cancel without confirming', async () => {
    const { fixture } = await render(Host);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir livro' }));

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fixture.componentInstance.confirmed).not.toHaveBeenCalled();
  });
});
