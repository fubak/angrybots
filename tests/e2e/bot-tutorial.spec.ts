import { test, expect } from '@playwright/test';

/** Navigation uses debugLoadLevel; player shots are not substituted here. */
test('dash tutorial appears on first visit to dash-lane', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => window.__game?.debugLoadLevel);
  await page.evaluate(() => window.__game!.debugLoadLevel('dash-lane'));

  const banner = page.locator('.hud-tutorial[role="status"]');
  await expect(banner).toContainText('Dash');
  await expect(banner).toContainText('speed');

  await banner.getByRole('button', { name: 'Got it' }).click();
  await expect(banner).toHaveCount(0);
});

test('heavy tutorial on heavy-gate', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => window.__game?.debugLoadLevel);
  await page.evaluate(() => window.__game!.debugLoadLevel('heavy-gate'));
  const banner = page.locator('.hud-tutorial[role="status"]');
  await expect(banner).toContainText('Heavy');
});

test('split tutorial on split-salvo', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => window.__game?.debugLoadLevel);
  await page.evaluate(() => window.__game!.debugLoadLevel('split-salvo'));
  const banner = page.locator('.hud-tutorial[role="status"]');
  await expect(banner).toContainText('Split');
});
