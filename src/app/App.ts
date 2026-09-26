import '../ui/styles.css';
import { EventBus } from '../core/EventBus';
import { FixedStepLoop } from '../core/FixedStepLoop';
import { PALETTE } from '../config/render';
import { TUNING } from '../config/tuning';
import type { GameEvents } from '../game/events';
import { GameSession } from '../game/GameSession';
import { SaveStore } from '../game/SaveStore';
import { allLevels, levelById, nextLevel } from '../levels/registry';
import { CameraDirector } from '../camera/CameraDirector';
import { CameraGestures, gestureLimitsFor } from '../camera/CameraGestures';
import { Renderer } from '../render/Renderer';
import { SlingInput, clientToWorld } from '../sling/SlingInput';
import { ShotTrail } from '../sling/ShotTrail';
import { SoundBank } from '../audio/SoundBank';
import { createDebugApi } from '../debug/DebugApi';
import { effectiveReducedMotion } from './motion';
import { achievementById } from '../game/achievements';
import { achievementBadge } from '../ui/Achievements';
import { firstUnseenBotInQueue } from '../bots/tutorialTips';
import { botStickerCanvas } from '../render/botArt';
import { RotatePrompt } from '../ui/RotatePrompt';
import { Splash } from '../ui/Splash';
import { type View } from '../camera/fitRect';
import type { BotKind } from '../levels/schema';
import { SimFeedback } from './simFeedback';
import { AppScreens, botImage, pigImage, tipFor, type AppPhase } from './screens';
import { track } from '../analytics';
import { currentStreak, localDateString, pickDailyLevel } from '../game/daily';

export class App {
  private readonly bus = new EventBus<GameEvents>();
  private readonly session = new GameSession();
  private readonly save = new SaveStore();
  private readonly camera = new CameraDirector();
  private readonly trail = new ShotTrail();
  private readonly audio = new SoundBank();
  private readonly rotate = new RotatePrompt();
  private readonly fx: SimFeedback;
  private readonly screens: AppScreens;

  private readonly shell: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly uiRoot: HTMLElement;
  private readonly renderer: Renderer;
  private readonly sling: SlingInput;
  private readonly loop: FixedStepLoop;

  private phase: AppPhase = 'title';
  private levelId: string | null = null;
  private daily: { date: string; levelId: string } | null = null;
  private introElapsed = 0;
  private currentView: View = { cx: 0, cy: 5, h: 12 };
  private paused = false;
  private backgrounded = false;
  private resultDelay = 0;
  private pendingResult: {
    won: boolean;
    score: number;
    stars: number;
    newBest: boolean;
    canSkip: boolean;
    daily?: { best: number; streak: number };
  } | null = null;
  private nextBotT: number | null = null;
  private bonusT: number | null = null;
  private levelStartT = 0;
  private bonusFired = 0;
  private runUnlocks: string[] = [];
  private pendingBotCard: BotKind | null = null;
  private seenTips = new Set<string>();
  private readonly unlockAll =
    import.meta.env.DEV && new URLSearchParams(location.search).get('unlockAll') === '1';

  private gestures: CameraGestures;

  constructor(root: HTMLElement) {
    this.save.load();
    this.audio.setMusicVolume(this.save.settings.music);
    this.audio.setSfxVolume(this.save.settings.sfx);
    this.audio.setVoiceVolume(this.save.settings.voice);
    this.audio.muted = this.save.settings.muted;
    root.setAttribute('data-game', 'angrybots');
    this.shell = document.createElement('div');
    this.shell.setAttribute('data-game', 'angrybots');
    this.shell.style.cssText = 'position:relative;width:100%;height:100%;min-height:100vh';
    root.appendChild(this.shell);

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-label', 'Angry Bots playfield');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%';
    this.shell.appendChild(this.canvas);

    this.uiRoot = document.createElement('div');
    this.uiRoot.id = 'ui-root';
    this.shell.appendChild(this.uiRoot);

    this.renderer = new Renderer(this.canvas);
    this.sling = new SlingInput(this.canvas, this.session, this.bus);
    this.sling.setBlocked(() => this.inputBlocked());

    this.fx = new SimFeedback({
      session: this.session,
      save: this.save,
      audio: this.audio,
      renderer: this.renderer,
      camera: this.camera,
      trail: this.trail,
      reducedMotion: () => effectiveReducedMotion(this.save.settings.reducedMotion),
      getView: () => this.currentView,
      onLaunch: () => this.gestures.reset(),
    });

    this.screens = new AppScreens(this.uiRoot, {
      save: this.save,
      audio: this.audio,
      unlockAll: this.unlockAll,
      getPhase: () => this.phase,
      setPhase: (p) => {
        this.phase = p;
      },
      getLevelId: () => this.levelId,
      startLevel: (id) => this.startLevel(id),
      startDaily: () => this.startDaily(),
      dailyLevelName: () => pickDailyLevel(localDateString()).name,
      restartLevel: () => this.restartLevel(),
      togglePause: (force) => this.togglePause(force),
      leavePlay: () => this.leavePlay(),
      isLevelUnlocked: (id) => this.isLevelUnlocked(id),
      levelRefs: () => this.levelRefs(),
      applyAimGuide: () => this.applyAimGuide(),
    });

    const splash = new Splash(this.uiRoot, botImage('grok'));

    this.gestures = new CameraGestures(this.canvas, {
      enabled: () =>
        this.phase === 'play' &&
        this.session.getState() === 'aim' &&
        !this.inputBlocked(),
      slingDragging: () => this.sling.model.phase === 'dragging',
      cancelSling: () => this.sling.cancelActive(),
      slingGrab: (cx, cy) => {
        const rect = this.canvas.getBoundingClientRect();
        if (cx - rect.left < rect.width * 0.45) return true;
        const w = clientToWorld(cx, cy, this.canvas, this.currentView);
        return this.sling.model.isNearBot(w.x, w.y);
      },
      worldPerPx: () => this.currentView.h / Math.max(1, this.canvas.clientHeight),
      currentView: () => this.currentView,
      limits: () =>
        gestureLimitsFor(this.levelId ? (levelById(this.levelId) ?? null) : null, this.camera),
      aspect: () => this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight),
    });
    this.sling.setSuppress(() => this.gestures.isActive());

    this.loop = new FixedStepLoop({
      step: TUNING.dt,
      maxStepsPerFrame: 5,
      update: (dt) => this.tick(dt),
      render: (alpha, frameDt) => this.draw(alpha, frameDt),
      schedule: (cb) => requestAnimationFrame(cb),
      now: () => performance.now(),
    });

    this.fx.bindAppBus(this.bus);

    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });

    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.screens.onEscape();
      if (ev.key === 'r' || ev.key === 'R') this.restartLevel();
      if (ev.key === 'm' || ev.key === 'M') this.screens.toggleMute();
      if (ev.key === ' ' && this.session.getState() === 'flight' && !this.inputBlocked()) {
        ev.preventDefault();
        this.session.activateAbility();
      }
      if (ev.key === 'Enter') this.screens.activatePrimary();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.backgrounded = true;
        this.sling.cancelActive();
        this.audio.onPause();
        this.syncSimulationPause();
      } else {
        this.backgrounded = false;
        this.audio.onResume();
        this.syncSimulationPause();
      }
    });

    let booted = false;
    const finishBoot = (): void => {
      if (booted) return;
      booted = true;
      splash.ready(() => {
        this.screens.refreshTitleStats();
        this.screens.title.show();
        this.screens.hud.hide();
      });
    };
    void Promise.all([
      document.fonts.ready,
      document.fonts.load('800 64px "Baloo 2"').catch(() => []),
      this.audio.preload(),
    ]).then(() => requestAnimationFrame(finishBoot));
    window.setTimeout(finishBoot, 3000);

    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    const fixtures = import.meta.env.DEV;
    window.__debug = createDebugApi({
      session: this.session,
      renderer: this.renderer,
      getView: () => this.currentView,
      getLevelId: () => this.levelId,
      getPaused: () => this.loop.paused,
      getSling: () => ({
        phase: this.sling.model.phase,
        pullX: this.sling.model.pull.x,
        pullY: this.sling.model.pull.y,
      }),
      loop: this.loop,
      fixtures,
    });

    this.loop.start();
    track('app_open', {});
  }

  private levelRefs(): readonly { id: string; chapter: string }[] {
    return allLevels();
  }

  private isLevelUnlocked(id: string): boolean {
    return this.unlockAll || this.save.isUnlocked(id, this.levelRefs());
  }

  private inputBlocked(): boolean {
    return (
      this.paused ||
      this.backgrounded ||
      this.phase !== 'play' ||
      this.screens.anyModalVisible() ||
      this.rotate.isVisible()
    );
  }

  /** Levels 1–3 always show the short guide; otherwise honor the setting. */
  private applyAimGuide(): void {
    const def = this.levelId ? levelById(this.levelId) : null;
    const early = def ? this.levelRefs().indexOf(def) < 3 : false;
    const mode = this.save.settings.aimGuide === 'short' || early ? 'short' : 'off';
    this.renderer.setAimGuide(mode);
  }

  private leavePlay(): void {
    this.paused = false;
    this.backgrounded = false;
    this.screens.pauseMenu.toggle(false);
    this.sling.cancelActive();
    this.syncSimulationPause();
  }

  private startDaily(): void {
    const date = localDateString();
    this.startLevel(pickDailyLevel(date).id, date);
  }

  private startLevel(id: string, dailyDate?: string): void {
    const def = levelById(id);
    if (!def) return;
    this.leavePlay();
    this.daily = dailyDate ? { date: dailyDate, levelId: id } : null;
    this.levelId = id;
    this.phase = 'play';
    this.resultDelay = 0;
    this.pendingResult = null;
    this.screens.levelSelect.hide();
    this.screens.title.hide();
    this.screens.results.hide();
    this.trail.clear();
    this.introElapsed = 0;
    this.nextBotT = null;
    this.bonusT = null;
    this.bonusFired = 0;
    this.fx.resetLevel();
    this.gestures.reset();
    this.renderer.clearLevel();
    this.session.loadLevel(def, effectiveReducedMotion(this.save.settings.reducedMotion));
    this.renderer.setChapter(def.chapter);
    this.renderer.setTerrain(def.terrain);
    this.audio.setChapter(def.chapter);
    const sim = this.session.getSim();
    if (sim) sim.fragmentsEnabled = true;
    if (sim) this.fx.bindSim(sim);
    this.sling.resetForLevel();
    this.applyAimGuide();
    this.screens.hud.show();
    this.screens.hud.setStarThresholds(def.stars);
    this.screens.hud.setStars(0);
    this.screens.hud.setTargetsLeft(def.pigs.length);
    const num = allLevels().findIndex((l) => l.id === id) + 1;
    this.screens.hud.banner(this.daily ? 'Daily' : `Level ${num}`, def.name);
    if (!this.seenTips.has(def.id)) {
      this.seenTips.add(def.id);
      this.screens.hud.showTip(def.hint ?? tipFor(def));
    }
    this.pendingBotCard = firstUnseenBotInQueue(def.bots, this.save.tutorialsSeen);
    this.levelStartT = performance.now();
    if (this.daily) track('daily_start', { levelId: id, date: this.daily.date });
    else track('level_start', { levelId: id });
  }

  private restartLevel(): void {
    if (!this.levelId || this.phase !== 'play') return;
    this.startLevel(this.levelId, this.daily?.date);
  }

  private togglePause(force?: boolean): void {
    if (this.phase !== 'play') return;
    if (this.screens.results.isVisible()) return;
    this.paused = force ?? !this.paused;
    if (this.paused) {
      this.sling.cancelActive();
      this.audio.onPause();
      this.screens.pauseMenu.setValues({
        music: this.save.settings.music,
        sfx: this.save.settings.sfx,
      });
    } else {
      this.audio.onResume();
    }
    this.screens.pauseMenu.toggle(this.paused);
    this.syncSimulationPause();
  }

  /** Orientation recovery must run even while simulation is paused. */
  private syncSimulationPause(): void {
    const rotate = this.rotate.update();
    this.loop.paused =
      this.paused || this.backgrounded || rotate || this.screens.botIntro.isVisible();
  }

  private recordResultOnce(): void {
    // Daily runs never touch campaign progress (levelId null → no stars/unlocks/skips).
    const rec = this.fx.recordResult(this.daily ? null : this.levelId, this.levelRefs());
    if (!rec) return;
    let dailyResult: { best: number; streak: number } | undefined;
    if (this.daily) {
      this.save.recordDailyResult(this.daily.date, rec.won, rec.score);
      dailyResult = {
        best: this.save.daily.bestByDate[this.daily.date] ?? rec.score,
        streak: currentStreak(this.save.daily, this.daily.date),
      };
    }
    this.pendingResult = {
      won: rec.won,
      score: rec.score,
      stars: rec.stars,
      newBest: rec.newBest,
      canSkip: rec.canSkip,
      daily: dailyResult,
    };
    this.runUnlocks = rec.unlockIds;
    const durationMs = Math.round(performance.now() - this.levelStartT);
    if (this.daily) {
      track('daily_end', {
        levelId: this.daily.levelId,
        date: this.daily.date,
        won: rec.won,
        score: rec.score,
        durationMs,
      });
    } else if (this.levelId) {
      track('level_end', {
        levelId: this.levelId,
        won: rec.won,
        score: rec.score,
        stars: rec.stars,
        shotsUsed: this.fx.shotsFired,
        durationMs,
      });
    }
    for (const id of rec.unlockIds) track('achievement_unlock', { id });
    this.resultDelay = 1.15;
    this.audio.playSting(rec.won ? 'victory' : 'defeat');
    if (rec.won && rec.bonus > 0) {
      const at = this.fx.impactCenter ?? { x: 0, y: 2 };
      this.renderer.juice.textSprite(at.x, at.y + 1.2, `+${rec.bonus.toLocaleString()}`, PALETTE.score.bonus, 1.3);
    }
  }

  private tick(dt: number): void {
    if (this.phase !== 'play') return;
    if (this.paused || this.backgrounded || this.rotate.isVisible()) return;

    const prev = this.session.getState();
    if (prev === 'intro') this.introElapsed += dt;
    this.session.update(dt);
    const state = this.session.getState();

    if (state === 'nextBot') {
      this.nextBotT = (prev === 'nextBot' ? (this.nextBotT ?? 0) : 0) + dt;
    } else {
      this.nextBotT = null;
    }
    if (state === 'bonus') {
      this.bonusT = (prev === 'bonus' ? (this.bonusT ?? 0) : 0) + dt;
    } else {
      this.bonusT = null;
      this.bonusFired = 0;
    }

    this.recordResultOnce();
    if (this.pendingResult) {
      this.resultDelay -= dt;
      if (this.resultDelay <= 0) {
        const pending = this.pendingResult;
        this.pendingResult = null;
        const isFinal = this.levelId
          ? nextLevel(this.levelId) === undefined
          : false;
        this.screens.results.show({
          won: pending.won,
          score: pending.score,
          stars: pending.stars,
          newBest: pending.newBest,
          canSkip: pending.canSkip,
          daily: pending.daily,
          isFinal,
          unlockedNames: this.runUnlocks
            .map((id) => achievementById(id)?.name ?? id),
          pigImgUrl: pigImage(),
          chime: (rate) => this.audio.playRate('victory', rate),
          tick: () => this.audio.play('ui'),
        });
        this.screens.hud.hide();
        for (const id of this.runUnlocks) {
          const name = achievementById(id)?.name ?? id;
          this.screens.toast(name, 'achv', achievementBadge(id));
        }
      }
    }

    if (state === 'aim' && this.pendingBotCard) {
      const kind = this.pendingBotCard;
      this.pendingBotCard = null;
      const face = botStickerCanvas(kind);
      if (!face) return;
      this.screens.botIntro.show(kind, face, () => {
        this.save.markTutorialSeen(kind);
        this.syncSimulationPause();
      });
      this.syncSimulationPause();
    }

    const sim = this.session.getSim();
    const bot = sim?.shotBots()[0];
    if (bot?.body && state === 'flight') {
      const p = bot.body.getPosition();
      this.trail.sample(p.x, p.y, sim!.getSimTime(), dt);
    }

    this.sling.syncLoadedBot();
    if (state !== 'aim') this.gestures.reset();
    const def = this.levelId ? levelById(this.levelId) : null;
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const botBody = bot?.body;
    this.currentView = this.camera.update(
      {
        state,
        level: def ?? null,
        aspect,
        tension: this.sling.model.tension(),
        botPos: botBody ? { x: botBody.getPosition().x, y: botBody.getPosition().y } : null,
        botVel: botBody
          ? {
              x: botBody.getLinearVelocity().x,
              y: botBody.getLinearVelocity().y,
            }
          : null,
        impactCenter: this.fx.impactCenter,
        introElapsed: this.introElapsed,
        reducedMotion: effectiveReducedMotion(this.save.settings.reducedMotion),
        topHudPx: 56,
        canvasPxH: this.canvas.clientHeight,
        manualOffset: this.gestures.manualOffset(),
      },
      dt
    );

    const best = this.levelId ? (this.save.levelProgress(this.levelId)?.bestScore ?? 0) : 0;
    this.screens.hud.setScore(this.session.getScore(), best, def?.stars[2] ?? 1);
    this.screens.hud.setStars(this.session.getStars());
    this.screens.hud.setTargetsLeft(sim?.pigsAlive() ?? 0);
  }

  private draw(_alpha: number, frameDt: number): void {
    this.syncSimulationPause();
    // Hit-stop and collapse slow-motion scale the sim clock; render keeps running.
    const rm = effectiveReducedMotion(this.save.settings.reducedMotion);
    this.renderer.reducedMotion = rm;
    this.fx.hitStopLeft = Math.max(0, this.fx.hitStopLeft - frameDt);
    this.fx.slowMoLeft = Math.max(0, this.fx.slowMoLeft - frameDt);
    this.loop.timeScale = rm ? 1 : this.fx.hitStopLeft > 0 ? 0 : this.fx.slowMoLeft > 0 ? 0.6 : 1;
    const shake = this.camera.getShake();
    this.sling.setProjector((cx, cy) =>
      clientToWorld(cx, cy, this.canvas, this.currentView)
    );
    this.renderer.syncLevel(this.session.getSim(), frameDt);
    const state = this.session.getState();
    const aiming = this.phase === 'play' && state === 'aim';
    this.renderer.syncSling(
      this.sling.model,
      this.session.getBotQueue(),
      aiming,
      this.trail,
      {
        hopT: state === 'nextBot' ? this.nextBotT : null,
        bonusT: state === 'bonus' ? this.bonusT : null,
      }
    );
    if (state === 'bonus' && this.bonusT !== null) {
      const positions = this.renderer.queuePositions();
      while (
        this.bonusFired < positions.length &&
        this.bonusT >= this.bonusFired * 0.5 + 0.15
      ) {
        const p = positions[this.bonusFired]!;
        this.renderer.juice.textSprite(p.x, p.y + 0.9, '+10,000', PALETTE.score.bonus, 1.15);
        this.audio.play('ui');
        this.bonusFired += 1;
      }
    }
    this.renderer.applyView(this.currentView, shake.x, shake.y);
    this.renderer.render(_alpha, frameDt);
  }

  private onResize(): void {
    const w = this.shell.clientWidth;
    const h = this.shell.clientHeight;
    this.renderer.setSize(w, h);
    this.syncSimulationPause();
  }
}
