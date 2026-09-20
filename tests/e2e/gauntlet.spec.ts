import { test, expect, type Page, type Locator } from '@playwright/test';

type GauntletSnap = {
  blocks: { dead: boolean; anchored: boolean; x: number; y: number }[];
  pigsAlive: number;
  gameState: string;
  phase: string;
  debrisFragments: number;
  shotsLeft: number;
  flightPeakX: number | null;
  bot: { x: number; y: number; vx: number; vy: number };
  perchNdc?: { x: number; y: number };
};

declare global {
  interface Window {
    __game?: {
      debugSnapshot: () => GauntletSnap;
      debugLaunchIntoFort: () => boolean;
    };
  }
}

async function waitForGame(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.debugSnapshot, null, {
    timeout: 30_000,
  });
}

async function startPlay(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
}

async function snapshot(page: Page): Promise<GauntletSnap> {
  return page.evaluate(() => window.__game!.debugSnapshot());
}

/** Real pointer drag on canvas — no debug launch fallback. */
async function slingPullLaunch(page: Page, strength = 1) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const maxDx = box.width * 0.34 * strength;
  const maxDy = box.height * 0.38 * strength;
  const ex = sx - maxDx;
  const ey = sy + maxDy;

  await canvas.dispatchEvent('pointerdown', {
    clientX: sx,
    clientY: sy,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  for (let i = 1; i <= 20; i++) {
    const u = i / 20;
    await canvas.dispatchEvent('pointermove', {
      clientX: sx + (ex - sx) * u,
      clientY: sy + (ey - sy) * u,
      pointerId: 1,
      pointerType: 'mouse',
      bubbles: true,
    });
  }
  await page.waitForTimeout(60);
  await canvas.dispatchEvent('pointerup', {
    clientX: ex,
    clientY: ey,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
}

async function waitForShotSettle(page: Page, maxMs = 16_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const s = await snapshot(page);
    if (s.phase === 'ready' || s.gameState === 'won' || s.gameState === 'lost') {
      return s;
    }
    await page.waitForTimeout(200);
  }
  return snapshot(page);
}

function displacementMotion(before: GauntletSnap, after: GauntletSnap): boolean {
  if (after.debrisFragments > before.debrisFragments) return true;
  if (after.pigsAlive < before.pigsAlive) return true;
  for (let i = 0; i < before.blocks.length; i++) {
    const a = before.blocks[i];
    const b = after.blocks[i];
    if (!a || !b) continue;
    if (!a.dead && b.dead) return true;
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx > 0.06 || dy > 0.06) return true;
  }
  return false;
}

async function assertFortVisible(page: Page) {
  const s = await snapshot(page);
  expect(s.perchNdc?.x).toBeLessThan(0);
  expect(s.perchNdc?.x).toBeGreaterThan(-0.95);
  const fortBlock = s.blocks.find((b) => b.x > 4 && !b.dead);
  expect(fortBlock).toBeTruthy();
}

test.describe('gauntlet playable', () => {
  test('castle static until launch; pointer shot reaches fort', async ({ page }) => {
    await waitForGame(page);
    await startPlay(page);
    await assertFortVisible(page);

    const atReady = await snapshot(page);
    expect(atReady.blocks.every((b) => b.anchored && !b.dead)).toBe(true);

    const before = await snapshot(page);
    await slingPullLaunch(page, 1);
    await page.waitForTimeout(400);
    let mid = await snapshot(page);
    if (mid.phase === 'ready' && mid.shotsLeft === before.shotsLeft) {
      throw new Error(
        'Pointer sling did not consume a shot — fix input before claiming gauntlet pass'
      );
    }

    const after = await waitForShotSettle(page);
    expect(after.shotsLeft).toBe(before.shotsLeft - 1);
    expect(after.flightPeakX ?? -999).toBeGreaterThan(2.5);
    expect(displacementMotion(before, after)).toBe(true);
  });

  test('three-shot loop clears training yard', async ({ page }) => {
    test.setTimeout(90_000);
    await waitForGame(page);
    await startPlay(page);

    for (let shot = 0; shot < 3; shot++) {
      const before = await snapshot(page);
      if (before.pigsAlive === 0 || before.gameState === 'won') break;
      await slingPullLaunch(page, 0.92 + shot * 0.03);
      let after = await waitForShotSettle(page);
      if (after.shotsLeft === before.shotsLeft) {
        await slingPullLaunch(page, 1);
        after = await waitForShotSettle(page);
      }
      if (after.gameState === 'won' || after.pigsAlive === 0) break;
      expect(after.shotsLeft).toBeLessThanOrEqual(before.shotsLeft);
      if (after.shotsLeft === before.shotsLeft) {
        throw new Error(`Shot ${shot + 1} did not consume ammunition`);
      }
    }

    const final = await snapshot(page);
    expect(final.pigsAlive, 'Training Yard must be clear in ≤3 shots').toBe(0);

    const victoryHeading: Locator = page.getByRole('heading', {
      name: 'Victory!',
      exact: true,
    });
    await expect(victoryHeading).toBeVisible({ timeout: 30_000 });
    await expect(victoryHeading).toHaveCount(1);
  });

  test('portrait framing exposes sling perch on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForGame(page);
    await startPlay(page);
    await assertFortVisible(page);
  });
});
