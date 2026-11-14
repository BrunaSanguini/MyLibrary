import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// TEMPORARY: finds what makes Firefox crash the page when axe runs over an open header panel.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function openSearch(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pesquisar no acervo' }).click();
  await page.getByRole('searchbox', { name: 'Buscar por título ou autor' }).fill('dom');
  await expect(page.getByRole('dialog').getByRole('link', { name: /Dom Casmurro/ })).toBeVisible();
}

test.describe('diagnose firefox crash', () => {
  test.skip(({ browserName }) => browserName !== 'firefox', 'firefox only');
  test.describe.configure({ retries: 0 });

  test('A: only color-contrast', async ({ page }) => {
    await openSearch(page);
    await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  });

  test('B: everything but color-contrast', async ({ page }) => {
    await openSearch(page);
    await new AxeBuilder({ page }).withTags(WCAG).disableRules(['color-contrast']).analyze();
  });

  test('C: all rules, no backdrop-filter anywhere', async ({ page }) => {
    await openSearch(page);
    await page.addStyleTag({ content: '*, *::before { backdrop-filter: none !important; }' });
    await new AxeBuilder({ page }).withTags(WCAG).analyze();
  });

  test('D: all rules, no box-shadow anywhere', async ({ page }) => {
    await openSearch(page);
    await page.addStyleTag({ content: '*, *::before { box-shadow: none !important; }' });
    await new AxeBuilder({ page }).withTags(WCAG).analyze();
  });

  test('E: all rules, panel without results (hint only)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Pesquisar no acervo' }).click();
    await expect(page.getByText('Digite ao menos duas letras.')).toBeVisible();
    await new AxeBuilder({ page }).withTags(WCAG).analyze();
  });

  test('F: all rules, results without the cover placeholders', async ({ page }) => {
    await openSearch(page);
    await page.addStyleTag({ content: 'ml-book-cover { display: none !important; }' });
    await new AxeBuilder({ page }).withTags(WCAG).analyze();
  });

  test('G: all rules, scoped to the panel only', async ({ page }) => {
    await openSearch(page);
    await new AxeBuilder({ page }).include('#painel-de-busca').withTags(WCAG).analyze();
  });
});
