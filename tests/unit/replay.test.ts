import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/game/GameSession';
import { TUNING } from '../../src/config/tuning';
import { launchVelocity, pouchForLaunch } from '../../src/sling/launch';
import { levelById } from '../../src/levels/registry';
import { isReplay, REPLAY_LIMITS, type Replay } from '../../src/game/replay';
import { replayRun } from '../../src/game/replayRun';
import solutions from '../../src/levels/solutions.json';

type Shot = { angleDeg: number; speed: number; abilityAt?: number };
const book = solutions as Record<string, { shots: Shot[]; score: number }>;

/** Drive a solution exactly like tools/pouch-solve.ts does. */
function playSolution(levelId: string): { s: GameSession; replay: Replay } {
  const def = levelById(levelId)!;
  const shots = book[levelId]!.shots;
  const s = new GameSession();
  s.loadLevel(def, true);
  for (const shot of shots) {
    for (let i = 0; i < 60 && s.getState() !== 'aim'; i++) s.update(TUNING.dt);
    if (s.getState() !== 'aim') break;
    const p = pouchForLaunch(shot.angleDeg, shot.speed);
    const lv = launchVelocity(p.pull)!;
    s.launchFromPull(lv.vx, lv.vy, p.x, p.y);
    let fired = shot.abilityAt == null;
    for (let i = 0; i < 60 * 10; i++) {
      if (!fired && i * TUNING.dt >= shot.abilityAt!) {
        s.activateAbility();
        fired = true;
      }
      const st = s.getState();
      if (st === 'won' || st === 'lost' || st === 'aim' || st === 'bonus' || st === 'nextBot') break;
      s.update(TUNING.dt);
    }
    const st = s.getState();
    if (st === 'won' || st === 'bonus' || st === 'lost') break;
  }
  for (let i = 0; i < 60 * 3; i++) {
    const st = s.getState();
    if (st === 'won' || st === 'bonus' || st === 'lost') break;
    s.update(TUNING.dt);
  }
  const replay = s.getReplay();
  expect(replay).not.toBeNull();
  return { s, replay: replay! };
}

const CASES = Object.keys(book).filter((id) => book[id]!.shots.length >= 1);

/** Drive a run and fire the ability mid-flight — no stored solution uses
 *  abilityAt, so we synthesize one (outcome may be won or lost; the test
 *  only checks the replay reproduces the run). */
function playWithAbility(levelId: string): { s: GameSession; replay: Replay } {
  const def = levelById(levelId)!;
  const shots = book[levelId]!.shots;
  const s = new GameSession();
  s.loadLevel(def, true);
  let usedAbility = false;
  for (const shot of shots) {
    for (let i = 0; i < 60 && s.getState() !== 'aim'; i++) s.update(TUNING.dt);
    if (s.getState() !== 'aim') break;
    const p = pouchForLaunch(shot.angleDeg, shot.speed);
    const lv = launchVelocity(p.pull)!;
    s.launchFromPull(lv.vx, lv.vy, p.x, p.y);
    for (let i = 0; i < 60 * 10; i++) {
      if (!usedAbility && i === 30) {
        s.activateAbility();
        usedAbility = true;
      }
      const st = s.getState();
      if (st === 'won' || st === 'lost' || st === 'aim' || st === 'bonus' || st === 'nextBot') break;
      s.update(TUNING.dt);
    }
    const st = s.getState();
    if (st === 'won' || st === 'bonus' || st === 'lost') break;
  }
  for (let i = 0; i < 60 * 3; i++) {
    const st = s.getState();
    if (st === 'won' || st === 'bonus' || st === 'lost') break;
    s.update(TUNING.dt);
  }
  const replay = s.getReplay();
  expect(replay).not.toBeNull();
  return { s, replay: replay! };
}

describe('replay recording + verification', () => {
  it.each(CASES.slice(0, 4))('round-trips solution for %s', (id) => {
    const def = levelById(id)!;
    const { s, replay } = playSolution(id);
    const out = replayRun(def, replay);
    expect(out.state).toBe(s.getState());
    expect(out.score).toBe(s.getScore());
    expect(out.stars).toBe(s.getStars());
  });

  it.each(['dash-bridge', 'split-lesson'])(
    'records and replays ability events (%s)',
    (id) => {
      const { s, replay } = playWithAbility(id);
      expect(replay.events.some((e) => e.k === 'ability')).toBe(true);
      const out = replayRun(levelById(id)!, replay);
      expect(out.state).toBe(s.getState());
      expect(out.score).toBe(s.getScore());
    }
  );

  it('tampered launch changes the outcome', () => {
    const id = CASES[0]!;
    const { s, replay } = playSolution(id);
    const tampered: Replay = structuredClone(replay);
    const launch = tampered.events.find((e) => e.k === 'launch')!;
    if (launch.k === 'launch') launch.vx += 1;
    const out = replayRun(levelById(id)!, tampered);
    const won = (st: string) => st === 'won' || st === 'bonus';
    expect(
      out.score !== s.getScore() || !won(out.state)
    ).toBe(true);
  });

  it('truncated replay does not verify a win', () => {
    const id = CASES[0]!;
    const { replay } = playSolution(id);
    const out = replayRun(levelById(id)!, { ...replay, steps: 1 });
    expect(out.state === 'won' || out.state === 'bonus').toBe(false);
  });

  it('isReplay accepts a real recorded replay', () => {
    const { replay } = playSolution(CASES[0]!);
    expect(isReplay(replay)).toBe(true);
  });

  it('isReplay rejects malformed payloads', () => {
    const { replay } = playSolution(CASES[0]!);
    const launch = replay.events.find((e) => e.k === 'launch')!;
    expect(isReplay({ ...replay, v: 2 })).toBe(false);
    expect(isReplay({ ...replay, steps: REPLAY_LIMITS.maxSteps + 1 })).toBe(false);
    expect(isReplay({ ...replay, steps: 0 })).toBe(false);
    expect(
      isReplay({
        ...replay,
        events: Array.from({ length: REPLAY_LIMITS.maxEvents + 1 }, () => ({
          t: 0,
          k: 'ability',
        })),
      })
    ).toBe(false);
    // unsorted t
    expect(
      isReplay({
        ...replay,
        events: [
          { t: 3, k: 'ability' },
          { t: 1, k: 'ability' },
        ],
      })
    ).toBe(false);
    // NaN coords
    expect(
      isReplay({
        ...replay,
        events: [{ ...launch, vx: Number.NaN }],
      })
    ).toBe(false);
    // t > steps
    expect(
      isReplay({ ...replay, events: [{ t: replay.steps + 1, k: 'ability' }] })
    ).toBe(false);
  });
});
