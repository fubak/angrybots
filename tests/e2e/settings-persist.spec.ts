import { test, expect } from '@playwright/test';
import { waitForGame, startPlay } from './helpers';

/** G08: volume and reduced-motion persist in ProgressStore. */
test('pause settings write to localStorage', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await waitForGame(page);
  await startPlay(page);
  await page.getByRole('button', { name: 'Pause' }).click();

  const volume = page.locator('[data-setting="volume"]');
  await volume.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = '42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.locator('[data-setting="reduced-motion"]').check();

  const settings = await page.evaluate(() => {
    const raw = localStorage.getItem('angrybots-progress-v1');
    return raw ? JSON.parse(raw).settings : null;
  });
  expect(settings.masterVolume).toBeCloseTo(0.42, 2);
  expect(settings.reducedMotion).toBe(true);
});
