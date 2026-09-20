import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { levelById } from '../../src/levels/registry';
import { TUNING } from '../../src/config/tuning';
import solutions from '../../src/levels/solutions.json';

function stepSession(session: GameSession, seconds: number): void {
  const steps = Math.ceil(seconds / TUNING.dt);
  for (let i = 0; i < steps; i++) session.update(TUNING.dt);
}

describe('GameSession rules', () => {
  it('First Flight solution reaches won with expected score', () => {
    const def = levelById('first-flight')!;
    const sol = solutions['first-flight'];
    const session = new GameSession();
    session.loadLevel(def, true);
    const shot = sol.shots[0]!;
    session.launch(shot.angleDeg, shot.speed);
    stepSession(session, 25);
    expect(['resolve', 'bonus', 'won']).toContain(session.getState());
    stepSession(session, 15);
    expect(session.getState()).toBe('won');
    const expected = sol.score;
    expect(session.getScore()).toBeGreaterThan(expected * 0.995);
    expect(session.getScore()).toBeLessThan(expected * 1.005);
  });

  it('three weak shots leads to lost', () => {
    const def = levelById('first-flight')!;
    const session = new GameSession();
    session.loadLevel(def, true);
    for (let i = 0; i < 3; i++) {
      session.launch(80, 10);
      stepSession(session, 20);
      while (session.getState() === 'flight' || session.getState() === 'resolve') {
        session.update(TUNING.dt);
      }
      if (session.getState() === 'nextBot') {
        stepSession(session, 1);
      }
    }
    expect(session.getState()).toBe('lost');
  });

  it('restart during flight resets score', () => {
    const def = levelById('first-flight')!;
    const session = new GameSession();
    session.loadLevel(def, true);
    session.launch(34, 18);
    stepSession(session, 0.5);
    session.restart();
    expect(session.getScore()).toBe(0);
    expect(session.getState()).toBe('aim');
  });
});
