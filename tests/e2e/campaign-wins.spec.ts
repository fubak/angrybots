import { test, expect } from '@playwright/test';
import { launchSolution, seedCleared, skipToPlay, snapshot } from './helpers';

const CASES = [
  {
    id: 'powder-row',
    shots: [
      [24, 21],
      [34, 20],
    ],
    cleared: ['first-flight'],
  },
] as const;

for (const c of CASES) {
  test(`${c.id} wins from real pointer input`, async ({ page }) => {
    test.setTimeout(120_000);
    await seedCleared(page, [...c.cleared]);
    await skipToPlay(page, c.id);
    for (const [a, v] of c.shots) {
      if ((await snapshot(page)).state === 'won') break;
      await launchSolution(page, a, v as number, { holdMs: 700 });
      await expect
        .poll(async () => (await snapshot(page)).state, { timeout: 10_000 })
        .not.toBe('aim');
      await expect
        .poll(async () => (await snapshot(page)).state, { timeout: 70_000 })
        .toMatch(/^(aim|won)$/);
    }
    await expect.poll(async () => (await snapshot(page)).state, { timeout: 70_000 }).toBe('won');
    expect((await snapshot(page)).pigsAlive).toBe(0);
  });
}
