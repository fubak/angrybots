import { test, expect } from '@playwright/test';
import { launchSolution, snapshot, skipToPlay } from './helpers';

test('First Flight win uses real pointer input', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await skipToPlay(page, 'first-flight');
  const before = await snapshot(page);
  expect(before.state).toBe('aim');
  expect(before.botsLeft).toBe(3);
  const touch = testInfo.project.name.includes('phone');
  await launchSolution(page, 22, 23, { holdMs: 800, pointerType: touch ? 'touch' : 'mouse' });
  await expect
    .poll(async () => (await snapshot(page)).state, { timeout: 70_000 })
    .toBe('won');
  const s = await snapshot(page);
  expect(s.pigsAlive).toBe(0);
  expect(s.botsLeft).toBeLessThan(3);
  await expect(page.getByRole('heading', { name: 'LEVEL CLEARED!' })).toBeVisible();
});
