import { test, expect } from '@playwright/test';
import { openApp, pickLevel, seedCleared, snapshot } from './helpers';

const LEVELS = [
  'first-flight',
  'powder-row',
  'glass-house',
  'lone-guard',
  'heavy-gate',
  'king-court',
] as const;

const PRED: Record<(typeof LEVELS)[number], string[]> = {
  'first-flight': [],
  'powder-row': ['first-flight'],
  'glass-house': ['first-flight', 'powder-row'],
  'lone-guard': ['first-flight', 'powder-row', 'glass-house', 'stone-keep', 'hilltop'],
  'heavy-gate': [
    'first-flight',
    'powder-row',
    'glass-house',
    'stone-keep',
    'hilltop',
    'lone-guard',
    'twin-posts',
    'glass-alley',
    'tnt-porch',
    'split-lesson',
  ],
  'king-court': [
    'first-flight',
    'powder-row',
    'glass-house',
    'stone-keep',
    'hilltop',
    'lone-guard',
    'twin-posts',
    'glass-alley',
    'tnt-porch',
    'split-lesson',
    'heavy-gate',
    'wheel-yard',
    'ramp-run',
    'ledge-nest',
    'powder-stack',
    'glass-stack',
    'hat-row',
    'blast-shed',
    'cross-beam',
    'mixed-yard',
  ],
};

test.describe('levels smoke', () => {
  for (const id of LEVELS) {
    test(`${id} reaches aim`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await seedCleared(page, PRED[id]);
      await openApp(page, { unlockAll: true });
      await page.getByRole('button', { name: 'Play' }).click();
      await pickLevel(page, id);
      await expect.poll(async () => (await snapshot(page)).state, { timeout: 20_000 }).toBe('aim');
      expect(errors).toEqual([]);
    });
  }
});
