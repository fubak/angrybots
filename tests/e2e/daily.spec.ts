import { test, expect } from '@playwright/test';
import { assertAngryBots, waitForAim, snapshot } from './helpers';

test.describe('daily challenge', () => {
  test('Daily button launches the level of the day', async ({ page }) => {
    await page.goto('/');
    await assertAngryBots(page);
    const dailyBtn = page.getByRole('button', { name: 'Daily challenge' });
    await expect(dailyBtn).toBeVisible();
    await expect(dailyBtn.locator('.daily-name')).toHaveText(/^Daily · /);
    await dailyBtn.click();
    await waitForAim(page);
    const s = await snapshot(page);
    expect(s.levelId).toBeTruthy();
    expect(['aim', 'intro']).toContain(s.state);
  });
});
