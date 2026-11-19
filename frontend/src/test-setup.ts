import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// The tests run without isolation between files, so the theme saved by one test (the ThemeStore
// writes the preference to localStorage and the theme to <html>) would reach the next file.
afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // A test that blocks storage restores it itself; nothing to clean here.
  }
  delete document.documentElement.dataset['theme'];
});

// jsdom has no matchMedia. Components that read it (favorites-flow, for reduced motion) see "no match";
// the specs that need another answer replace it.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) satisfies MediaQueryList,
  });
}
