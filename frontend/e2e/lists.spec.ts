import { type APIRequestContext, expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/**
 * Journey 4: create a list, add books, reorder them with the keyboard alone and find the new
 * order after reloading (docs/testes-e-qualidade.md).
 *
 * Every name carries the time of the attempt, so a retry on the same server never meets the
 * list or the books of the attempt before it.
 */
const WRITE = { 'X-Requested-By': 'minha-livraria' };

async function createBooks(request: APIRequestContext, prefix: string, titles: readonly string[]) {
  const author = await request.post('/api/v1/authors', {
    headers: WRITE,
    data: { name: `Autora ${prefix}` },
  });
  expect(author.ok()).toBe(true);
  const { id: authorId } = (await author.json()) as { id: number };
  for (const title of titles) {
    const book = await request.post('/api/v1/books', {
      headers: WRITE,
      data: { title: `${title} ${prefix}`, authorIds: [authorId], pageCount: 200 },
    });
    expect(book.ok()).toBe(true);
  }
}

test('builds a list and reorders it without the mouse', async ({ page }) => {
  const run = String(Date.now());
  await createBooks(page.request, run, ['Alfa', 'Beta', 'Gama']);
  const name = `Para as férias ${run}`;

  // A new list opens right away, empty.
  await page.goto('/listas');
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel(/Descrição/).fill('Leituras leves.');
  await page.getByRole('button', { name: 'Criar lista' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Esta lista está vazia' })).toBeVisible();

  // Books come from the shelf, each one at the end of the list.
  const search = page.getByLabel('Buscar na estante');
  await search.fill(run);
  for (const title of ['Alfa', 'Beta', 'Gama']) {
    await page.getByRole('button', { name: `Adicionar ${title} ${run} à lista` }).click();
    await expect(page.getByRole('status')).toHaveText(`${title} ${run} entrou na lista.`);
  }
  await expect(page.getByText('Já está na lista')).toHaveCount(3);
  const books = page.locator('ol.books a.title');
  await expect(books).toHaveText([`Alfa ${run}`, `Beta ${run}`, `Gama ${run}`]);
  await expect(page.getByText('0 lidos de 3')).toBeVisible();

  // Gama goes to the top by the keyboard alone: Tab to its button, then Enter twice.
  const up = page.getByRole('button', { name: `Mover Gama ${run} para cima` });
  await up.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(`Gama ${run} agora é o 2º de 3.`);
  await expect(up).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(`Gama ${run} agora é o 1º de 3.`);
  await expect(page.getByRole('button', { name: `Mover Gama ${run} para baixo` })).toBeFocused();
  await expect(books).toHaveText([`Gama ${run}`, `Alfa ${run}`, `Beta ${run}`]);

  // The order was saved: it is the same after reloading.
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(books).toHaveText([`Gama ${run}`, `Alfa ${run}`, `Beta ${run}`]);

  // The card on /listas and the tab on /catalogos show the list.
  await page.goto('/listas');
  await expect(page.getByRole('link', { name })).toBeVisible();
  await page.goto('/catalogos?tipo=listas');
  await expect(page.getByRole('link', { name })).toBeVisible();
});

test('refuses a second list with the same name', async ({ page }) => {
  const name = `Clássicos ${Date.now()}`;
  const created = await page.request.post('/api/v1/lists', { headers: WRITE, data: { name } });
  expect(created.ok()).toBe(true);

  await page.goto('/listas');
  await page.getByLabel('Nome').fill(name.toUpperCase());
  await page.getByRole('button', { name: 'Criar lista' }).click();

  await expect(page.getByRole('alert')).toContainText('Já existe uma lista com este nome.');
  await expect(page.getByLabel('Nome')).toHaveValue(name.toUpperCase());
});

for (const theme of THEMES) {
  test(`lists have no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);
    const run = `${theme} ${Date.now()}`;
    await createBooks(page.request, run, ['Delta', 'Épsilon']);
    const list = await page.request.post('/api/v1/lists', {
      headers: WRITE,
      data: { name: `Acessível ${run}`, description: 'Uma descrição.' },
    });
    const { id } = (await list.json()) as { id: number };

    await page.goto('/listas');
    await expect(page.getByRole('link', { name: `Acessível ${run}` })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.goto(`/listas/${id}`);
    await page.getByLabel('Buscar na estante').fill(run);
    await page.getByRole('button', { name: `Adicionar Delta ${run} à lista` }).click();
    await page.getByRole('button', { name: `Adicionar Épsilon ${run} à lista` }).click();
    await expect(page.locator('ol.books a.title')).toHaveCount(2);
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);
  });
}
