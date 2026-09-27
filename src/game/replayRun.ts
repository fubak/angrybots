/**
 * Deterministic re-execution of a recorded run — lives in its own module to
 * avoid a GameSession ↔ replay.ts import cycle.
 */
import { TUNING } from '../config/tuning';
import type { LevelV2 } from '../levels/schema';
import { GameSession, type GameStateId } from './GameSession';
import type { Replay } from './replay';

/**
 * Replays `replay` against `def` and returns the resulting state/score/stars.
 * Events with t === i are applied BEFORE step i's update — matching how the
 * recorder stamps events that arrive between ticks.
 */
export function replayRun(
  def: LevelV2,
  replay: Replay
): { state: GameStateId; score: number; stars: 0 | 1 | 2 | 3 } {
  const s = new GameSession();
  s.loadLevel(def, true);
  let ei = 0;
  for (let i = 0; i < replay.steps; i++) {
    while (ei < replay.events.length && replay.events[ei]!.t === i) {
      const e = replay.events[ei]!;
      if (e.k === 'launch') s.launchFromPull(e.vx, e.vy, e.x, e.y);
      else s.activateAbility();
      ei++;
    }
    s.update(TUNING.dt);
  }
  return { state: s.getState(), score: s.getScore(), stars: s.getStars() };
}
