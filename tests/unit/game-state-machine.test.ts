import { describe, expect, it } from 'vitest';
import { StateMachine } from '../../src/core/StateMachine';
import { SESSION_TRANSITIONS } from '../../src/game/sessionTransitions';
import type { GameStateId } from '../../src/game/states';
import { GameSession } from '../../src/game/GameSession';
import { levelById } from '../../src/levels/registry';
import { TUNING } from '../../src/config/tuning';

describe('GameSession state machine', () => {
  it('throws on illegal transitions', () => {
    const table = Object.fromEntries(
      (Object.keys(SESSION_TRANSITIONS) as GameStateId[]).map((id) => [
        id,
        { next: SESSION_TRANSITIONS[id] },
      ])
    ) as Record<GameStateId, { next: GameStateId[] }>;
    const sm = new StateMachine('aim', table);
    expect(() => sm.go('won')).toThrow(/Illegal transition/);
  });

  it('pausing in flight does not advance bot position', () => {
    const def = levelById('first-flight');
    expect(def).toBeDefined();
    const session = new GameSession();
    session.loadLevel(def!, true);
    session.launch(34, 18);
    expect(session.getState()).toBe('flight');
    const sim = session.getSim()!;
    const bot = sim.shotBots()[0]!;
    const p0 = bot.body!.getPosition().clone();
    const v0 = bot.body!.getLinearVelocity().clone();
    for (let i = 0; i < 300; i++) {
      /* paused: no session.update */
    }
    session.update(TUNING.dt);
    const p1 = bot.body!.getPosition();
    expect(p1.x).toBeGreaterThan(p0.x);
    const v1 = bot.body!.getLinearVelocity();
    expect(v1.length()).toBeGreaterThan(0);
    expect(v0.length()).toBeCloseTo(v1.length(), 0);
  });
});
