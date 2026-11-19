import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme);
    });

    test('home page opens with no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Início · Ex·Libru');
      await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expectNoAccessibilityViolations(page);
    });

    test('unknown address shows the 404 page with no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/endereco-que-nao-existe');

      await expect(page).toHaveTitle('Página não encontrada · Ex·Libru');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
      await expectNoAccessibilityViolations(page);
    });
  });
}
