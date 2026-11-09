import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme);
    });

    test('home page opens with no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Início · Minha Livraria');
      await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expectNoAccessibilityViolations(page);
    });

    test('unknown address shows the 404 page with no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/endereco-que-nao-existe');

      await expect(page).toHaveTitle('Página não encontrada · Minha Livraria');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
      await expectNoAccessibilityViolations(page);
    });
  });
}

test('keeps the chosen theme after reloading, without flashing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // The inline script of index.html applies the theme before Angular starts.
  const themeAtFirstPaint = page
    .waitForEvent('domcontentloaded')
    .then(() => page.evaluate(() => document.documentElement.dataset['theme']));
  await page.reload();

  expect(await themeAtFirstPaint).toBe('dark');
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toBeVisible();
});
