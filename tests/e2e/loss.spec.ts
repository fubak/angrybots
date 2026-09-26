import { test, expect } from '@playwright/test';
import { launchSolution, snapshot, skipToPlay } from './helpers';

test('First Flight loss after three weak shots', async ({ page }) => {
  test.setTimeout(240_000);
  await skipToPlay(page, 'first-flight');
  for (let i = 0; i < 3; i++) {
    await expect.poll(async () => (await snapshot(page)).state, { timeout: 45_000 }).toBe('aim');
    const left = (await snapshot(page)).botsLeft;
    await launchSolution(page, -25, 8, { holdMs: 550 });
    await expect
      .poll(async () => (await snapshot(page)).botsLeft, { timeout: 40_000 })
      .toBeLessThan(left);
  }
  await expect
    .poll(async () => (await snapshot(page)).state, { timeout: 60_000 })
    .toBe('lost');
  const s = await snapshot(page);
  expect(s.pigsAlive).toBeGreaterThan(0);
  expect(s.botsLeft).toBe(0);
  await expect(page.getByRole('heading', { name: 'LEVEL FAILED' })).toBeVisible();
});
