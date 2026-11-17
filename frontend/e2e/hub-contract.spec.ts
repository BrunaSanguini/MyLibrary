import { expect, test } from '@playwright/test';
import { type ChildProcess, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * The contract with the My Collection hub (ADR-0001), checked the way the hub uses it: start the
 * app with a port and a token, wait for the readiness, use it, close it with the token, and open
 * it again with every record still there. A second copy on the same data must not start.
 *
 * This file starts its own copies of the jar, on ports of its own, apart from the app the other
 * tests use.
 */
test.describe.configure({ mode: 'serial' });
test.skip(!!process.env['E2E_BASE_URL'], 'Needs the jar, not an app that is already running.');

const JAR = path.resolve(__dirname, '../../backend/target/minha-livraria.jar');
const WRITE = { 'X-Requested-By': 'minha-livraria', 'Content-Type': 'application/json' };
const TOKEN_HEADER = 'X-MyCollection-Token';
const STARTUP = 120_000;

interface RunningApp {
  readonly process: ChildProcess;
  readonly url: string;
  /** Resolves with the exit code once the process ends. */
  readonly exited: Promise<number | null>;
  output(): string;
}

/** What the hub does: a new token for each session, sent by environment variable. */
function start(port: number, dataDir: string, token: string): RunningApp {
  const child = spawn('java', ['-jar', JAR, `--server.port=${port}`, `--app.data-dir=${dataDir}`], {
    env: { ...process.env, MINHA_LIVRARIA_SHUTDOWN_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)));
  return { process: child, url: `http://127.0.0.1:${port}`, exited, output: () => output };
}

/** The readiness, asked with a growing pause, as the hub does. */
async function waitUntilReady(app: RunningApp): Promise<void> {
  const deadline = Date.now() + STARTUP;
  let pause = 200;
  while (Date.now() < deadline) {
    if (app.process.exitCode !== null) {
      throw new Error(`The app stopped while starting:\n${app.output().slice(-2000)}`);
    }
    try {
      const response = await fetch(`${app.url}/actuator/health/readiness`);
      if (response.ok && ((await response.json()) as { status: string }).status === 'UP') {
        return;
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, pause));
    pause = Math.min(pause * 2, 2_000);
  }
  throw new Error(`The app was not ready in ${STARTUP / 1000} s:\n${app.output().slice(-2000)}`);
}

function shutdown(app: RunningApp, token: string): Promise<Response> {
  return fetch(`${app.url}/actuator/shutdown`, {
    method: 'POST',
    headers: { [TOKEN_HEADER]: token },
  });
}

async function createBook(app: RunningApp, title: string): Promise<number> {
  const author = await fetch(`${app.url}/api/v1/authors`, {
    method: 'POST',
    headers: WRITE,
    body: JSON.stringify({ name: 'Autora do Hub' }),
  });
  const { id: authorId } = (await author.json()) as { id: number };
  const book = await fetch(`${app.url}/api/v1/books`, {
    method: 'POST',
    headers: WRITE,
    body: JSON.stringify({ title, authorIds: [authorId] }),
  });
  expect(book.status).toBe(201);
  return ((await book.json()) as { id: number }).id;
}

const running: RunningApp[] = [];

test.afterAll(() => {
  // Last resort, as the hub's taskkill: only for a copy a failed test left behind.
  for (const app of running) {
    if (app.process.exitCode === null) {
      app.process.kill('SIGKILL');
    }
  }
});

test('opens and closes through the hub without losing data', async () => {
  test.setTimeout(3 * STARTUP);
  const dataDir = mkdtempSync(path.join(tmpdir(), 'minha-livraria-hub-'));
  const firstToken = randomBytes(32).toString('hex');

  const first = start(8491, dataDir, firstToken);
  running.push(first);
  await waitUntilReady(first);
  const info = await fetch(`${first.url}/actuator/info`);
  expect(info.ok).toBe(true);
  const bookId = await createBook(first, 'Livro salvo antes de fechar');

  // Anyone else asking to close is refused, and the app keeps running.
  const wrong = await shutdown(first, 'outro-token');
  expect(wrong.status).toBe(403);
  expect(((await wrong.json()) as { code: string }).code).toBe('request.invalid-token');
  expect((await fetch(`${first.url}/actuator/health/readiness`)).ok).toBe(true);

  // The hub's token closes it gracefully: the process ends on its own, with no error.
  expect((await shutdown(first, firstToken)).status).toBe(200);
  expect(await first.exited).toBe(0);

  // The next session has another token and finds the book.
  const secondToken = randomBytes(32).toString('hex');
  const second = start(8492, dataDir, secondToken);
  running.push(second);
  await waitUntilReady(second);
  const book = await fetch(`${second.url}/api/v1/books/${bookId}`);
  expect(book.status).toBe(200);
  expect(((await book.json()) as { title: string }).title).toBe('Livro salvo antes de fechar');

  // The token of the old session no longer closes anything.
  expect((await shutdown(second, firstToken)).status).toBe(403);
  expect((await shutdown(second, secondToken)).status).toBe(200);
  expect(await second.exited).toBe(0);
});

test('does not start a second copy on the same data', async () => {
  test.setTimeout(3 * STARTUP);
  const dataDir = mkdtempSync(path.join(tmpdir(), 'minha-livraria-hub-'));
  const token = randomBytes(32).toString('hex');

  const first = start(8493, dataDir, token);
  running.push(first);
  await waitUntilReady(first);

  // Even on a free port, the lock of the database stops the second copy before it is ready.
  const second = start(8494, dataDir, token);
  running.push(second);
  const code = await Promise.race([
    second.exited,
    new Promise<'running'>((resolve) => setTimeout(() => resolve('running'), STARTUP)),
  ]);
  expect(code, second.output().slice(-2000)).not.toBe(0);
  expect(code).not.toBe('running');

  // The first copy was not disturbed.
  expect((await fetch(`${first.url}/actuator/health/readiness`)).ok).toBe(true);
  expect((await shutdown(first, token)).status).toBe(200);
  expect(await first.exited).toBe(0);
});
