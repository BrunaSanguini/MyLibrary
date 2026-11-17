import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Opens the app in a theme, as on a second visit: the copy in the browser paints it first and the
 * profile confirms it.
 *
 * <p>The profile is one for the whole server, and the tests run side by side. So this page sees
 * the profile with the theme it needs, and the real profile is left to the test that is about it
 * (profile.spec.ts).
 */
export async function useTheme(page: Page, theme: Theme): Promise<void> {
  const preference = theme.toUpperCase();
  await page.addInitScript((saved) => {
    localStorage.setItem('ml-theme-preference', saved);
  }, preference);
  await page.route('**/api/v1/profile', async (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    const response = await route.fetch();
    const profile = (await response.json()) as Record<string, unknown>;
    return route.fulfill({ response, json: { ...profile, theme: preference } });
  });
}

/**
 * Fails on any WCAG 2.1 A or AA violation, whatever severity axe gives it
 * (docs/testes-e-qualidade.md). axe "best practices" outside WCAG are not checked.
 */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  await settleColors(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}

/**
 * Ends every transition at its final value. axe reads the colors of the moment it runs, and a
 * button still fading from its hover or theme color reads as a contrast failure the person
 * never sees once the fade is over.
 */
async function settleColors(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
