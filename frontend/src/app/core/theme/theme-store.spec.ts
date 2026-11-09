import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveTheme, THEME_STORAGE_KEY, ThemeStore } from './theme-store';

/** Simulates the operating system theme through matchMedia. */
function simulateSystemTheme(dark: boolean): { change(dark: boolean): void } {
  const listeners: ((event: MediaQueryListEvent) => void)[] = [];
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      ...original(query),
      matches: dark,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.push(listener),
      removeEventListener: () => undefined,
    }),
  });
  return {
    change: (matches) =>
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent)),
  };
}

describe('resolveTheme', () => {
  it('follows the system when the preference is SYSTEM', () => {
    expect(resolveTheme('SYSTEM', true)).toBe('dark');
    expect(resolveTheme('SYSTEM', false)).toBe('light');
  });

  it('ignores the system when the preference is explicit', () => {
    expect(resolveTheme('LIGHT', true)).toBe('light');
    expect(resolveTheme('DARK', false)).toBe('dark');
  });
});

describe('ThemeStore', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('starts with SYSTEM on the first visit', () => {
    simulateSystemTheme(true);

    const store = TestBed.inject(ThemeStore);

    expect(store.preference()).toBe('SYSTEM');
    expect(store.resolved()).toBe('dark');
  });

  it('starts with the preference remembered from the last visit', () => {
    simulateSystemTheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'LIGHT');

    const store = TestBed.inject(ThemeStore);

    expect(store.preference()).toBe('LIGHT');
    expect(store.resolved()).toBe('light');
  });

  it('treats an unknown remembered value as SYSTEM', () => {
    simulateSystemTheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'SEPIA');

    expect(TestBed.inject(ThemeStore).preference()).toBe('SYSTEM');
  });

  it('applies and remembers a new preference', () => {
    simulateSystemTheme(false);
    const store = TestBed.inject(ThemeStore);

    store.setPreference('DARK');
    TestBed.tick();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('DARK');
  });

  it('follows the system while the preference is SYSTEM', () => {
    const system = simulateSystemTheme(false);
    const store = TestBed.inject(ThemeStore);
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('light');

    system.change(true);
    TestBed.tick();

    expect(store.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
