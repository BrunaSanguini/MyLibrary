import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations, THEMES, useTheme } from './accessibility';

/**
 * Journey 1: register a book and find it again (docs/testes-e-qualidade.md).
 *
 * Runs against the sample collection of the e2e profile. A retry reuses the same server, so
 * each run registers a book with a title of its own instead of counting on an empty shelf.
 */
test('registers a book by hand and finds it again', async ({ page }, testInfo) => {
  const title = `O Alienista (${testInfo.project.name}, ${testInfo.retry})`;

  await page.goto('/estante');
  await expect(page.getByRole('heading', { name: 'Minha Estante', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Adicionar livro' }).first().click();

  // The form refuses to save without a title and an author, before anything reaches the server.
  await expect(page.getByRole('heading', { name: 'Adicionar livro', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar livro' }).click();
  await expect(page.getByText('Informe o título do livro.')).toBeVisible();
  await expect(page.getByText(/Escolha ao menos um autor/)).toBeVisible();
  await expect(page.getByText('Faltam 2 ajustes para salvar')).toBeVisible();

  await page.getByLabel('Título *').fill(title);

  // The author already exists in the sample collection, so the picker finds it by typing.
  const authors = page.getByRole('combobox', { name: 'Autor(es) *' });
  await authors.fill('machado');
  await expect(page.getByRole('option', { name: 'Machado de Assis' })).toBeVisible();
  await page.getByRole('option', { name: 'Machado de Assis' }).click();
  await expect(page.getByRole('list', { name: 'Autores escolhidos' })).toContainText(
    'Machado de Assis',
  );

  // A genre that does not exist yet is created on the spot.
  const genre = `Novela ${testInfo.project.name} ${testInfo.retry}`;
  await page.getByRole('combobox', { name: 'Gênero' }).fill(genre);
  await page.getByRole('option', { name: /Cadastrar/ }).click();
  await expect(page.getByRole('list', { name: 'Gênero escolhido' })).toContainText(genre);

  // And a subgenre inside it, which the book page shows in a row of its own.
  const subgenre = `Conto ${testInfo.project.name} ${testInfo.retry}`;
  await page.getByRole('combobox', { name: 'Subgêneros' }).fill(subgenre);
  await page.getByRole('option', { name: /Cadastrar/ }).click();
  await expect(page.getByRole('list', { name: 'Subgêneros escolhidos' })).toContainText(subgenre);

  await page.getByLabel('Ano').fill('1882');
  await page.getByRole('radio', { name: 'Lido' }).click();
  await page.getByRole('button', { name: 'Salvar livro' }).click();

  // Saving shows what was saved, with the way to the new book.
  await expect(page.getByRole('heading', { name: 'Livro salvo na sua estante' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver o livro' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/livro\/\d+$/);
  await expect(page.getByRole('link', { name: 'Machado de Assis' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Subgêneros' })).toContainText(subgenre);
  await expect(page.getByRole('region', { name: 'Ficha de leitura' })).toContainText('Lido');

  // The book is the reader's, so it has the seal; the toggles say so.
  const owned = page.getByRole('button', { name: 'Tenho este livro' });
  await expect(owned).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Selo ex-libris: este livro é seu' })).toBeVisible();

  // Finding it again through the search of the header, with the keyboard only.
  await page.getByRole('button', { name: 'Pesquisar no acervo' }).focus();
  await page.keyboard.press('Enter');
  const search = page.getByRole('searchbox', { name: 'Buscar por título ou autor' });
  await expect(search).toBeFocused();
  await search.fill('alienista');
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: new RegExp(title.slice(0, 11)) })
      .first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Pesquisar no acervo' })).toBeFocused();

  // And on the shelf, on the tab of the books read, matching the search.
  await page.goto(`/estante?status=lidos&q=${encodeURIComponent(title)}`);
  await expect(page.getByRole('link', { name: new RegExp('O Alienista') })).toHaveCount(1);

  // The filter is in the address, so a reload keeps it.
  await page.reload();
  await expect(page.getByRole('tab', { name: /Lidos/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: new RegExp('O Alienista') })).toHaveCount(1);
});

test('finds a book typing without the accents of its title', async ({ page }) => {
  await page.goto('/estante?q=memorias%20postumas');

  await expect(page.getByRole('link', { name: /Memórias Póstumas de Brás Cubas/ })).toBeVisible();
  await expect(page.getByText('Mostrando 1–1 de 1 livro')).toBeVisible();
});

test('asks before deleting a book, and Escape backs out', async ({ page }) => {
  await page.goto('/estante?q=iracema');
  await page.getByRole('link', { name: /Iracema/ }).click();
  await expect(page.getByRole('heading', { name: 'Iracema', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Excluir livro' }).click();
  const dialog = page.getByRole('dialog', { name: 'Excluir “Iracema”?' });
  await expect(dialog).toBeVisible();
  // The safe choice has the first focus, so Enter by reflex would cancel.
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();

  // A real Escape closes the native dialog and returns the focus to what opened it.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Excluir livro' }).first()).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Iracema', level: 1 })).toBeVisible();
});

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme);
    });

    test('shelf has no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/estante');
      await expect(page.getByRole('link', { name: /Dom Casmurro/ })).toBeVisible();

      await expectNoAccessibilityViolations(page);
    });

    test('book page has no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/estante?q=casmurro');
      await page.getByRole('link', { name: /Dom Casmurro/ }).click();
      await expect(page.getByRole('heading', { name: 'Dom Casmurro', level: 1 })).toBeVisible();

      await expectNoAccessibilityViolations(page);
    });

    test('book form has no WCAG 2.1 AA violations, errors included', async ({ page }) => {
      await page.goto('/estante/novo');
      await page.getByRole('button', { name: 'Salvar livro' }).click();
      await expect(page.getByText('Informe o título do livro.')).toBeVisible();

      await expectNoAccessibilityViolations(page);
    });

    test('catalogs have no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/catalogos');
      await expect(page.getByRole('link', { name: 'Romance' })).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await page.getByRole('link', { name: 'Autores' }).click();
      await expect(page.getByRole('link', { name: 'Machado de Assis' })).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });

    test('series page lists its books in reading order', async ({ page }) => {
      await page.goto('/catalogos?tipo=series');
      await page.getByRole('link', { name: 'Trilogia Realista' }).click();
      await expect(
        page.getByRole('heading', { name: 'Trilogia Realista', level: 1 }),
      ).toBeVisible();

      const books = page
        .getByRole('region', { name: 'Livros da série' })
        .getByRole('listitem')
        .getByRole('link');
      await expect(books.nth(0)).toContainText('Memórias Póstumas de Brás Cubas');
      await expect(books.nth(1)).toContainText('Quincas Borba');
      await expect(books.nth(2)).toContainText('Dom Casmurro');
      await expectNoAccessibilityViolations(page);
    });

    test('reading calendar has no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/calendario');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(' de ');
      await expect(page.getByRole('list', { name: 'Resumo do mês' })).toBeVisible();

      await expectNoAccessibilityViolations(page);
    });

    test('subgenres tab of the catalog has no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/catalogos?tipo=subgeneros');
      await expect(page.getByRole('link', { name: 'Realismo' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Subgêneros' })).toHaveAttribute(
        'aria-current',
        'page',
      );

      await expectNoAccessibilityViolations(page);
    });

    test('search panel, with results, has no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Pesquisar no acervo' }).click();
      await page.getByRole('searchbox', { name: 'Buscar por título ou autor' }).fill('dom');
      await expect(
        page.getByRole('dialog').getByRole('link', { name: /Dom Casmurro/ }),
      ).toBeVisible();

      await expectNoAccessibilityViolations(page);
    });
  });
}
