import { test, expect } from '@playwright/test';
import { launchSolution, pickLevel, snapshot, skipToPlay, holdMs } from './helpers';

test('pause freezes a moving body and resume continues it', async ({ page }) => {
  test.setTimeout(60_000);
  await skipToPlay(page, 'first-flight');
  await launchSolution(page, 34, 20, { holdMs: 550 });
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 10_000 }).toBe('flight');
  await expect.poll(async () => (await snapshot(page)).bot?.speed ?? 0, { timeout: 8_000 }).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const a = await snapshot(page);
  expect(a.paused).toBe(true);
  expect(a.bot).toBeTruthy();
  await holdMs(page, 400);
  const b = await snapshot(page);
  expect(b.bot!.x).toBeCloseTo(a.bot!.x, 4);
  expect(b.bot!.y).toBeCloseTo(a.bot!.y, 4);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect.poll(async () => {
    const s = await snapshot(page);
    return Math.hypot(s.bot!.x - a.bot!.x, s.bot!.y - a.bot!.y);
  }, { timeout: 8_000 }).toBeGreaterThan(0.15);
});

test('pause then levels then start is not stuck paused', async ({ page }) => {
  await skipToPlay(page, 'first-flight');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Levels' }).click();
  await pickLevel(page, 'first-flight');
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 15_000 }).toBe('aim');
  const s = await snapshot(page);
  expect(s.paused).toBe(false);
});
