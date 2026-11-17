import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/**
 * The goals part of journey 3: a goal is created, a reading is finished and the goal moves
 * (docs/testes-e-qualidade.md). The Home that will also show it arrives with Marco 5.
 *
 * Other tests finish readings on the same server, so the test compares the count before and
 * after its own reading instead of expecting a fixed number. A goal of the same type and month
 * left by an earlier attempt is deleted first; each test uses a type of its own.
 */
const WRITE = { 'X-Requested-By': 'minha-livraria' };

interface Goal {
  readonly id: number;
  readonly type: string;
  readonly period: string;
  readonly month?: number | null;
}

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;
const MONTH_NAME = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);

async function deleteGoalOfThisMonth(request: APIRequestContext, type: string) {
  const response = await request.get(`/api/v1/goals?year=${YEAR}`);
  const goals = (await response.json()) as Goal[];
  for (const goal of goals.filter(
    (goal) => goal.type === type && goal.period === 'MONTH' && goal.month === MONTH,
  )) {
    await request.delete(`/api/v1/goals/${goal.id}`, { headers: WRITE });
  }
}

async function createBook(request: APIRequestContext, title: string) {
  const author = await request.post('/api/v1/authors', {
    headers: WRITE,
    data: { name: `Autora de ${title}` },
  });
  const { id: authorId } = (await author.json()) as { id: number };
  const book = await request.post('/api/v1/books', {
    headers: WRITE,
    data: { title, authorIds: [authorId], pageCount: 180 },
  });
  expect(book.ok()).toBe(true);
  return ((await book.json()) as { id: number }).id;
}

const card = (page: Page) => page.getByRole('article', { name: `Livros em ${MONTH_NAME}` });

/** The first number of `3 de 5 livros`. */
async function booksReadIn(page: Page, target: number): Promise<number> {
  const text = await card(page)
    .getByText(new RegExp(` de ${target} livros$`))
    .textContent();
  return Number(text?.split(' ')[0]);
}

test('a finished reading moves the goal of the month', async ({ page }) => {
  await deleteGoalOfThisMonth(page.request, 'BOOKS');
  const bookId = await createBook(page.request, `Livro da Meta ${Date.now()}`);

  // A goal of five books this month, created on /metas.
  await page.goto('/metas');
  await expect(page.getByRole('heading', { name: `Nova meta para ${YEAR}` })).toBeVisible();
  await page.getByLabel('O que contar').selectOption('BOOKS');
  await page.getByRole('radio', { name: 'Um mês' }).check();
  await page.getByLabel('Mês').selectOption(String(MONTH));
  await page.getByLabel('Quantos livros?').fill('5');
  await page.getByRole('button', { name: 'Criar meta' }).click();
  await expect(page.getByRole('status')).toHaveText('Meta criada.');
  await expect(card(page)).toBeVisible();
  const before = await booksReadIn(page, 5);

  // A second goal of the same type and month is refused.
  await page.getByLabel('Quantos livros?').fill('8');
  await page.getByRole('button', { name: 'Criar meta' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Já existe uma meta deste tipo para este período.',
  );

  // The reading is finished on its page, the way a person does it.
  await page.goto(`/livros/${bookId}/leitura`);
  await page.getByRole('button', { name: 'Começar leitura' }).click();
  await page.getByRole('button', { name: 'Concluir leitura' }).click();
  await expect(page).toHaveURL(new RegExp(`/livros/${bookId}$`));

  // Back on /metas, the goal counts this book. At least: tests running beside this one may
  // finish readings of their own in the same month.
  await page.goto('/metas');
  await expect(card(page)).toBeVisible();
  expect(await booksReadIn(page, 5)).toBeGreaterThanOrEqual(before + 1);

  // The target changes on the card.
  await card(page)
    .getByRole('button', { name: /Alterar a meta/ })
    .click();
  await page.getByLabel('Nova meta').fill('6');
  await card(page).getByRole('button', { name: 'Salvar' }).click();
  await expect(card(page).getByText(/ de 6 livros$/)).toBeVisible();
});

test('rereads are only offered for the whole year', async ({ page }) => {
  await page.goto('/metas');

  await page.getByRole('radio', { name: 'Um mês' }).check();
  await page.getByLabel('O que contar').selectOption('REREADS');

  await expect(page.getByRole('radio', { name: 'Um mês' })).toHaveCount(0);
  await expect(page.getByText('As releituras são contadas pelo ano inteiro.')).toBeVisible();
});

for (const theme of THEMES) {
  test(`goals have no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);
    await deleteGoalOfThisMonth(page.request, 'PAGES');
    await page.request.post('/api/v1/goals', {
      headers: WRITE,
      data: { type: 'PAGES', period: 'MONTH', year: YEAR, month: MONTH, target: 600 },
    });

    await page.goto('/metas');
    await expect(page.getByRole('article', { name: `Páginas em ${MONTH_NAME}` })).toBeVisible();
    await page.getByRole('button', { name: 'Criar meta' }).click();
    await expect(page.getByText('Informe o número da meta.')).toBeVisible();
    await page.mouse.move(0, 0);
    await expectNoAccessibilityViolations(page);
  });
}
