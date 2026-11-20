import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

/**
 * The goals part of journey 3: a goal is turned on in Configurações → Metas, a reading is
 * finished and the goal moves (docs/testes-e-qualidade.md). The Home shows it too, among Minhas
 * metas.
 *
 * Other tests finish readings on the same server, so the test compares the count before and
 * after its own reading instead of expecting a fixed number. A goal of the same type and month
 * left by an earlier attempt is deleted first; each test uses a goal of its own.
 */
const WRITE = { 'X-Requested-By': 'minha-livraria' };

interface Goal {
  readonly id: number;
  readonly type: string;
  readonly period: string;
  readonly month?: number | null;
  readonly target: number;
  readonly current: number;
  readonly enabled: boolean;
}

async function goalsOfThisYear(request: APIRequestContext): Promise<Goal[]> {
  const response = await request.get(`/api/v1/goals?year=${YEAR}`);
  return (await response.json()) as Goal[];
}

async function monthlyBooks(request: APIRequestContext): Promise<Goal | undefined> {
  return (await goalsOfThisYear(request)).find(
    (goal) => goal.type === 'BOOKS' && goal.period === 'MONTH' && goal.month === MONTH,
  );
}

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;
const MONTH_NAME = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);
const MONTHLY = `Meta de ${MONTH_NAME}`;

async function deleteGoalOfThisMonth(request: APIRequestContext, type: string) {
  const goals = await goalsOfThisYear(request);
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

const card = (page: Page, name: string) => page.getByRole('article', { name });

test('a finished reading moves the goal of the month', async ({ page }) => {
  await deleteGoalOfThisMonth(page.request, 'BOOKS');
  const bookId = await createBook(page.request, `Livro da Meta ${Date.now()}`);

  // The goal of the month is turned on with five books, in Configurações → Metas.
  await page.goto('/configuracoes?aba=metas');
  const monthly = card(page, MONTHLY);
  await expect(monthly.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await monthly.getByRole('switch').click();
  await monthly.getByLabel('Quantos livros no mês').fill('5');
  await page.getByRole('button', { name: 'Salvar metas' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Metas salvas. A Home já mostra os novos valores.',
  );
  const before = (await monthlyBooks(page.request))?.current ?? 0;
  expect((await monthlyBooks(page.request))?.target).toBe(5);

  // A target out of the limits is refused.
  await monthly.getByLabel('Quantos livros no mês').fill('0');
  await page.getByRole('button', { name: 'Salvar metas' }).click();
  await expect(monthly.getByRole('alert')).toHaveText('Use um número inteiro de 1 a 999.');
  await page.getByRole('button', { name: 'Descartar alterações' }).click();
  await expect(monthly.getByLabel('Quantos livros no mês')).toHaveValue('5');

  // The reading is finished on its page, the way a person does it.
  await page.goto(`/livro/${bookId}/leitura`);
  await page.getByRole('button', { name: 'Começar leitura' }).click();
  // The day it ends starts as today once the reading is on screen.
  await expect(page.getByLabel('Dia do término')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Concluir leitura' }).click();
  await expect(page).toHaveURL(new RegExp(`/livro/${bookId}$`));

  // The goal counts this book. At least: tests running beside this one may finish readings of
  // their own in the same month.
  expect((await monthlyBooks(page.request))?.current).toBeGreaterThanOrEqual(before + 1);

  // The Home shows the same goal among Minhas metas.
  await page.goto('/');
  const home = page.getByRole('region', { name: 'Minhas metas' });
  await expect(home.getByRole('article', { name: `Livros em ${MONTH_NAME}` })).toBeVisible();
});

test('a goal turned off leaves the Home and keeps its target', async ({ page }) => {
  const pages = (await goalsOfThisYear(page.request)).find(
    (goal) => goal.type === 'PAGES' && goal.period === 'YEAR',
  );
  if (pages) {
    await page.request.put(`/api/v1/goals/${pages.id}`, {
      headers: WRITE,
      data: { target: 4000, enabled: true },
    });
  } else {
    await page.request.post('/api/v1/goals', {
      headers: WRITE,
      data: { type: 'PAGES', period: 'YEAR', year: YEAR, target: 4000 },
    });
  }

  await page.goto('/configuracoes?aba=metas');
  const yearly = card(page, 'Páginas no ano');
  await expect(yearly.getByLabel('Quantas páginas no ano')).toHaveValue('4000');
  await yearly.getByRole('switch').click();
  await expect(yearly.getByText('Meta desligada: não aparece na Home.')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar metas' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Metas salvas. A Home já mostra os novos valores.',
  );

  const saved = (await goalsOfThisYear(page.request)).find(
    (goal) => goal.type === 'PAGES' && goal.period === 'YEAR',
  );
  expect(saved).toMatchObject({ enabled: false, target: 4000 });
  await page.goto('/');
  const home = page.getByRole('region', { name: 'Minhas metas' });
  await expect(home).toBeVisible();
  await expect(home.getByRole('article', { name: `Páginas em ${YEAR}` })).toHaveCount(0);
});

test('the old address of the goals opens their tab', async ({ page }) => {
  await page.goto('/metas');

  await expect(page).toHaveURL(/\/configuracoes\?aba=metas$/);
  await expect(page.getByRole('tab', { name: 'Metas' })).toHaveAttribute('aria-selected', 'true');
});
