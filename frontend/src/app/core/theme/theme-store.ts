import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

/** Theme chosen in the profile. SYSTEM comes from profiles saved before the dark default and counts as DARK. */
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

/** Theme applied to the page, as the data-theme attribute of <html>. */
export type Theme = 'light' | 'dark';

/** Shared with the inline script of index.html, which applies the theme before the first paint. */
export const THEME_STORAGE_KEY = 'ml-theme-preference';

const PREFERENCES: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];

/** Reading the localStorage property itself throws when the browser blocks storage. */
function readStorage(document: Document): Storage | undefined {
  try {
    return document.defaultView?.localStorage;
  } catch {
    return undefined;
  }
}

/** The dark theme ("noite arcana") is the default: only an explicit LIGHT opens the light one. */
export function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'LIGHT' ? 'light' : 'dark';
}

/**
 * Global theme state. The official preference lives in the profile; localStorage keeps a copy
 * so the next visit opens with the right theme. Read-only to the outside: change it with setPreference.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly storage = readStorage(this.document);
  private readonly preferenceState = signal<ThemePreference>(this.readCachedPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed(() => resolveTheme(this.preference()));

  constructor() {
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.resolved();
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    try {
      this.storage?.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage blocked by the browser: the theme still changes, it just is not remembered.
    }
  }

  private readCachedPreference(): ThemePreference {
    try {
      const cached = this.storage?.getItem(THEME_STORAGE_KEY);
      return PREFERENCES.find((preference) => preference === cached) ?? 'DARK';
    } catch {
      return 'DARK';
    }
  }
}
