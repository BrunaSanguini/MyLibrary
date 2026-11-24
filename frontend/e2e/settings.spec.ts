import { type APIRequestContext, expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/**
 * Configurações: the catalogs created and deleted by hand, the books featured on the Home with
 * their own image, and every tab without WCAG 2.1 AA violations.
 *
 * Every name carries the time of the attempt, so a retry never meets what the attempt before it
 * left on the server.
 */
const WRITE = { 'X-Requested-By': 'minha-livraria' };

/** A real 1×1 PNG: the API checks the first bytes of the file, not its name. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function createOwnedBook(request: APIRequestContext, title: string): Promise<number> {
  const author = await request.post('/api/v1/authors', {
    headers: WRITE,
    data: { name: `Autora de ${title}` },
  });
  const { id: authorId } = (await author.json()) as { id: number };
  const book = await request.post('/api/v1/books', {
    headers: WRITE,
    data: { title, authorIds: [authorId], pageCount: 200, ownership: 'OWNED' },
  });
  expect(book.ok()).toBe(true);
  return ((await book.json()) as { id: number }).id;
}

test('creates a genre, refuses it twice and deletes it', async ({ page }) => {
  const name = `Gênero ${Date.now()}`;

  await page.goto('/configuracoes');
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.getByLabel('Nome do gênero').fill(name);
  await page.getByRole('button', { name: 'Criar gênero' }).click();
  await expect(page.getByRole('status')).toContainText(`Gênero “${name}” criado.`);
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // The same name, in capitals, is the same genre.
  await page.getByLabel('Nome do gênero').fill(name.toUpperCase());
  await page.getByRole('button', { name: 'Criar gênero' }).click();
  await expect(page.getByRole('alert')).toContainText('Já existe um gênero chamado');

  await page.getByLabel('Filtrar gêneros').fill(name);
  await expect(page.getByText('1 encontrado')).toBeVisible();
  await page.getByRole('button', { name: `Excluir ${name}` }).click();
  const dialog = page.getByRole('dialog', { name: `Excluir o gênero “${name}”?` });
  await dialog.getByRole('button', { name: 'Excluir gênero' }).click();
  await expect(page.getByRole('status')).toContainText(`Gênero “${name}” excluído.`);
  await expect(page.getByText(`Nada encontrado para “${name}”.`)).toBeVisible();
});

test('features a book on the Home, with the image sent for it', async ({ page }) => {
  const title = `Vitrine ${Date.now()}`;
  const bookId = await createOwnedBook(page.request, title);
  // One slot, without image yet: whatever an earlier attempt left goes away.
  const reset = await page.request.put('/api/v1/featured', {
    headers: WRITE,
    data: { slots: [{ bookId }] },
  });
  expect(reset.ok()).toBe(true);

  await page.goto('/configuracoes?aba=destaques');
  await expect(page.getByText('Falta a imagem deste destaque')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar destaques' }).click();
  await expect(page.getByRole('alert')).toHaveText('Falta 1 imagem para salvar os destaques.');

  await page.getByLabel('Trocar imagem do destaque I').setInputFiles({
    name: 'vitrine.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(page.getByRole('img', { name: `Imagem do destaque ${title}` })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar destaques' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Destaques salvos. A Home agora mostra 1 livro, sem setas.',
  );

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
});

for (const theme of THEMES) {
  test(`settings have no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);

    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { name: 'Gêneros' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar gênero' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);

    await page.getByRole('tab', { name: 'Destaques da Home' }).click();
    await expect(page.getByRole('heading', { name: 'Livros em destaque na Home' })).toBeVisible();
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);

    await page.getByRole('tab', { name: 'Metas' }).click();
    await expect(page.getByRole('heading', { name: 'Suas metas de leitura' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Meta anual' })).toBeVisible();
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);
  });
}
