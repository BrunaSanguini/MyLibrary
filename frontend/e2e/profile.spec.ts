import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Journey 5: the theme chosen in the header is saved in the profile, so it holds after reloading
 * and in another window that never saw the choice (docs/testes-e-qualidade.md). Also the name and
 * the avatar of the Perfil page.
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
  await request.put('/api/v1/profile', { headers: WRITE, data: { displayName, theme: 'SYSTEM' } });
  await request.delete('/api/v1/profile/avatar', { headers: WRITE });
});

test('keeps the theme chosen in the header, in this window and in a new one', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Meu perfil' })).toBeVisible();
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => profileTheme(page.request)).toBe('DARK');

  // The copy in the browser paints the theme before Angular starts: no flash of the light one.
  const themeAtFirstPaint = page
    .waitForEvent('domcontentloaded')
    .then(() => page.evaluate(() => document.documentElement.dataset['theme']));
  await page.reload();
  expect(await themeAtFirstPaint).toBe('dark');
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toBeVisible();

  // A new window has nothing saved in the browser and still opens dark: it came from the profile.
  const other = await browser.newContext({ colorScheme: 'light' });
  const fresh = await other.newPage();
  await fresh.goto('/');
  await expect(fresh.locator('html')).toHaveAttribute('data-theme', 'dark');
  await other.close();
});

test('changes the name and the theme on the profile page', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Editar perfil' }).click();
  await page.getByLabel('Nome').fill('Leitora de Teste');
  await page.getByRole('radio', { name: 'Escuro' }).check();
  await page.getByRole('button', { name: 'Salvar perfil' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Leitora de Teste' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('link', { name: 'Meu perfil' })).toHaveText('L');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Leitora de Teste' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('changes the avatar, refuses a file that is not an image and removes it', async ({ page }) => {
  await page.goto('/perfil');
  const avatarInput = page.locator('input[type=file]');

  await avatarInput.setInputFiles({
    name: 'nota.png',
    mimeType: 'image/png',
    buffer: Buffer.from('não sou imagem'),
  });
  await expect(page.getByRole('alert')).toHaveText('Envie uma imagem JPEG, PNG ou WebP.');

  await avatarInput.setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('link', { name: 'Meu perfil' }).locator('img')).toHaveAttribute(
    'src',
    /\/api\/v1\/images\/\d+/,
  );

  await page.getByRole('button', { name: 'Remover foto' }).click();
  await expect(page.getByRole('link', { name: 'Meu perfil' }).locator('img')).toHaveCount(0);
});
