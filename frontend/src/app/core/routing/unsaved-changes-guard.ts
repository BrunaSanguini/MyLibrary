import { CanDeactivateFn } from '@angular/router';

/** A page that can lose typed data when the user leaves it. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const UNSAVED_CHANGES_QUESTION = 'Sair sem salvar? As alterações serão perdidas.';

/**
 * Asks before leaving a form with changes that were not saved.
 *
 * <p>The browser's own confirmation is used on purpose: it is modal, reachable by keyboard and
 * read by screen readers with no code of ours, and the question is a rare one.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) =>
  !page.hasUnsavedChanges() || window.confirm(UNSAVED_CHANGES_QUESTION);
