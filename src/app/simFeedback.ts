import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../game/events';
import type { GameStateId } from '../game/states';
import type { GameSession } from '../game/GameSession';
import type { SaveStore } from '../game/SaveStore';
import type { Level } from '../game/Level';
import type { CameraDirector } from '../camera/CameraDirector';
import type { Renderer } from '../render/Renderer';
import type { ShotTrail } from '../sling/ShotTrail';
import type { SoundBank } from '../audio/SoundBank';
import type { View } from '../camera/fitRect';
import { PALETTE } from '../config/render';
import { TUNING } from '../config/tuning';
import { evaluateAchievements } from '../game/achievements';

export type RunResult = {
  won: boolean;
  score: number;
  stars: number;
  newBest: boolean;
  canSkip: boolean;
  bonus: number;
  unlockIds: string[];
};

export type SimFeedbackDeps = {
  session: GameSession;
  save: SaveStore;
  audio: SoundBank;
  renderer: Renderer;
  camera: CameraDirector;
  trail: ShotTrail;
  reducedMotion: () => boolean;
  getView: () => View;
  onLaunch: () => void;
};

/**
 * Owns the sim-event → juice/audio/stat wiring and the per-run counters
 * (combo, TNT chain, king kill, hit-stop/slow-mo windows, impact center).
 * App binds it once per level and reads back the stats for achievements.
 */
export class SimFeedback {
  shotsFired = 0;
  shotDestroyed = 0;
  maxCombo = 0;
  shotTnt = 0;
  maxTntChain = 0;
  kingKilled = false;
  impactCenter: { x: number; y: number } | null = null;
  hitStopLeft = 0;
  slowMoLeft = 0;
  private resultRecorded = false;
  private destroyedTimes: number[] = [];
  private readonly deps: SimFeedbackDeps;

  constructor(deps: SimFeedbackDeps) {
    this.deps = deps;
  }

  resetLevel(): void {
    this.shotsFired = 0;
    this.maxCombo = 0;
    this.maxTntChain = 0;
    this.kingKilled = false;
    this.impactCenter = null;
    this.hitStopLeft = 0;
    this.slowMoLeft = 0;
    this.resultRecorded = false;
    this.resetShot();
  }

  resetShot(): void {
    this.shotDestroyed = 0;
    this.shotTnt = 0;
    this.destroyedTimes.length = 0;
  }

  /**
   * Records the level outcome once the session hits won/lost: persists
   * progress, evaluates achievements, returns the run result (null while
   * still in play or if already recorded).
   */
  recordResult(
    levelId: string | null,
    levelRefs: readonly { id: string; chapter: string }[]
  ): RunResult | null {
    const { session, save } = this.deps;
    const state = session.getState();
    if (state !== 'won' && state !== 'lost') return null;
    if (this.resultRecorded) return null;
    this.resultRecorded = true;
    const won = state === 'won';
    const stars = session.getStars();
    const score = session.getScore();
    let newBest = false;
    let canSkip = false;
    if (levelId) {
      const prev = save.levelProgress(levelId);
      newBest = won && score > (prev?.bestScore ?? 0);
      save.recordLevel(levelId, score, stars, won);
      if (won) {
        save.setBestCombo(this.maxCombo);
      } else {
        save.recordFail(levelId);
        canSkip = save.canSkip(levelId, levelRefs);
      }
    }
    const unlockIds: string[] = [];
    if (levelId) {
      const fresh = evaluateAchievements(
        {
          levelId,
          won,
          stars,
          shotsUsed: this.shotsFired,
          botsUnused: session.getBotQueue().length,
          maxCombo: this.maxCombo,
          maxTntChain: this.maxTntChain,
          kingKilled: this.kingKilled,
        },
        save,
        save.achievements,
        levelRefs
      );
      for (const id of fresh) {
        if (save.unlockAchievement(id)) unlockIds.push(id);
      }
    }
    return { won, score, stars, newBest, canSkip, bonus: session.getBonus(), unlockIds };
  }

  /** App-level bus: launch / aim / cancel feedback. */
  bindAppBus(bus: EventBus<GameEvents>): void {
    const { audio, save, trail } = this.deps;
    bus.on('bot:firstImpact', (e) => {
      audio.play('impact');
      this.deps.renderer.juice.burst('dust', e.x, e.y);
    });
    bus.on('bot:launched', () => {
      trail.onLaunch();
      audio.play('launch');
      audio.play('yell');
      audio.tension(0);
      this.resetShot();
      this.shotsFired += 1;
      save.addShot();
      this.deps.onLaunch();
    });
    bus.on('sling:aimUpdate', (e) => audio.tension(e.tension));
    bus.on('sling:cancel', () => {
      audio.tension(0);
      audio.play('cancel');
    });
  }

  /** Structure hits own the collapse camera. Ground and sling skims do not. */
  private noteStrike(x: number, y: number): void {
    if (x < TUNING.sling.x + 2.5) return;
    const prev = this.impactCenter;
    this.impactCenter = { x, y };
    if (!prev || Math.hypot(x - prev.x, y - prev.y) > 0.6) this.deps.camera.addTrauma(0.55);
  }

  bindSim(sim: Level): void {
    const { audio, save, renderer, session } = this.deps;
    const state = (): GameStateId => session.getState();
    sim.bus.on('block:destroyed', (e) => {
      this.noteStrike(e.x, e.y);
      audio.play(`break:${e.material}`);
      save.addDestroyed(e.material);
      renderer.juice.burst(e.material, e.x, e.y, e.material === 'tnt' ? 1.4 : 1);
      if (e.points > 0) {
        const color =
          e.material === 'stone'
            ? PALETTE.score.stone
            : e.material === 'glass'
              ? PALETTE.score.glass
              : e.material === 'tnt'
                ? PALETTE.score.bonus
                : PALETTE.score.wood;
        renderer.juice.textSprite(e.x, e.y, `+${e.points}`, color);
      }
      const s = state();
      if (s === 'flight' || s === 'resolve') {
        this.shotDestroyed += 1;
        this.maxCombo = Math.max(this.maxCombo, this.shotDestroyed);
        if (e.material === 'tnt') {
          this.shotTnt += 1;
          this.maxTntChain = Math.max(this.maxTntChain, this.shotTnt);
        }
        if (this.shotDestroyed >= 3) {
          const view = this.deps.getView();
          renderer.juice.textSprite(
            view.cx,
            view.cy + view.h * 0.3,
            `COMBO x${this.shotDestroyed}`,
            PALETTE.score.bonus,
            1.35
          );
        }
        const now = performance.now() / 1000;
        this.destroyedTimes.push(now);
        this.destroyedTimes = this.destroyedTimes.filter((t) => now - t <= 0.5);
        if (this.destroyedTimes.length >= 4 && !this.deps.reducedMotion()) this.slowMoLeft = 0.8;
      }
    });
    sim.bus.on('pig:destroyed', (e) => {
      this.noteStrike(e.x, e.y);
      audio.play('pig');
      const entity = sim.registry.all().find((x) => x.id === e.id);
      if (entity?.kind === 'pig' && entity.king) {
        this.kingKilled = true;
        save.addKing();
      }
      renderer.juice.burst('pig', e.x, e.y);
      if (e.points > 0) {
        renderer.juice.textSprite(e.x, e.y + 0.35, `+${e.points.toLocaleString()}`, PALETTE.score.pig, 1.45);
      }
    });
    sim.bus.on('pig:damaged', (e) => {
      this.noteStrike(e.x, e.y);
      if (e.hpRatio > 0) renderer.juice.impactStars(e.x, e.y + 0.4);
    });
    sim.bus.on('block:damaged', (e) => {
      this.noteStrike(e.x, e.y);
      audio.play(`impact:${e.material}`);
    });
    sim.bus.on('block:landed', (e) => {
      renderer.juice.burst('dust', e.x, e.y);
    });
    sim.bus.on('explosion', (e) => {
      this.noteStrike(e.x, e.y);
      audio.play('explosion');
      renderer.juice.explosion(e.x, e.y, e.radius);
      this.deps.camera.addTrauma(0.9);
      if (!this.deps.reducedMotion()) this.hitStopLeft = 0.06;
    });
    sim.bus.on('bot:ability', (e) => {
      audio.play('ability');
      renderer.pulseBot(e.botId);
    });
    sim.bus.on('bot:firstImpact', (e) => {
      audio.play('impact');
      renderer.juice.flash(e.x, e.y, '#fff2d8');
      this.deps.trail.noteImpact(sim.getSimTime(), e.x, e.y);
    });
  }
}
