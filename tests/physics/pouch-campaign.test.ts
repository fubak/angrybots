import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { TUNING } from '../../src/config/tuning';
import { levelById } from '../../src/levels/registry';
import { launchVelocity, pouchForLaunch } from '../../src/sling/launch';
import solutions from '../../src/levels/solutions.json';

type Sol = { shots: { angleDeg: number; speed: number }[] };
const book = solutions as Record<string, Sol>;

function pouchClear(id: string, shots: { angleDeg: number; speed: number }[]): string {
  const def = levelById(id);
  if (!def) return 'missing';
  const s = new GameSession();
  s.loadLevel(def, true);
  for (const shot of shots) {
    for (let i = 0; i < 40 && s.getState() !== 'aim'; i++) s.update(TUNING.dt);
    if (s.getState() !== 'aim') return s.getState();
    const p = pouchForLaunch(shot.angleDeg, shot.speed);
    const lv = launchVelocity(p.pull);
    if (!lv) return 'no-velocity';
    s.launchFromPull(lv.vx, lv.vy, p.x, p.y);
    for (let i = 0; i < 60 * 8; i++) {
      const st = s.getState();
      if (st === 'won' || st === 'lost' || st === 'aim') break;
      s.update(TUNING.dt);
    }
  }
  for (let i = 0; i < 60 * 3; i++) {
    const st = s.getState();
    if (st === 'won' || st === 'lost') return st;
    s.update(TUNING.dt);
  }
  return `${s.getState()}:${s.getSim()?.pigsAlive() ?? '?'}`;
}

describe('pouch replay of committed solutions', () => {
  it('powder-row clears from the recorded pouch shot', () => {
    expect(pouchClear('powder-row', book['powder-row']!.shots)).toBe('won');
  });

  it('first-flight clears from the known pouch shot', () => {
    expect(pouchClear('first-flight', [{ angleDeg: 34, speed: 20 }])).toBe('won');
  });

  it('glass-house clears in two pouch shots', () => {
    expect(
      pouchClear('glass-house', [
        { angleDeg: 18, speed: 18 },
        { angleDeg: 28, speed: 22 },
      ])
    ).toBe('won');
  });

  it('twin-posts clears in two pouch shots', () => {
    expect(
      pouchClear('twin-posts', [
        { angleDeg: 18, speed: 18 },
        { angleDeg: 28, speed: 22 },
      ])
    ).toBe('won');
  });

  it('heavy-gate clears from a low pouch shot', () => {
    expect(pouchClear('heavy-gate', [{ angleDeg: 16, speed: 16 }])).toBe('won');
  });
});
