import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveTheme, THEME_STORAGE_KEY, ThemeStore } from './theme-store';

describe('resolveTheme', () => {
  it('opens the light theme only when it was chosen', () => {
    expect(resolveTheme('LIGHT')).toBe('light');
    expect(resolveTheme('DARK')).toBe('dark');
  });

  it('treats SYSTEM, from profiles saved before the dark default, as dark', () => {
    expect(resolveTheme('SYSTEM')).toBe('dark');
  });
});

describe('ThemeStore', () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('starts dark on the first visit', () => {
    const store = TestBed.inject(ThemeStore);

    expect(store.preference()).toBe('DARK');
    expect(store.resolved()).toBe('dark');
  });

  it('starts with the preference remembered from the last visit', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'LIGHT');

    const store = TestBed.inject(ThemeStore);

    expect(store.preference()).toBe('LIGHT');
    expect(store.resolved()).toBe('light');
  });

  it('treats an unknown remembered value as dark', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'SEPIA');

    const store = TestBed.inject(ThemeStore);

    expect(store.preference()).toBe('DARK');
    expect(store.resolved()).toBe('dark');
  });

  it('opens dark even when the operating system is light', () => {
    const original = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ ...original(query), matches: false }),
    });

    try {
      const store = TestBed.inject(ThemeStore);
      TestBed.tick();

      expect(store.resolved()).toBe('dark');
      expect(document.documentElement.dataset['theme']).toBe('dark');
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: original });
    }
  });

  it('still works when the browser blocks storage', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });

    try {
      const store = TestBed.inject(ThemeStore);
      store.setPreference('LIGHT');

      expect(store.resolved()).toBe('light');
    } finally {
      if (original) {
        Object.defineProperty(window, 'localStorage', original);
      }
    }
  });

  it('applies and remembers a new preference', () => {
    const store = TestBed.inject(ThemeStore);

    store.setPreference('LIGHT');
    TestBed.tick();

    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('LIGHT');
  });
});
