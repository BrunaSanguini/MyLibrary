import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const APP_URL = 'http://127.0.0.1:8471';

// E2E_BASE_URL points the tests at an app that is already running (e.g. `npm start`).
// Without it, Playwright starts the real jar in the e2e profile, with data in a new temporary
// folder: no test ever touches %USERPROFILE%\.minha-livraria.
const externalApp = process.env['E2E_BASE_URL'];
const jar = path.resolve(__dirname, '../backend/target/minha-livraria.jar');

function temporaryDataDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'minha-livraria-e2e-'));
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: externalApp ?? APP_URL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  // Chromium only: the app is used on Chrome, and its engine is the one the E2E has to prove.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: externalApp
    ? undefined
    : {
        command: `java -jar "${jar}" --spring.profiles.active=e2e --app.data-dir="${temporaryDataDir()}"`,
        url: `${APP_URL}/actuator/health/readiness`,
        timeout: 120_000,
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
