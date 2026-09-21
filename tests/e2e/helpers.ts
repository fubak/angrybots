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

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await assertAngryBots(page);
}

export async function seedCleared(page: Page, ids: string[]): Promise<void> {
  const levels: Record<string, { bestScore: number; stars: number; cleared: boolean }> = {};
  for (const id of ids) levels[id] = { bestScore: 1, stars: 1, cleared: true };
  await page.addInitScript((payload) => {
    localStorage.setItem('angrybots-save-v2', JSON.stringify(payload));
  }, {
    version: 2,
    levels,
    settings: { music: 0.8, sfx: 0.8, voice: 0.8, aimGuide: 'off', reducedMotion: true },
    tutorialsSeen: {},
    lastLevelId: null,
  });
}

export async function waitForAim(page: Page, timeout = 20_000): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).state, { timeout }).toBe('aim');
}

export async function skipToPlay(page: Page, levelId = 'first-flight'): Promise<void> {
  await openApp(page);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator(`button[data-level-id="${levelId}"]`).click();
  await waitForAim(page);
}

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
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
        const c = document.querySelector('canvas');
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
  const desired = Math.hypot(pouch.pull.x, pouch.pull.y);
  const from = await screenOf(page, SLING.anchor.x, SLING.anchor.y);
  let to = await screenOf(page, pouch.x, pouch.y);
  const type = opts?.pointerType ?? 'mouse';
  const hold = opts?.holdMs ?? 700;
  if (type === 'touch') {
    await page.evaluate(
      ({ a, wait }) => {
        const c = document.querySelector('canvas');
        if (!c) throw new Error('no canvas');
        c.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 7,
            pointerType: 'touch',
            clientX: a.x,
            clientY: a.y,
            bubbles: true,
            cancelable: true,
          })
        );
        return new Promise<void>((resolve) => setTimeout(resolve, wait));
      },
      { a: from, wait: hold }
    );
    let cur = to;
    for (let i = 0; i < 8; i++) {
      await page.evaluate(
        ({ b }) => {
          const c = document.querySelector('canvas');
          if (!c) throw new Error('no canvas');
          c.dispatchEvent(
            new PointerEvent('pointermove', {
              pointerId: 7,
              pointerType: 'touch',
              clientX: b.x,
              clientY: b.y,
              bubbles: true,
              cancelable: true,
            })
          );
        },
        { b: cur }
      );
      const s = await snapshot(page);
      const got = Math.hypot(s.pullX, s.pullY);
      if (s.slingPhase !== 'dragging') break;
      if (Math.abs(got - desired) < 0.12) break;
      const scale = desired / Math.max(got, 0.12);
      cur = {
        x: from.x + (cur.x - from.x) * scale,
        y: from.y + (cur.y - from.y) * scale,
      };
    }
    await page.evaluate(
      ({ b }) => {
        const c = document.querySelector('canvas');
        if (!c) throw new Error('no canvas');
        c.dispatchEvent(
          new PointerEvent('pointerup', {
            pointerId: 7,
            pointerType: 'touch',
            clientX: b.x,
            clientY: b.y,
            bubbles: true,
            cancelable: true,
          })
        );
      },
      { b: cur }
    );
    return;
  }
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await holdMs(page, hold);
  await page.mouse.move(to.x, to.y, { steps: 12 });
  for (let i = 0; i < 6; i++) {
    const s = await snapshot(page);
    const got = Math.hypot(s.pullX, s.pullY);
    if (s.slingPhase !== 'dragging') break;
    if (Math.abs(got - desired) < 0.12) break;
    const scale = desired / Math.max(got, 0.12);
    to = {
      x: from.x + (to.x - from.x) * scale,
      y: from.y + (to.y - from.y) * scale,
    };
    await page.mouse.move(to.x, to.y, { steps: 5 });
  }
  await page.mouse.up();
}

export async function tapPlayfield(page: Page): Promise<void> {
  const box = await canvasBox(page);
  await page.evaluate(
    ({ x, y }) => {
      const c = document.querySelector('canvas');
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
