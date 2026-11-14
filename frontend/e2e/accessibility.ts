import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Opens the app with the theme preference already saved, as on a second visit. */
export async function useTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((preference) => {
    localStorage.setItem('ml-theme-preference', preference);
  }, theme.toUpperCase());
}

/**
 * Fails on any WCAG 2.1 A or AA violation, whatever severity axe gives it
 * (docs/testes-e-qualidade.md). axe "best practices" outside WCAG are not checked.
 *
 * @param scope CSS selector to analyse instead of the whole page
 */
export async function expectNoAccessibilityViolations(page: Page, scope?: string): Promise<void> {
  const axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  const results = await (scope ? axe.include(scope) : axe).analyze();

  expect(results.violations).toEqual([]);
}

/**
 * Scope for a test of an open header panel: the whole page on Chromium, the panel alone on Firefox.
 *
 * Firefox on CI crashes the page ("Page crashed") when axe analyses the whole document while the
 * search panel shows results. It was measured, not guessed: the crash needs results on screen and a
 * page-wide rule other than color-contrast; it happens with backdrop-filter and box-shadow removed,
 * and the app sits idle meanwhile, so it is the browser and not a loop of ours. The panel alone
 * passes, and the page around it is already analysed on Firefox by the smoke test.
 */
export function panelScope(browserName: string, panel: string): string | undefined {
  return browserName === 'firefox' ? panel : undefined;
}
