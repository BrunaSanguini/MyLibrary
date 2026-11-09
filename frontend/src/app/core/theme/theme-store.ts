import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

/** Theme chosen in the profile. SYSTEM follows the operating system. */
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

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === 'SYSTEM') {
    return systemDark ? 'dark' : 'light';
  }
  return preference === 'DARK' ? 'dark' : 'light';
}

/**
 * Global theme state. The official preference lives in the profile; localStorage keeps a copy
 * so the next visit opens with the right theme. Read-only to the outside: change it with setPreference.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly storage = readStorage(this.document);
  private readonly systemQuery = this.document.defaultView?.matchMedia(
    '(prefers-color-scheme: dark)',
  );
  private readonly systemDark = signal(this.systemQuery?.matches ?? false);
  private readonly preferenceState = signal<ThemePreference>(this.readCachedPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly resolved = computed(() => resolveTheme(this.preference(), this.systemDark()));

  constructor() {
    const onSystemChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    this.systemQuery?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() =>
      this.systemQuery?.removeEventListener('change', onSystemChange),
    );

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
      return PREFERENCES.find((preference) => preference === cached) ?? 'SYSTEM';
    } catch {
      return 'SYSTEM';
    }
  }
}
