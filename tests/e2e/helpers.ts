import { expect, type Page } from '@playwright/test';

export type GauntletSnap = {
  blocks: { dead: boolean; anchored: boolean; x: number; y: number }[];
  pigsAlive: number;
  gameState: string;
  phase: string;
  debrisFragments: number;
  shotsLeft: number;
  score: number;
  hudPhase: string;
  flightPeakX: number | null;
  bot: { x: number; y: number; vx: number; vy: number };
  perchNdc?: { x: number; y: number };
  launchPreview: { vx: number; vy: number; speed: number };
  launchAtRelease: { vx: number; vy: number; speed: number } | null;
  effPull: { x: number; y: number; len: number };
};

declare global {
  interface Window {
    __game?: {
      debugSnapshot: () => GauntletSnap;
      debugLaunchIntoFort: () => boolean;
      debugLoadLevel?: (id: string) => boolean;
      debugLaunchWithImpulse?: (ix: number, iy: number) => boolean;
    };
  }
}

export function unlockAllLevelsInitScript() {
  return () => {
    localStorage.setItem(
      'angrybots-progress-v1',
      JSON.stringify({
        version: 1,
        levels: {
          'training-yard': { bestScore: 0, stars: 3, unlocked: true },
          'glass-arch': { bestScore: 0, stars: 0, unlocked: true },
          'tnt-yard': { bestScore: 0, stars: 0, unlocked: true },
        },
        settings: { masterVolume: 1, sfxVolume: 1, reducedMotion: false },
      })
    );
  };
}

export async function waitForGame(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.debugSnapshot, null, {
    timeout: 30_000,
  });
}

export async function startPlay(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
}

export async function openLevelFromMenu(page: Page, levelName: RegExp | string) {
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Level select' }).click();
  await page.getByRole('button', { name: levelName }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.waitForTimeout(2000);
}

export async function snapshot(page: Page): Promise<GauntletSnap> {
  return page.evaluate(() => window.__game!.debugSnapshot());
}

/** Real pointer drag on canvas — no debug launch fallback. */
/** Pointer pull; returns preview speed at full draw and release speed after launch. */
export async function slingPullLaunchWithSpeeds(page: Page, strength = 1) {
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
  await page.waitForTimeout(80);
  const preview = await page.evaluate(() => {
    const s = window.__game!.debugSnapshot();
    return s.launchPreview;
  });
  await canvas.dispatchEvent('pointerup', {
    clientX: ex,
    clientY: ey,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  await page.waitForFunction(
    () => window.__game!.debugSnapshot().launchAtRelease !== null,
    { timeout: 8000 }
  );
  const release = await page.evaluate(
    () => window.__game!.debugSnapshot().launchAtRelease!
  );
  return { preview, release };
}

export async function slingPullLaunch(page: Page, strength = 1) {
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

export async function waitForShotSettle(page: Page, maxMs = 16_000) {
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

export function displacementMotion(before: GauntletSnap, after: GauntletSnap): boolean {
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
