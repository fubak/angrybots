import { test, expect } from '@playwright/test';
import { launchSolution, seedCleared, skipToPlay, snapshot } from './helpers';

const CASES = [
  {
    id: 'powder-row',
    angleDeg: 58,
    speed: 20,
    cleared: ['first-flight'],
  },
] as const;

for (const c of CASES) {
  test(`${c.id} wins from real pointer input`, async ({ page }) => {
    test.setTimeout(90_000);
    await seedCleared(page, [...c.cleared]);
    await skipToPlay(page, c.id);
    await launchSolution(page, c.angleDeg, c.speed, { holdMs: 700 });
    await expect.poll(async () => (await snapshot(page)).state, { timeout: 70_000 }).toBe('won');
    expect((await snapshot(page)).pigsAlive).toBe(0);
  });
}
