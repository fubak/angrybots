import { expect, type Page } from '@playwright/test';
import { pouchForLaunch, SLING } from '../../src/sling/launch';

export type DebugSnapshot = {
  state: string;
  levelId: string | null;
  score: number;
  botsLeft: number;
  pigsAlive: number;
  abilityUsed: boolean;
  paused: boolean;
  slingPhase: string;
  pullX: number;
  pullY: number;
  bot: { kind: string; x: number; y: number; vx: number; vy: number; speed: number } | null;
  sling: {
    loaded: { x: number; y: number } | null;
    queue: { x: number; y: number }[];
    hopper: { x: number; y: number; sx: number; sy: number; rot: number; t: number } | null;
  };
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

export async function assertAngryBots(page: Page): Promise<void> {
  await expect(page).toHaveTitle(/Angry Bots/);
  await expect(page.locator('#app[data-game="angrybots"]')).toBeAttached();
}

export async function openApp(page: Page, opts?: { unlockAll?: boolean }): Promise<void> {
  await page.goto(opts?.unlockAll ? '/?unlockAll=1' : '/');
  await assertAngryBots(page);
}

export async function seedCleared(
  page: Page,
  ids: string[],
  opts?: { stars?: number }
): Promise<void> {
  const stars = opts?.stars ?? 1;
  const levels: Record<string, { bestScore: number; stars: number; cleared: boolean }> = {};
  for (const id of ids) levels[id] = { bestScore: 1, stars, cleared: true };
  await page.addInitScript((payload) => {
    localStorage.setItem('angrybots-save-v2', JSON.stringify(payload));
  }, {
    version: 2,
    levels,
    settings: { music: 0.8, sfx: 0.8, voice: 0.8, aimGuide: 'off', reducedMotion: true },
    tutorialsSeen: { grok: true, dash: true, split: true, heavy: true, blast: true },
    lastLevelId: null,
  });
}

export async function dismissBotCard(page: Page): Promise<void> {
  const card = page.locator('.modal-wrap .bot-card');
  // The card opens on the same tick the sim reaches 'aim' — allow a beat.
  await card.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  if (await card.isVisible()) {
    await card.locator('button').first().click();
  }
}

export async function waitForAim(page: Page, timeout = 20_000): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).state, { timeout }).toBe('aim');
  await dismissBotCard(page);
}

/** Clicks through the chapter map until the level node exists, then clicks it. */
export async function pickLevel(page: Page, levelId: string): Promise<void> {
  for (const card of await page.locator('.chapter-card').all()) {
    await card.click();
    const node = page.locator(`button[data-level-id="${levelId}"]`);
    if (await node.count()) {
      await node.click();
      return;
    }
    const back = page.getByRole('button', { name: 'Back to chapters' });
    if (await back.count()) await back.click();
  }
  throw new Error(`level ${levelId} not found`);
}

export async function skipToPlay(page: Page, levelId = 'first-flight'): Promise<void> {
  await openApp(page, { unlockAll: true });
  await page.getByRole('button', { name: 'Play' }).click();
  await pickLevel(page, levelId);
  await waitForAim(page);
}

async function canvasBox(page: Page) {
  const box = await page.locator('canvas[data-engine]').boundingBox();
  if (!box) throw new Error('canvas missing');
  return box;
}

export async function screenOf(
  page: Page,
  x: number,
  y: number
): Promise<{ x: number; y: number }> {
  const box = await canvasBox(page);
  const cam = (await snapshot(page)).camera;
  const p = worldToScreen(x, y, cam, box.width, box.height);
  return { x: box.x + p.x, y: box.y + p.y };
}

export async function holdMs(page: Page, ms: number): Promise<void> {
  await page.evaluate((wait) => new Promise((r) => setTimeout(r, wait)), ms);
}

export async function pointerDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts?: { holdMs?: number; pointerType?: 'mouse' | 'touch' }
): Promise<void> {
  const type = opts?.pointerType ?? 'mouse';
  const hold = opts?.holdMs ?? 700;
  if (type === 'touch') {
    await page.evaluate(
      ({ a, b, wait }) => {
        const c = document.querySelector('canvas[data-engine]');
        if (!c) throw new Error('no canvas');
        const fire = (name: string, x: number, y: number) => {
          c.dispatchEvent(
            new PointerEvent(name, {
              pointerId: 7,
              pointerType: 'touch',
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
            })
          );
        };
        fire('pointerdown', a.x, a.y);
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            fire('pointermove', b.x, b.y);
            setTimeout(() => {
              fire('pointerup', b.x, b.y);
              resolve();
            }, 40);
          }, wait);
        });
      },
      { a: from, b: to, wait: hold }
    );
    return;
  }
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await holdMs(page, hold);
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

export async function launchSolution(
  page: Page,
  angleDeg: number,
  speed: number,
  opts?: { holdMs?: number; pointerType?: 'mouse' | 'touch' }
): Promise<void> {
  await waitForAim(page);
  const pouch = pouchForLaunch(angleDeg, speed);
  const from = await screenOf(page, SLING.anchor.x, SLING.anchor.y);
  let to = await screenOf(page, pouch.x, pouch.y);
  const type = opts?.pointerType ?? 'mouse';
  const hold = opts?.holdMs ?? 700;

  const touchFire = (name: string, p: { x: number; y: number }) =>
    page.evaluate(
      ({ n, b }) => {
        const c = document.querySelector('canvas[data-engine]');
        if (!c) throw new Error('no canvas');
        c.dispatchEvent(
          new PointerEvent(n, {
            pointerId: 7,
            pointerType: 'touch',
            clientX: b.x,
            clientY: b.y,
            bubbles: true,
            cancelable: true,
          })
        );
      },
      { n: name, b: p }
    );

  /* The camera keeps easing while a pull is held (tension widen), so the
     screen-space drag target drifts mid-gesture. Correct additively in WORLD
     space — pull = anchor − pointerWorld — each iteration, with a beat for the
     camera to settle, instead of rescaling the stale target (that overshoots
     and oscillates on wide phone frames). */
  const correct = async () => {
    const s = await snapshot(page);
    if (s.slingPhase !== 'dragging') return false;
    const errX = pouch.pull.x - s.pullX;
    const errY = pouch.pull.y - s.pullY;
    if (Math.hypot(errX, errY) < 0.06) return false;
    const box = await canvasBox(page);
    const pxW = box.width / (s.camera.height * (box.width / box.height));
    const pxH = box.height / s.camera.height;
    to = { x: to.x - errX * pxW, y: to.y + errY * pxH };
    return true;
  };
  const moveTo = async (p: { x: number; y: number }) => {
    if (type === 'touch') await touchFire('pointermove', p);
    else await page.mouse.move(p.x, p.y, { steps: 5 });
  };

  if (type === 'touch') {
    await touchFire('pointerdown', from);
    await holdMs(page, hold);
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await holdMs(page, hold);
  }
  await moveTo(to);
  for (let i = 0; i < 10; i++) {
    await holdMs(page, 120);
    if (!(await correct())) break;
    await moveTo(to);
  }
  if (type === 'touch') await touchFire('pointerup', to);
  else await page.mouse.up();
}

export async function tapPlayfield(page: Page): Promise<void> {
  const box = await canvasBox(page);
  await page.evaluate(
    ({ x, y }) => {
      const c = document.querySelector('canvas[data-engine]');
      if (!c) throw new Error('no canvas');
      c.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 11,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        })
      );
      c.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 11,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        })
      );
    },
    { x: box.x + box.width * 0.55, y: box.y + box.height * 0.45 }
  );
}
