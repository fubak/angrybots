import { existsSync } from 'node:fs';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { test, expect } from '@playwright/test';

const PREVIEW = 'http://127.0.0.1:5198';
let preview: ChildProcess | undefined;

test.describe('PWA offline', () => {
  test.beforeAll(async () => {
    if (!existsSync('dist/sw.js')) execSync('npm run build', { stdio: 'inherit' });
    preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5198', '--strictPort'], {
      stdio: 'ignore',
      detached: true,
    });
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(PREVIEW);
        if (res.ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('vite preview did not start');
  });

  test.afterAll(() => {
    if (preview?.pid) {
      try {
        process.kill(-preview.pid);
      } catch {}
    }
  });

  test('game loads offline after service worker install', async ({ page, context }) => {
    await page.goto(PREVIEW + '/');
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    const ready = await page.evaluate(async () => {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, rej) => setTimeout(() => rej(new Error('sw timeout')), 20_000)),
      ]);
      return (reg as ServiceWorkerRegistration).active?.state === 'activated';
    });
    expect(ready).toBe(true);
    await expect(page.locator('#app')).toBeVisible();
    await page.waitForSelector('[aria-label="Play"]', { timeout: 20_000 });

    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveTitle(/Angry Bots/);
    await page.waitForSelector('[aria-label="Play"]', { timeout: 20_000 });
  });
});
