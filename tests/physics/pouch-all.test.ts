import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { TUNING } from '../../src/config/tuning';
import { allLevels, levelById } from '../../src/levels/registry';
import { launchVelocity, pouchForLaunch } from '../../src/sling/launch';
import pouchBook from '../../src/levels/pouch-solutions.json';

type Shot = { angleDeg: number; speed: number; abilityAt?: number };
const found = (pouchBook as { found: Record<string, Shot[]> }).found;

function pouchClear(id: string, shots: Shot[]): string {
  const def = levelById(id);
  if (!def) return 'missing';
  const s = new GameSession();
  s.loadLevel(def, true);
  for (const shot of shots) {
    for (let i = 0; i < 60 && s.getState() !== 'aim'; i++) s.update(TUNING.dt);
    if (s.getState() !== 'aim') return s.getState();
    const p = pouchForLaunch(shot.angleDeg, shot.speed);
    const lv = launchVelocity(p.pull);
    if (!lv) return 'no-velocity';
    s.launchFromPull(lv.vx, lv.vy, p.x, p.y);
    let fired = shot.abilityAt == null;
    // Real-play bound: a shot may resolve for up to SHOT_MAX_S (14s) before the
    // session hands back 'aim'; slow collapses must not be truncated here.
    for (let i = 0; i < 60 * 12; i++) {
      if (!fired && i * TUNING.dt >= shot.abilityAt!) {
        s.activateAbility();
        fired = true;
      }
      const st = s.getState();
      if (st === 'won' || st === 'lost' || st === 'aim' || st === 'bonus' || st === 'nextBot') break;
      s.update(TUNING.dt);
    }
    if (s.getState() === 'won' || s.getState() === 'bonus' || s.getState() === 'lost') break;
  }
  for (let i = 0; i < 60 * 4; i++) {
    const st = s.getState();
    if (st === 'won' || st === 'bonus') return 'won';
    if (st === 'lost') return 'lost';
    s.update(TUNING.dt);
  }
  return `${s.getState()}:${s.getSim()?.pigsAlive() ?? '?'}`;
}

describe('pouch clears for the campaign', () => {
  it('has a pouch plan for every level', () => {
    const ids = allLevels().map((l) => l.id);
    expect(Object.keys(found).sort()).toEqual([...ids].sort());
  });

  for (const level of allLevels()) {
    it(`${level.id} clears from the pouch`, () => {
      expect(pouchClear(level.id, found[level.id]!)).toBe('won');
    });
  }
});
