import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { levelById } from '../../src/levels/registry';
import { TUNING } from '../../src/config/tuning';
import { launchVelocity, pouchForLaunch } from '../../src/sling/launch';

function finishShot(session: GameSession): void {
  for (let i = 0; i < 90 * 60; i++) {
    const st = session.getState();
    if (st === 'won' || st === 'lost' || st === 'aim') return;
    session.update(TUNING.dt);
  }
}

describe('First Flight pouch launches', () => {
  it('34deg at speed 20 from the pouch wins', () => {
    const def = levelById('first-flight')!;
    const s = new GameSession();
    s.loadLevel(def, true);
    const p = pouchForLaunch(34, 20);
    const lv = launchVelocity(p.pull);
    expect(lv).not.toBeNull();
    s.launchFromPull(lv!.vx, lv!.vy, p.x, p.y);
    finishShot(s);
    expect(s.getState()).toBe('won');
    expect(s.getSim()!.pigsAlive()).toBe(0);
  });
});
