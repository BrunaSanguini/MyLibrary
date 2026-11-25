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

/** The search block of the form, which only asks the Open Library on Buscar. */
async function searchOpenLibrary(page: Page, term: string): Promise<void> {
  const search = page.getByRole('searchbox', { name: 'Buscar na Open Library' });
  await search.fill(term);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
}

test('fills the form from the Open Library, imports on save and finds it on the shelf', async ({
  page,
}) => {
  await forgetTheHobbit(page);

  await page.goto('/estante');
  await page.getByRole('link', { name: 'Adicionar livro' }).first().click();
  await expect(page.getByRole('heading', { name: 'Adicionar livro', level: 1 })).toBeVisible();

  // Searching by title lists the editions the Open Library found.
  await searchOpenLibrary(page, 'hobbit');
  const results = page.getByRole('list', { name: 'Resultados da Open Library' });
  await expect(results).toContainText('O Hobbit');
  await expect(results).toContainText('The Hobbit');

  // Using an edition fills section I and the cover; nothing is saved yet.
  await page.getByRole('button', { name: 'Usar estes dados: O Hobbit' }).click();
  await expect(page.getByLabel('Título *')).toHaveValue('O Hobbit');
  await expect(page.getByRole('list', { name: 'Autores escolhidos' })).toContainText(
    'J.R.R. Tolkien',
  );
  await expect(page.getByRole('list', { name: 'Editora escolhida' })).toContainText(
    'Harper Collins',
  );
  await expect(page.getByLabel('Páginas')).toHaveValue('336');
  await expect(page.getByLabel('ISBN · opcional')).toHaveValue('9788595084742');
  await expect(page.getByText(/Capa trazida da Open Library/)).toBeVisible();

  // The fields stay editable, and saving keeps what the reader changed.
  await page.getByLabel('Ano').fill('2019');
  await page.getByRole('button', { name: 'Salvar livro' }).click();
  await expect(page.getByRole('heading', { name: 'Livro salvo na sua estante' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver o livro' }).click();

  // The book has the cover downloaded to the app, and the seal of a book that is the reader's.
  await expect(page).toHaveURL(/\/livro\/\d+$/);
  await expect(page.getByRole('heading', { name: 'O Hobbit', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'J.R.R. Tolkien' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tenho este livro' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('Capa via Open Library')).toBeVisible();
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
  // The old address of the import opens the form, with the search in its field.
  await page.goto('/estante/importar?q=hobbit');
  await expect(page).toHaveURL(/\/estante\/novo\?q=hobbit$/);
  await expect(page.getByRole('searchbox', { name: 'Buscar na Open Library' })).toHaveValue(
    'hobbit',
  );
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const results = page.getByRole('list', { name: 'Resultados da Open Library' });
  await expect(results.getByRole('link', { name: 'Já está na sua estante' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar estes dados: O Hobbit' })).toHaveCount(0);

  // By ISBN, the search goes straight to the edition.
  await searchOpenLibrary(page, '978-85-9508-474-2');
  await results.getByRole('link', { name: 'Já está na sua estante' }).click();
  await expect(page.getByRole('heading', { name: 'O Hobbit', level: 1 })).toBeVisible();
});

test('keeps the form usable when there is no connection to the Open Library', async ({ page }) => {
  await page.goto('/estante/novo');
  await searchOpenLibrary(page, 'sem conexao');

  await expect(page.getByText(/Não foi possível falar com a Open Library agora/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  await page.getByLabel('Título *').fill('Um livro sem rede');
  await expect(page.getByLabel('Título *')).toHaveValue('Um livro sem rede');
});

test('says so when the Open Library takes too long to answer', async ({ page }) => {
  await page.goto('/estante/novo');
  await searchOpenLibrary(page, 'lenta');

  // The app waits, tries again twice and only then gives up, which takes a few seconds.
  await expect(page.getByRole('button', { name: 'Buscando…' })).toBeVisible();
  await expect(page.getByText(/Não foi possível falar com a Open Library agora/)).toBeVisible({
    timeout: 20_000,
  });
});

test('finds nothing and leaves the form to be filled by hand', async ({ page }) => {
  await page.goto('/estante/novo');
  await searchOpenLibrary(page, 'um livro que ninguem escreveu');

  await expect(
    page.getByText(/Nada encontrado para “um livro que ninguem escreveu”/),
  ).toBeVisible();
});

for (const theme of THEMES) {
  test(`search of the Open Library has no WCAG 2.1 AA violations in ${theme} theme`, async ({
    page,
  }) => {
    await useTheme(page, theme);

    await page.goto('/estante/novo');
    await searchOpenLibrary(page, 'hobbit');
    await expect(page.getByRole('list', { name: 'Resultados da Open Library' })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await searchOpenLibrary(page, 'sem conexao');
    await expect(page.getByText(/Não foi possível falar com a Open Library agora/)).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
}
