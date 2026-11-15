import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/**
 * Journey 3: start a reading, register sessions and finish it, then rate the book
 * (docs/testes-e-qualidade.md). The part about the goals on the Home arrives with Marco 4.
 *
 * Each test creates its own book through the API, with a title of its own: a retry reuses the
 * same server, where the first attempt may have left a reading behind.
 */
const WRITE = { 'X-Requested-By': 'minha-livraria' };

/** The local day, as the app calculates it. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

async function createBook(request: APIRequestContext, title: string, pageCount: number) {
  const author = await request.post('/api/v1/authors', {
    headers: WRITE,
    data: { name: `Autora de ${title}` },
  });
  expect(author.ok()).toBe(true);
  const { id: authorId } = (await author.json()) as { id: number };
  const book = await request.post('/api/v1/books', {
    headers: WRITE,
    data: { title, authorIds: [authorId], pageCount },
  });
  expect(book.ok()).toBe(true);
  return ((await book.json()) as { id: number }).id;
}

const ring = (page: Page) => page.getByRole('progressbar', { name: 'Progresso de leitura' });

test('reads a book from the first page to the review', async ({ page }) => {
  const title = `Jornada de Leitura ${Date.now()}`;
  const bookId = await createBook(page.request, title, 400);

  // A book never read wants to be read.
  await page.goto(`/livros/${bookId}`);
  const sheet = page.getByRole('region', { name: 'Ficha de leitura' });
  await expect(sheet).toContainText('Quero ler');
  await sheet.getByRole('link', { name: 'Começar a ler' }).click();

  // Starting the reading opens the page that follows it.
  await expect(page).toHaveURL(new RegExp(`/livros/${bookId}/leitura$`));
  await expect(page.getByRole('heading', { name: 'Nova leitura' })).toBeVisible();
  await page.getByRole('button', { name: 'Começar leitura' }).click();
  await expect(ring(page)).toHaveAttribute('aria-valuenow', '0');

  // A session in pages read, with the shortcuts: the ring, the week and the forecast follow.
  await page.getByRole('button', { name: 'Somar 50 páginas' }).click();
  await page.getByRole('button', { name: 'Somar 50 páginas' }).click();
  await expect(page.getByLabel('Quantas páginas você leu?')).toHaveValue('100');
  await page.getByLabel(/Anotação/).fill('Primeiros capítulos.');
  await page.getByRole('button', { name: 'Salvar sessão' }).click();

  await expect(ring(page)).toHaveAttribute('aria-valuenow', '25');
  const progress = page.getByRole('region', { name: 'Progresso' });
  await expect(progress).toContainText('100 de 400 páginas');
  await expect(progress).toContainText('No ritmo de 100 páginas por dia, faltam 300 páginas.');
  const week = page.getByRole('region', { name: 'Esta semana' });
  await expect(week.locator('[aria-current="date"]')).toHaveAccessibleName(/: 100 páginas$/);
  await expect(page.getByLabel('Quantas páginas você leu?')).toHaveValue('');

  // A session by the page the reader stopped at is converted into pages read.
  await page.getByRole('radio', { name: 'Página atual' }).check();
  await page.getByLabel('Em que página você está?').fill('250');
  await page.getByRole('button', { name: 'Salvar sessão' }).click();

  await expect(ring(page)).toHaveAttribute('aria-valuenow', '62');
  await expect(week.locator('[aria-current="date"]')).toHaveAccessibleName(/: 250 páginas$/);
  const sessions = page.getByRole('region', { name: 'Sessões registradas' });
  await expect(sessions.getByRole('listitem')).toHaveCount(2);
  await expect(sessions).toContainText('150 páginas');
  await expect(sessions).toContainText('Primeiros capítulos.');

  // Finishing goes back to the book, now read.
  await page.getByRole('button', { name: 'Concluir leitura' }).click();
  await expect(page).toHaveURL(new RegExp(`/livros/${bookId}$`));
  await expect(sheet).toContainText('Lido');
  await expect(sheet.getByRole('link', { name: 'Registrar leitura' })).toBeVisible();

  // The rating, by the keyboard alone: End is five stars, one arrow back is four and a half.
  await page.getByRole('button', { name: 'Escrever resenha' }).click();
  const stars = page.getByRole('slider', { name: 'Nota' });
  await stars.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await expect(stars).toHaveAttribute('aria-valuetext', '4,5 de 5 estrelas');
  await page.getByLabel('O que você achou?').fill('Valeu cada página.');
  await page.getByRole('button', { name: 'Salvar resenha' }).click();

  const review = page.getByRole('region', { name: 'Minha resenha' });
  await expect(review).toContainText('Valeu cada página.');
  await expect(review.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeVisible();
  await expect(sheet.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeVisible();

  // And the shelf shows the book as read, with its rating.
  await page.goto(`/estante?status=READ&q=${encodeURIComponent(title)}`);
  const card = page.getByRole('link', { name: new RegExp(title) });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Lido');
  await expect(card.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lidos' })).toHaveAttribute('aria-pressed', 'true');
});

test('refuses what the book does not have and keeps what was typed', async ({ page }) => {
  const bookId = await createBook(page.request, `Livro Curto ${Date.now()}`, 120);
  await page.request.post(`/api/v1/books/${bookId}/readings`, {
    headers: WRITE,
    data: { status: 'IN_PROGRESS', startDate: today() },
  });

  await page.goto(`/livros/${bookId}/leitura`);
  await page.getByLabel('Quantas páginas você leu?').fill('121');
  await page.getByRole('button', { name: 'Salvar sessão' }).click();

  await expect(page.getByText('Faltam 120 páginas para o fim do livro.')).toBeVisible();
  await expect(page.getByLabel('Quantas páginas você leu?')).toHaveValue('121');
  await expect(ring(page)).toHaveAttribute('aria-valuenow', '0');
});

for (const theme of THEMES) {
  test(`reading and review have no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);
    const bookId = await createBook(page.request, `Acessível ${theme} ${Date.now()}`, 300);

    // The form that starts a reading.
    await page.goto(`/livros/${bookId}/leitura`);
    await expect(page.getByRole('heading', { name: 'Nova leitura' })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // A reading in progress, with a session and a validation message on screen.
    const reading = await page.request.post(`/api/v1/books/${bookId}/readings`, {
      headers: WRITE,
      data: { status: 'IN_PROGRESS', startDate: today() },
    });
    const { id: readingId } = (await reading.json()) as { id: number };
    await page.request.post(`/api/v1/readings/${readingId}/sessions`, {
      headers: WRITE,
      data: { date: today(), pagesRead: 75, note: 'Uma anotação.' },
    });
    await page.goto(`/livros/${bookId}/leitura`);
    await expect(ring(page)).toHaveAttribute('aria-valuenow', '25');
    await page.getByRole('button', { name: 'Salvar sessão' }).click();
    await expect(page.getByText('Informe quantas páginas você leu.')).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // The book page with the reading sheet, and the review being written.
    await page.goto(`/livros/${bookId}`);
    await expect(page.getByRole('region', { name: 'Ficha de leitura' })).toContainText('Lendo');
    await page.getByRole('button', { name: 'Escrever resenha' }).click();
    await page.getByRole('slider', { name: 'Nota' }).focus();
    await page.keyboard.press('End');
    await expectNoAccessibilityViolations(page);

    // The shelf filtered by status, with the progress on the card.
    await page.goto('/estante?status=READING');
    await expect(page.getByRole('button', { name: 'Lendo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expectNoAccessibilityViolations(page);
  });
}
