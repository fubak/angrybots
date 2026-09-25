import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { TUNING } from '../../src/config/tuning';
import { levelById } from '../../src/levels/registry';
import { launchVelocity, pouchForLaunch } from '../../src/sling/launch';
import pouchBook from '../../src/levels/pouch-solutions.json';

type Sol = { angleDeg: number; speed: number; abilityAt?: number }[];
const book = (pouchBook as { found: Record<string, Sol> }).found;

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
    for (let i = 0; i < 60 * 12; i++) {
      const st = s.getState();
      if (st === 'won' || st === 'lost' || st === 'aim') break;
      s.update(TUNING.dt);
    }
  }
  for (let i = 0; i < 60 * 4; i++) {
    const st = s.getState();
    if (st === 'won' || st === 'lost') return st;
    s.update(TUNING.dt);
  }
  return `${s.getState()}:${s.getSim()?.pigsAlive() ?? '?'}`;
}

describe('pouch replay of committed solutions', () => {
  it('powder-row clears from the recorded pouch shot', () => {
    expect(pouchClear('powder-row', book['powder-row']!)).toBe('won');
  });

  it('first-flight clears from the recorded pouch shot', () => {
    expect(pouchClear('first-flight', book['first-flight']!)).toBe('won');
  });

  it('glass-house clears from the recorded pouch shot', () => {
    expect(pouchClear('glass-house', book['glass-house']!)).toBe('won');
  });

  it('twin-posts clears from the recorded pouch shots', () => {
    expect(pouchClear('twin-posts', book['twin-posts']!)).toBe('won');
  });

  it('heavy-gate clears from the recorded pouch shot', () => {
    expect(pouchClear('heavy-gate', book['heavy-gate']!)).toBe('won');
  });
});
