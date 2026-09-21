import { test, expect } from '@playwright/test';
import { openApp, seedCleared, snapshot } from './helpers';

const LEVELS = ['first-flight', 'powder-row', 'glass-house', 'stone-keep', 'hilltop'] as const;

const PRED: Record<(typeof LEVELS)[number], string[]> = {
  'first-flight': [],
  'powder-row': ['first-flight'],
  'glass-house': ['first-flight', 'powder-row'],
  'stone-keep': ['first-flight', 'powder-row', 'glass-house'],
  hilltop: ['first-flight', 'powder-row', 'glass-house', 'stone-keep'],
};

test.describe('levels smoke', () => {
  for (const id of LEVELS) {
    test(`${id} reaches aim`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await seedCleared(page, PRED[id]);
      await openApp(page);
      await page.getByRole('button', { name: 'Play' }).click();
      await page.locator(`button[data-level-id="${id}"]`).click();
      await expect.poll(async () => (await snapshot(page)).state, { timeout: 20_000 }).toBe('aim');
      expect(errors).toEqual([]);
    });
  }
});
