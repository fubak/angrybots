import type { LevelV2 } from '../levels/schema';
import { TUNING } from '../config/tuning';
import { Level } from './Level';
import { starsForScore } from './Scoring';
import type { GameStateId } from './states';

export type { GameStateId };

const INTRO_SKIP_MS = 0;
const RESOLVE_MAX_S = 10;

export class GameSession {
  state: GameStateId = 'intro';
  private levelDef: LevelV2 | null = null;
  private sim: Level | null = null;
  private botQueue: LevelV2['bots'] = [];
  private score = 0;
  private bonus = 0;
  private quietTime = 0;
  private resolveTime = 0;
  private flightTime = 0;
  private introTimer = 0;
  private hopTimer = 0;

  loadLevel(def: LevelV2, skipIntro = false): void {
    this.levelDef = def;
    this.sim = Level.load(def);
    this.sim.settle();
    this.botQueue = [...def.bots];
    this.score = 0;
    this.bonus = 0;
    this.quietTime = 0;
    this.resolveTime = 0;
    this.state = skipIntro ? 'aim' : 'intro';
    this.introTimer = skipIntro ? 0 : 2.2;
  }

  restart(): void {
    if (!this.levelDef) return;
    this.loadLevel(this.levelDef, true);
  }

  launch(angleDeg: number, speed: number): void {
    if (this.state !== 'aim' || !this.sim || this.botQueue.length === 0) return;
    const kind = this.botQueue[0]!;
    this.state = 'flight';
    this.flightTime = 0;
    this.sim.runShot(angleDeg, speed, kind);
    this.score = this.sim.hooks.score;
    this.botQueue.shift();
    this.state = 'resolve';
    this.quietTime = 0;
    this.resolveTime = 0;
  }

  activateAbility(): void {
    /* abilities wired in SLG-04 */
  }

  update(dt: number): void {
    if (!this.sim || !this.levelDef) return;
    if (this.state === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= INTRO_SKIP_MS) this.state = 'aim';
      return;
    }
    if (this.state === 'flight') {
      this.flightTime += dt;
      return;
    }
    if (this.state === 'resolve') {
      this.sim.step();
      this.score = this.sim.hooks.score;
      this.resolveTime += dt;
      if (this.sim.isWorldQuiet()) this.quietTime += dt;
      else this.quietTime = 0;
      if (this.quietTime >= TUNING.quiet.holdSeconds || this.resolveTime >= RESOLVE_MAX_S) {
        this.finishResolve();
      }
      return;
    }
    if (this.state === 'nextBot') {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0) this.state = 'aim';
      return;
    }
    if (this.state === 'bonus') {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0) this.state = 'won';
      return;
    }
  }

  private finishResolve(): void {
    if (!this.sim || !this.levelDef) return;
    const pigsLeft = this.sim.pigsAlive();
    const botsLeft = this.botQueue.length;
    if (pigsLeft === 0) {
      this.bonus = botsLeft * 10000;
      this.score += this.bonus;
      if (botsLeft > 0) {
        this.state = 'bonus';
        this.hopTimer = botsLeft * 0.5;
      } else {
        this.state = 'won';
      }
      return;
    }
    if (botsLeft > 0) {
      this.state = 'nextBot';
      this.hopTimer = 0.75;
      return;
    }
    this.state = 'lost';
  }

  getScore(): number {
    return this.score;
  }

  getStars(): 0 | 1 | 2 | 3 {
    if (!this.levelDef) return 0;
    const won = this.state === 'won' || this.state === 'bonus';
    return starsForScore(this.score, this.levelDef.stars, won);
  }

  getState(): GameStateId {
    return this.state;
  }
}
