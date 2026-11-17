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
    // Scrolling down draws the sections that wait for the screen, one after the other.
    const lists = page.getByRole('heading', { name: 'Listas para explorar' });
    await expect(async () => {
      await page.mouse.wheel(0, 800);
      await expect(lists).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(page.getByRole('heading', { name: 'Por autor' })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Lendo agora' })).toBeAttached();
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);
  });
}
