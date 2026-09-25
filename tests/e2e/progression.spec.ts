import { test, expect } from '@playwright/test';
import { launchSolution, openApp, seedCleared, skipToPlay, snapshot } from './helpers';

async function openTraining(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator('.chapter-card').first().click();
}

test('winning First Flight unlocks the next level after reload', async ({ page }) => {
  test.setTimeout(90_000);
  await skipToPlay(page, 'first-flight');
  await launchSolution(page, 34, 20, { holdMs: 700 });
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 70_000 }).toBe('won');
  await page.getByRole('button', { name: 'Levels' }).click();
  await page.locator('.chapter-card').first().click();
  await expect(page.locator('button[data-level-id="powder-row"]')).toBeEnabled();
  await page.reload();
  await openApp(page);
  await openTraining(page);
  await expect(page.locator('button[data-level-id="first-flight"]')).toBeEnabled();
  await expect(page.locator('button[data-level-id="powder-row"]')).toBeEnabled();
  await expect(page.locator('button[data-level-id="lone-guard"]')).toBeDisabled();
});

test('clearing the first five levels unlocks level six after reload', async ({ page }) => {
  await seedCleared(page, [
    'first-flight',
    'powder-row',
    'glass-house',
    'stone-keep',
    'hilltop',
  ]);
  await openApp(page);
  await openTraining(page);
  await expect(page.locator('button[data-level-id="lone-guard"]')).toBeEnabled();
  await expect(page.locator('button[data-level-id="twin-posts"]')).toBeDisabled();
});
