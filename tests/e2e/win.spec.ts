import { test, expect } from '@playwright/test';
import { skipToPlay, snapshot, worldToScreen } from './helpers';

test('First Flight win shows results', async ({ page }) => {
  test.setTimeout(90_000);
  await skipToPlay(page, 'first-flight');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  const s0 = await snapshot(page);
  const bot = s0.bot;
  expect(bot).toBeTruthy();
  const from = worldToScreen(bot!.x ?? -7, bot!.y ?? 2, s0.camera, box!.width, box!.height);
  await page.mouse.move(box!.x + from.x, box!.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box!.x + from.x - 120, box!.y + from.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await snapshot(page)).state, { timeout: 60_000 })
    .toMatch(/won|bonus|lost/);
  const s1 = await snapshot(page);
  if (s1.state === 'won' || s1.pigsAlive === 0) {
    expect(s1.pigsAlive).toBe(0);
  }
});
