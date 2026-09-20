import type { Page } from '@playwright/test';

export type DebugSnapshot = {
  state: string;
  levelId: string | null;
  score: number;
  botsLeft: number;
  pigsAlive: number;
  bot: { kind: string; vx: number; vy: number; speed: number } | null;
  camera: { cx: number; cy: number; height: number };
};

export async function snapshot(page: Page): Promise<DebugSnapshot> {
  return page.evaluate(() => window.__debug!.snapshot());
}

export function worldToScreen(
  x: number,
  y: number,
  camera: DebugSnapshot['camera'],
  width: number,
  height: number
): { x: number; y: number } {
  const w = camera.height * (width / height);
  const nx = (x - camera.cx) / (w / 2);
  const ny = (y - camera.cy) / (camera.height / 2);
  return {
    x: ((nx + 1) / 2) * width,
    y: ((1 - ny) / 2) * height,
  };
}

export async function skipToPlay(page: Page, levelId = 'first-flight'): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator(`button[data-level-id="${levelId}"]`).click();
  await page.waitForFunction(() => window.__debug?.snapshot().state === 'aim' || window.__debug?.snapshot().state === 'intro', null, {
    timeout: 15_000,
  });
  await page.waitForFunction(
    () => ['aim', 'intro'].includes(window.__debug!.snapshot().state),
    null,
    { timeout: 15_000 }
  );
  for (let i = 0; i < 200; i++) {
    const s = await snapshot(page);
    if (s.state === 'aim') break;
    await page.waitForTimeout(50);
  }
}
