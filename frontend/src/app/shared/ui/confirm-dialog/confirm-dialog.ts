import { Component, ElementRef, input, output, viewChild } from '@angular/core';

import { Button } from '../button/button';

/** Each dialog names itself with an id of its own, so two on one page do not clash. */
let nextId = 0;

/**
 * Confirmation of something that cannot be undone, on a native `<dialog>`.
 *
 * <p>`showModal()` gives the trapped focus, Escape and the backdrop for free, and returns the focus
 * to whatever opened it. The safe choice comes first and takes the initial focus, so Enter by
 * reflex cancels instead of deleting.
 */
@Component({
  selector: 'ml-confirm-dialog',
  imports: [Button],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly confirmLabel = input('Excluir');
  readonly cancelLabel = input('Cancelar');
  /** Disables the buttons while the confirmed action runs. */
  readonly busy = input(false);

  readonly confirmed = output<void>();

  protected readonly titleId = `ml-confirm-title-${nextId++}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
