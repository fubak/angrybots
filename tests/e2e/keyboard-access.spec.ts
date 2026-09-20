import { test, expect } from '@playwright/test';
import { startPlay, waitForGame } from './helpers';

test('Escape toggles pause and resume', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
});

test('Enter starts from title screen', async ({ page }) => {
  await waitForGame(page);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
});
