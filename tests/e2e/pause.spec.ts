import { test, expect } from '@playwright/test';
import { skipToPlay, snapshot } from './helpers';

test('pause freezes gameplay', async ({ page }) => {
  await skipToPlay(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const s0 = await snapshot(page);
  await page.waitForTimeout(300);
  const s1 = await snapshot(page);
  expect(s1.score).toBe(s0.score);
});
