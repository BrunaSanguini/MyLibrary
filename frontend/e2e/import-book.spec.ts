import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/**
 * Journey 2: import a book from the Open Library (docs/testes-e-qualidade.md).
 *
 * The Open Library is a WireMock with the stubs of e2e/open-library, started by Playwright next
 * to the app. Against an app that is already running (E2E_BASE_URL) the Open Library would be
 * the real one, so these tests are skipped there.
 */
test.skip(
  Boolean(process.env['E2E_BASE_URL']),
  'needs the simulated Open Library that Playwright starts with the jar',
);

const HOBBIT_EDITION = 'OL29823759M';

/**
 * A retry reuses the same server, where the first attempt may already have imported the book.
 * Taking it out first lets every attempt start from "not in the collection yet".
 */
async function forgetTheHobbit(page: Page): Promise<void> {
  const preview = await page.request.get(
    `/api/v1/books/import/preview?editionKey=${HOBBIT_EDITION}`,
  );
  const { libraryBookId } = (await preview.json()) as { libraryBookId?: number | null };
  if (libraryBookId) {
    await page.request.delete(`/api/v1/books/${libraryBookId}`, {
      headers: { 'X-Requested-By': 'minha-livraria' },
    });
  }
}

// The tests share one book of the simulated Open Library, so they run one after the other.
test.describe.configure({ mode: 'serial' });

test('imports a book from the Open Library and finds it on the shelf', async ({ page }) => {
  await forgetTheHobbit(page);

  await page.goto('/estante');
  await page.getByRole('link', { name: 'Importar livro' }).click();
  await expect(page.getByRole('heading', { name: 'Importar livro', level: 1 })).toBeVisible();

  // Searching by title lists the editions the Open Library found.
  const search = page.getByRole('searchbox', { name: 'Título, autor ou ISBN' });
  await search.fill('hobbit');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/livros\/importar\?q=hobbit$/);
  await expect(page.getByRole('heading', { name: 'Resultados', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O Hobbit', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Hobbit', level: 3 })).toBeVisible();

  // The preview shows what will be saved, and the focus follows to it.
  await page.getByRole('link', { name: 'Ver detalhes de O Hobbit' }).click();
  const previewTitle = page.getByRole('heading', { name: 'O Hobbit', level: 2 });
  await expect(previewTitle).toBeFocused();
  const preview = page.getByRole('article');
  await expect(preview).toContainText('J.R.R. Tolkien');
  await expect(preview).toContainText('Harper Collins');
  await expect(preview).toContainText('336');
  await expect(preview).toContainText('9788595084742');

  // Classifying is optional and happens in the same step as the confirmation.
  await page.getByLabel('Este livro').selectOption('OWNED');
  await page.getByRole('button', { name: 'Importar livro' }).click();

  // The import lands on the page of the new book, with the cover downloaded to the app.
  await expect(page).toHaveURL(/\/livros\/\d+$/);
  await expect(page.getByRole('heading', { name: 'O Hobbit', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'J.R.R. Tolkien' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tenho este livro' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const cover = await page.request.get(
    await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>('img[src^="/api/v1/images/"]');
      return image?.getAttribute('src') ?? '/sem-capa';
    }),
  );
  expect(cover.headers()['content-type']).toBe('image/jpeg');

  // And it is on the shelf.
  await page.goto('/estante?q=hobbit');
  await expect(page.getByRole('link', { name: /O Hobbit/ })).toHaveCount(1);
});

test('says the book is already on the shelf instead of importing it twice', async ({ page }) => {
  // By title, the result points to the book of the collection.
  await page.goto('/livros/importar?q=hobbit');
  const results = page.getByRole('list').filter({ hasText: 'The Hobbit' });
  await expect(results.getByText('Já está na sua estante')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver detalhes de O Hobbit' })).toHaveCount(0);

  // By ISBN, the search goes straight to the edition and offers the book, not the import.
  const search = page.getByRole('searchbox', { name: 'Título, autor ou ISBN' });
  await search.fill('978-85-9508-474-2');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: 'O Hobbit', level: 2 })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Já está na sua estante');
  await expect(page.getByRole('button', { name: 'Importar livro' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Abrir o livro' }).click();
  await expect(page.getByRole('heading', { name: 'O Hobbit', level: 1 })).toBeVisible();
});

test('points to the manual form when there is no connection to the Open Library', async ({
  page,
}) => {
  await page.goto('/livros/importar');
  const search = page.getByRole('searchbox', { name: 'Título, autor ou ISBN' });
  await search.fill('sem conexao');
  await search.press('Enter');

  const failure = page.getByRole('alert');
  await expect(failure).toContainText('Não foi possível buscar na Open Library');
  await expect(failure).toContainText(
    'Sem conexão com a Open Library. O cadastro manual continua disponível.',
  );

  await failure.getByRole('link', { name: 'Cadastrar manualmente' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastrar livro', level: 1 })).toBeVisible();
});

test('says so when the Open Library takes too long to answer', async ({ page }) => {
  await page.goto('/livros/importar?q=lenta');

  // The app waits, tries again twice and only then gives up, which takes a few seconds.
  await expect(page.getByRole('status')).toContainText('Buscando na Open Library');
  const failure = page.getByRole('alert');
  await expect(failure).toContainText('A Open Library não respondeu a tempo.', {
    timeout: 20_000,
  });
  await expect(failure.getByRole('link', { name: 'Cadastrar manualmente' })).toBeVisible();
  await expect(failure.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
});

test('finds nothing and offers the manual form', async ({ page }) => {
  await page.goto('/livros/importar?q=um livro que ninguem escreveu');

  await expect(page.getByRole('heading', { name: 'Nenhum livro encontrado' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cadastrar manualmente' })).toBeVisible();
});

for (const theme of THEMES) {
  test(`import page has no WCAG 2.1 AA violations in ${theme} theme`, async ({ page }) => {
    await useTheme(page, theme);

    await page.goto('/livros/importar');
    await expect(page.getByRole('heading', { name: 'O que você quer importar?' })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.goto('/livros/importar?q=hobbit');
    await expect(page.getByRole('heading', { name: 'Resultados', level: 2 })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // The other edition is never imported, so its preview always shows the classification form.
    await page.goto('/livros/importar?q=hobbit&edicao=OL7604539M');
    await expect(page.getByRole('heading', { name: 'The Hobbit', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar livro' })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.goto('/livros/importar?q=sem conexao');
    await expect(page.getByRole('alert')).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
}
