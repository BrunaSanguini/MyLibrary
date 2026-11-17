import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/** Home and Perfil in both themes, with whatever the other tests left on the server. */
for (const theme of THEMES) {
  test(`profile has no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto('/perfil');

    await expect(page.getByRole('heading', { name: 'Sua leitura' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);
  });

  test(`home has no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Scrolling down draws the sections that wait for the screen.
    await page.getByRole('heading', { name: 'Listas para explorar' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Por autor' })).toBeVisible();
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);
  });
}
