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
 */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}
