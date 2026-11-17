import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import path from 'node:path';

/**
 * The pictures of the README, taken from the real app with the sample collection. Not a test:
 * it runs only with README_SCREENSHOTS=1, alone, on a fresh server (`npm run readme:screenshots`).
 *
 * The sample collection has only books, so this adds what a person would have after a few
 * months: readings with their days, reviews, a book in progress, a list and goals.
 */
test.skip(!process.env['README_SCREENSHOTS'], 'Only to update the pictures of the README.');
test.describe.configure({ mode: 'serial' });

const OUT = path.resolve(__dirname, '../../docs/images');
const WRITE = { 'X-Requested-By': 'minha-livraria' };

interface Book {
  readonly id: number;
  readonly title: string;
}

function daysAgo(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() - days);
  const month = String(day.getMonth() + 1).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, '0')}`;
}

async function send(
  request: APIRequestContext,
  method: 'post' | 'put',
  url: string,
  data?: object,
) {
  const response = await request[method](url, { headers: WRITE, data });
  expect(response.ok(), `${method} ${url}: ${await response.text()}`).toBe(true);
  return response.status() === 204 ? undefined : ((await response.json()) as { id: number });
}

/** A reading from `start` days ago, with a session every few days, finished `end` days ago. */
async function read(
  request: APIRequestContext,
  book: Book,
  start: number,
  end: number | undefined,
  pagesPerDay: number,
) {
  const reading = await send(request, 'post', `/api/v1/books/${book.id}/readings`, {
    status: 'IN_PROGRESS',
    startDate: daysAgo(start),
  });
  const last = end ?? 0;
  for (let day = start; day >= last; day -= day % 3 === 0 ? 2 : 1) {
    await send(request, 'post', `/api/v1/readings/${reading?.id}/sessions`, {
      date: daysAgo(day),
      pagesRead: pagesPerDay + (day % 5) * 2,
    });
  }
  if (end !== undefined) {
    await send(request, 'post', `/api/v1/readings/${reading?.id}/finish`, {
      endDate: daysAgo(end),
    });
  }
}

async function seed(request: APIRequestContext): Promise<void> {
  const shelf = await request.get('/api/v1/shelf/books?size=50');
  const books = ((await shelf.json()) as { content: Book[] }).content;
  const book = (title: string) => {
    const found = books.find((candidate) => candidate.title === title);
    if (!found) throw new Error(`Sample book not found: ${title}`);
    return found;
  };
  const bras = book('Memórias Póstumas de Brás Cubas');
  const casmurro = book('Dom Casmurro');
  const cortico = book('O Cortiço');
  const iracema = book('Iracema');
  const quincas = book('Quincas Borba');
  const guarani = book('O Guarani');

  // Fewer pages per day than each book has, so no session goes past the last page.
  await read(request, bras, 150, 118, 10);
  await read(request, cortico, 110, 84, 8);
  await read(request, iracema, 75, 66, 14);
  await read(request, casmurro, 58, 31, 10);
  await read(request, quincas, 24, undefined, 10);

  for (const [favorite, rating, content] of [
    [
      casmurro,
      5,
      'Capitu continua um mistério a cada releitura. A narração de Bento é tão parcial que o livro vira um jogo de desconfiança com quem lê.',
    ],
    [
      bras,
      4.5,
      'Um defunto autor que ri de si mesmo e de todo mundo. Os capítulos curtos e as digressões fazem o livro parecer escrito ontem.',
    ],
    [cortico, 4, 'O cortiço como personagem principal: barulhento, vivo e cruel.'],
    [iracema, 3.5, 'A prosa poética é bonita, mas o ritmo cansa um pouco no meio.'],
  ] as const) {
    await send(request, 'put', `/api/v1/books/${favorite.id}/review`, { rating, content });
  }
  await send(request, 'put', `/api/v1/books/${cortico.id}/favorite`);

  const list = await send(request, 'post', '/api/v1/lists', {
    name: 'Clássicos para reler',
    description: 'Os que merecem uma segunda leitura com calma.',
  });
  for (const item of [casmurro, bras, guarani]) {
    await send(request, 'put', `/api/v1/lists/${list?.id}/books/${item.id}`);
  }
  const year = new Date().getFullYear();
  await send(request, 'post', '/api/v1/goals', { type: 'BOOKS', period: 'YEAR', year, target: 12 });
  await send(request, 'post', '/api/v1/goals', {
    type: 'PAGES',
    period: 'YEAR',
    year,
    target: 3000,
  });
  await send(request, 'put', '/api/v1/profile', { displayName: 'Ana', theme: 'LIGHT' });
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.mouse.move(0, 0);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

test('takes the pictures of the README', async ({ page, request }) => {
  test.setTimeout(180_000);
  await seed(request);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible();
  await shoot(page, 'home');

  await page.getByRole('heading', { name: 'Minhas metas' }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300);
  await expect(page.getByRole('heading', { name: 'Lendo agora' })).toBeVisible();
  await page.waitForTimeout(500);
  await shoot(page, 'home-metas');

  await page.goto('/estante');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dom Casmurro' }).first()).toBeVisible();
  await shoot(page, 'estante');

  await page.goto('/estante');
  await page.getByRole('link', { name: 'Dom Casmurro' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dom Casmurro' })).toBeVisible();
  await shoot(page, 'livro');

  await send(request, 'put', '/api/v1/profile', { displayName: 'Ana', theme: 'DARK' });
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Sua leitura' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shoot(page, 'perfil');
});
