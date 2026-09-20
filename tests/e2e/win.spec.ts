import { test, expect } from '@playwright/test';
import { skipToPlay, snapshot } from './helpers';

test('First Flight win shows results', async ({ page }) => {
  test.setTimeout(90_000);
  await skipToPlay(page, 'first-flight');
  await page.waitForFunction(() => window.__debug?.snapshot().state === 'aim', null, {
    timeout: 20_000,
  });
  await page.evaluate(() => {
    window.__debug!.launch!(34, 18);
  });
  await expect
    .poll(async () => (await snapshot(page)).state, { timeout: 60_000 })
    .toMatch(/won|bonus|lost/);
  const s1 = await snapshot(page);
  if (s1.state === 'won' || s1.pigsAlive === 0) {
    expect(s1.pigsAlive).toBe(0);
  }
});
