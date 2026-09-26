import type { LevelV2 } from '../levels/schema';
import { TUNING } from '../config/tuning';
import { Level } from './Level';
import { starsForScore } from './Scoring';
import type { GameStateId } from './states';
import { SLING_HOP_SECONDS } from '../sling/launch';
import { StateMachine } from '../core/StateMachine';
import { SESSION_TRANSITIONS } from './sessionTransitions';
import { activate, type AbilityContext } from '../bots/abilities';
import type { BotEntity } from '../entities/types';
import { spawnBotAt } from '../entities/Bot';
export type { GameStateId };

/** Level-intro beat length — structure close-up hold + pan to the sling. */
export const INTRO_SECONDS = 2.8;
const INTRO_SKIP_MS = 0;
const RESOLVE_MAX_S = 10;
const SHOT_SLOW_HOLD = 0.5;
const SHOT_MAX_S = 12;

function makeSessionFsm(initial: GameStateId): StateMachine<GameStateId> {
  const table = Object.fromEntries(
    (Object.keys(SESSION_TRANSITIONS) as GameStateId[]).map((id) => [
      id,
      { next: SESSION_TRANSITIONS[id] },
    ])
  ) as Record<GameStateId, { next: GameStateId[] }>;
  return new StateMachine(initial, table);
}

export class GameSession {
  private fsm: StateMachine<GameStateId>;
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
  private launchTime = 0;
  private shotSlowTime = 0;
  private primaryShotBotId: string | null = null;

  constructor() {
    this.fsm = makeSessionFsm('intro');
  }

  get state(): GameStateId {
    return this.fsm.current;
  }

  private transition(to: GameStateId): void {
    this.fsm.go(to);
  }

  getSim(): Level | null {
    return this.sim;
  }

  getBotQueue(): readonly LevelV2['bots'][number][] {
    return this.botQueue;
  }

  loadLevel(def: LevelV2, skipIntro = false): void {
    this.levelDef = def;
    this.sim = Level.load(def);
    this.sim.settle();
    this.botQueue = [...def.bots];
    this.score = 0;
    this.bonus = 0;
    this.quietTime = 0;
    this.resolveTime = 0;
    this.flightTime = 0;
    this.shotSlowTime = 0;
    this.primaryShotBotId = null;
    this.introTimer = skipIntro ? 0 : INTRO_SECONDS;
    this.fsm = makeSessionFsm(skipIntro ? 'aim' : 'intro');
  }

  restart(): void {
    if (!this.levelDef) return;
    this.loadLevel(this.levelDef, true);
  }

  launch(angleDeg: number, speed: number): void {
    if (this.state !== 'aim' || !this.sim || this.botQueue.length === 0) return;
    const kind = this.botQueue[0]!;
    this.launchFromAnchor(angleDeg, speed, kind);
  }

  launchFromPull(vx: number, vy: number, x: number, y: number): void {
    if (this.state !== 'aim' || !this.sim || this.botQueue.length === 0) return;
    const kind = this.botQueue[0]!;
    const bot = spawnBotAt(this.sim.pw.world, x, y, vx, vy, kind, `bot-${kind}-${Date.now()}`);
    this.sim.registry.add(bot);
    this.beginFlight(kind, bot);
  }

  private launchFromAnchor(angleDeg: number, speed: number, kind: LevelV2['bots'][number]): void {
    if (!this.sim) return;
    const bot = this.sim.launchBot(angleDeg, speed, kind);
    this.beginFlight(kind, bot);
  }

  private beginFlight(_kind: LevelV2['bots'][number], bot: BotEntity): void {
    if (!this.sim) return;
    this.transition('flight');
    this.flightTime = 0;
    this.shotSlowTime = 0;
    this.launchTime = this.sim.getSimTime();
    this.primaryShotBotId = bot.id;
    this.botQueue.shift();
    this.score = this.sim.hooks.score;
  }

  activateAbility(): void {
    if (this.state !== 'flight' || !this.sim) return;
    const bots = this.activeShotBots();
    const bot = bots[0];
    if (!bot) return;
    const ctx: AbilityContext = {
      level: this.sim,
      simTime: this.sim.getSimTime(),
      launchTime: this.launchTime,
      emit: (_name, payload) => this.sim!.bus.emit('bot:ability', payload),
    };
    activate(bot, ctx);
  }

  private activeShotBots(): BotEntity[] {
    if (!this.sim) return [];
    const all = this.sim.shotBots();
    if (this.primaryShotBotId) {
      const primary = all.find((b) => b.id === this.primaryShotBotId);
      if (primary?.alive) return [primary, ...all.filter((b) => b.spawnedFrom === primary.id)];
    }
    return all;
  }

  private shotHasImpacted(): boolean {
    return (this.sim?.shotBots() ?? []).some((b) => b.firstImpactAt !== null);
  }

  /** A rolling bot on flat ground stays above a full stop for seconds. Once the targets are gone, that crawl is not part of the shot. */
  private isFlightDone(dt: number): boolean {
    if (!this.sim) return true;
    if (this.flightTime >= SHOT_MAX_S) return true;
    const bots = this.sim.shotBots().filter((b) => b.alive && b.body);
    if (bots.length === 0) return true;
    let maxSpeed = 0;
    for (const b of bots) maxSpeed = Math.max(maxSpeed, b.body!.getLinearVelocity().length());
    const cleared = this.sim.pigsAlive() === 0 && this.shotHasImpacted();
    const limit = cleared ? 4.5 : this.shotHasImpacted() ? 0.8 : 0.35;
    const hold = cleared ? 0.12 : SHOT_SLOW_HOLD;
    if (maxSpeed <= limit) {
      this.shotSlowTime += dt;
      return this.shotSlowTime >= hold;
    }
    this.shotSlowTime = 0;
    return false;
  }

  update(dt: number): void {
    if (!this.sim || !this.levelDef) return;
    if (this.state === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= INTRO_SKIP_MS) this.transition('aim');
      return;
    }
    if (this.state === 'flight') {
      this.flightTime += dt;
      this.sim.step();
      this.score = this.sim.hooks.score;
      if (this.isFlightDone(dt)) {
        this.transition('resolve');
        this.quietTime = 0;
        this.resolveTime = 0;
      }
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
      if (this.hopTimer <= 0) this.transition('aim');
      return;
    }
    if (this.state === 'bonus') {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0) this.transition('won');
      return;
    }
  }

  skipIntro(): void {
    if (this.state === 'intro') this.transition('aim');
  }

  private finishResolve(): void {
    if (!this.sim || !this.levelDef) return;
    const pigsLeft = this.sim.pigsAlive();
    const botsLeft = this.botQueue.length;
    if (pigsLeft === 0) {
      this.bonus = botsLeft * 10000;
      this.score += this.bonus;
      if (botsLeft > 0) {
        this.transition('bonus');
        this.hopTimer = botsLeft * 0.5;
      } else {
        this.transition('won');
      }
      return;
    }
    if (botsLeft > 0) {
      this.transition('nextBot');
      this.hopTimer = SLING_HOP_SECONDS;
      return;
    }
    this.transition('lost');
  }

  getScore(): number {
    return this.score;
  }

  getBonus(): number {
    return this.bonus;
  }

  getStars(): 0 | 1 | 2 | 3 {
    if (!this.levelDef) return 0;
    const won = this.state === 'won' || this.state === 'bonus';
    return starsForScore(this.score, this.levelDef.stars, won);
  }

  getState(): GameStateId {
    return this.state;
  }

  getLoadedBotKind(): LevelV2['bots'][number] | null {
    return this.botQueue[0] ?? null;
  }

  getPrimaryAbilityUsed(): boolean {
    if (!this.sim || !this.primaryShotBotId) return false;
    const all = this.sim.shotBots();
    const primary = all.find((b) => b.id === this.primaryShotBotId);
    if (primary) return primary.abilityUsed;
    return all.some((b) => b.spawnedFrom === this.primaryShotBotId);
  }
}
