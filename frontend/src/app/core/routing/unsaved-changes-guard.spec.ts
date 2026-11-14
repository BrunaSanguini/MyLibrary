import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { unsavedChangesGuard } from './unsaved-changes-guard';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('unsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lets the user leave a page with nothing to lose, without asking', () => {
    const confirm = vi.spyOn(window, 'confirm');

    expect(unsavedChangesGuard({ hasUnsavedChanges: () => false }, route, state, state)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('stays when the user chooses to keep editing', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    expect(unsavedChangesGuard({ hasUnsavedChanges: () => true }, route, state, state)).toBe(false);
  });

  it('leaves when the user confirms losing the changes', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    expect(unsavedChangesGuard({ hasUnsavedChanges: () => true }, route, state, state)).toBe(true);
  });
});
