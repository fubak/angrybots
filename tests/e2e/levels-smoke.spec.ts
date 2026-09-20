import { test, expect } from '@playwright/test';
import { snapshot } from './helpers';

const LEVELS = ['first-flight', 'powder-row', 'glass-house', 'stone-keep', 'hilltop'];

test.describe('levels smoke', () => {
  for (const id of LEVELS) {
    test(`${id} reaches aim`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto('/');
      await page.getByRole('button', { name: 'Play' }).click();
      const buttons = page.getByRole('button', { name: /Level \d+/ });
      await buttons.first().click();
      await expect
        .poll(async () => (await snapshot(page)).state, { timeout: 20_000 })
        .toBe('aim');
      expect(errors).toEqual([]);
    });
  }
});
