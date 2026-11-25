import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Journey 5: the theme chosen in the header is saved in the profile, so it holds after reloading
 * and in another window that never saw the choice (docs/testes-e-qualidade.md). Also the name, the
 * year and the photo of the modal Editar perfil e foto.
 *
 * The profile is one for the whole server: these tests run one after the other and put it back.
 * The other tests that need a theme fix it only in their own page (accessibility.ts).
 */
test.describe.configure({ mode: 'serial' });

const WRITE = { 'X-Requested-By': 'minha-livraria' };

/** A real 1×1 PNG: the API checks the first bytes of the file, not its name. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function profileTheme(request: APIRequestContext): Promise<string> {
  const response = await request.get('/api/v1/profile');
  return ((await response.json()) as { theme: string }).theme;
}

test.afterEach(async ({ request }) => {
  const response = await request.get('/api/v1/profile');
  const { displayName } = (await response.json()) as { displayName?: string };
  await request.put('/api/v1/profile', { headers: WRITE, data: { displayName, theme: 'DARK' } });
  await request.delete('/api/v1/profile/avatar', { headers: WRITE });
});

test('keeps the theme chosen in the header, in this window and in a new one', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Meu perfil' })).toBeVisible();
  // The dark theme is the default, whatever the operating system uses.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const themeToggle = page.getByRole('button', { name: 'Alternar tema claro e escuro' });
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => profileTheme(page.request)).toBe('LIGHT');

  // The copy in the browser paints the theme before Angular starts: no flash of the dark one.
  const themeAtFirstPaint = page
    .waitForEvent('domcontentloaded')
    .then(() => page.evaluate(() => document.documentElement.dataset['theme']));
  await page.reload();
  expect(await themeAtFirstPaint).toBe('light');
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');

  // A new window has nothing saved in the browser and still opens light: it came from the profile.
  const other = await browser.newContext({ colorScheme: 'dark' });
  const fresh = await other.newPage();
  await fresh.goto('/');
  await expect(fresh.locator('html')).toHaveAttribute('data-theme', 'light');
  await other.close();
});

test('changes the name and the year the reader started, keeping the theme', async ({ page }) => {
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Editar perfil e foto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar perfil e foto' });
  await dialog.getByLabel('Como quer ser chamada(o)').fill('Leitora de Teste');
  await dialog.getByLabel('Leitora desde').fill('2019');
  await expect(dialog.getByText('Aparece como MMXIX')).toBeVisible();
  await dialog.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Perfil salvo ✓');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Leitora de Teste' })).toBeVisible();
  await expect(page.getByText('✦ Leitora desde MMXIX')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('link', { name: 'Meu perfil' })).toHaveText('L');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Leitora de Teste' })).toBeVisible();
  await expect(page.getByText('✦ Leitora desde MMXIX')).toBeVisible();
});

test('changes the avatar, refuses a file that is not an image and removes it', async ({ page }) => {
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Trocar foto do perfil' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar perfil e foto' });
  const avatarInput = dialog.locator('input[type=file]');

  await avatarInput.setInputFiles({
    name: 'nota.png',
    mimeType: 'image/png',
    buffer: Buffer.from('não sou imagem'),
  });
  await expect(dialog.getByRole('alert')).toHaveText('Envie uma imagem JPEG, PNG ou WebP.');

  await avatarInput.setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('link', { name: 'Meu perfil' }).locator('img')).toHaveAttribute(
    'src',
    /\/api\/v1\/images\/\d+/,
  );

  await dialog.getByRole('button', { name: 'Remover foto' }).click();
  await expect(page.getByRole('link', { name: 'Meu perfil' }).locator('img')).toHaveCount(0);
});
