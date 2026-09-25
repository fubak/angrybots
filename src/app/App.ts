import '../ui/styles.css';
import { EventBus } from '../core/EventBus';
import { FixedStepLoop } from '../core/FixedStepLoop';
import { PALETTE } from '../config/render';
import { TUNING } from '../config/tuning';
import type { GameEvents } from '../game/events';
import { GameSession } from '../game/GameSession';
import { SaveStore } from '../game/SaveStore';
import { allLevels, levelById, nextLevel } from '../levels/registry';
import { CHAPTERS } from '../levels/chapters';
import { CameraDirector } from '../camera/CameraDirector';
import { CameraGestures } from '../camera/CameraGestures';
import { Renderer } from '../render/Renderer';
import { SlingInput, clientToWorld } from '../sling/SlingInput';
import { ShotTrail } from '../sling/ShotTrail';
import { SoundBank } from '../audio/SoundBank';
import { createDebugApi } from '../debug/DebugApi';
import { effectiveReducedMotion } from './motion';
import { currentLevelId, PROGRESSION } from '../game/progression';
import { ACHIEVEMENTS, achievementById, evaluateAchievements } from '../game/achievements';
import { firstUnseenBotInQueue } from '../bots/tutorialTips';
import { botFaces, pigFaces } from '../render/illustrations';
import { iconSvg } from '../ui/icons';
import { Hud } from '../ui/Hud';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultsPanel } from '../ui/ResultsPanel';
import { TitleScreen } from '../ui/TitleScreen';
import { LevelSelect } from '../ui/LevelSelect';
import { RotatePrompt } from '../ui/RotatePrompt';
import { Splash } from '../ui/Splash';
import { Settings } from '../ui/Settings';
import { Credits } from '../ui/Credits';
import { AchievementsScreen } from '../ui/Achievements';
import { BotIntro } from '../ui/BotIntro';
import { unionRect, type View } from '../camera/fitRect';
import type { BotKind } from '../levels/schema';

type AppPhase = 'title' | 'levelSelect' | 'play';

export class App {
  private readonly bus = new EventBus<GameEvents>();
  private readonly session = new GameSession();
  private readonly save = new SaveStore();
  private readonly camera = new CameraDirector();
  private readonly trail = new ShotTrail();
  private readonly audio = new SoundBank();
  private readonly rotate = new RotatePrompt();

  private readonly shell: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly uiRoot: HTMLElement;
  private readonly renderer: Renderer;
  private readonly sling: SlingInput;
  private readonly loop: FixedStepLoop;

  private phase: AppPhase = 'title';
  private levelId: string | null = null;
  private introElapsed = 0;
  private impactCenter: { x: number; y: number } | null = null;
  private currentView: View = { cx: 0, cy: 5, h: 12 };
  private paused = false;
  private backgrounded = false;
  private resultRecorded = false;
  private resultDelay = 0;
  private pendingResult: {
    won: boolean;
    score: number;
    stars: number;
    newBest: boolean;
    canSkip: boolean;
  } | null = null;
  private nextBotT: number | null = null;
  private bonusT: number | null = null;
  private bonusFired = 0;
  private shotDestroyed = 0;
  private destroyedTimes: number[] = [];
  private hitStopLeft = 0;
  private slowMoLeft = 0;
  private shotsFired = 0;
  private maxCombo = 0;
  private shotTnt = 0;
  private maxTntChain = 0;
  private kingKilled = false;
  private runUnlocks: string[] = [];
  private pendingBotCard: BotKind | null = null;
  private seenTips = new Set<string>();
  private readonly unlockAll =
    import.meta.env.DEV && new URLSearchParams(location.search).get('unlockAll') === '1';

  private hud: Hud;
  private pauseMenu: PauseMenu;
  private results: ResultsPanel;
  private title: TitleScreen;
  private levelSelect: LevelSelect;
  private settings: Settings;
  private credits: Credits;
  private achvScreen: AchievementsScreen;
  private botIntro: BotIntro;
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

    const splash = new Splash(this.uiRoot, this.botImage('grok'));

    this.hud = new Hud(this.uiRoot, () => this.togglePause());
    this.pauseMenu = new PauseMenu(this.uiRoot, {
      resume: () => this.togglePause(false),
      restart: () => {
        this.togglePause(false);
        this.restartLevel();
      },
      levels: () => this.goLevelSelect(),
      settings: () => this.openSettings(),
      onSettings: (key, value) => this.applySetting(key, value),
    });
    this.results = new ResultsPanel(this.uiRoot, (a) => this.onResultsAction(a));
    this.title = new TitleScreen(this.uiRoot, {
      play: () => this.goLevelSelect(),
      settings: () => this.openSettings(),
      achievements: () => this.openAchievements(),
      credits: () => this.openCredits(),
    });
    this.levelSelect = new LevelSelect(
      this.uiRoot,
      (id) => this.startLevel(id),
      () => this.goTitle()
    );
    this.settings = new Settings(this.uiRoot, {
      onChange: (key, value) => this.applySetting(key, value),
      onReset: () => {
        this.save.resetProgress();
        this.settings.populate(this.save.settings);
        this.refreshTitleStats();
      },
      onClose: () => this.settings.toggle(false),
    });
    this.credits = new Credits(this.uiRoot, () => this.credits.toggle(false));
    this.achvScreen = new AchievementsScreen(this.uiRoot, () =>
      this.achvScreen.toggle(false)
    );
    this.botIntro = new BotIntro(this.uiRoot);

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
      limits: () => this.gestureLimits(),
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

    this.bus.on('bot:firstImpact', (e) => {
      this.audio.play('impact');
      this.renderer.juice.burst('dust', e.x, e.y);
    });
    this.bus.on('bot:launched', () => {
      this.trail.onLaunch();
      this.audio.play('launch');
      this.audio.play('yell');
      this.audio.tension(0);
      this.shotDestroyed = 0;
      this.shotTnt = 0;
      this.destroyedTimes.length = 0;
      this.shotsFired += 1;
      this.save.addShot();
      this.gestures.reset();
    });
    this.bus.on('sling:aimUpdate', (e) => this.audio.tension(e.tension));
    this.bus.on('sling:cancel', () => {
      this.audio.tension(0);
      this.audio.play('cancel');
    });

    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });

    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.onEscape();
      if (ev.key === 'r' || ev.key === 'R') this.restartLevel();
      if (ev.key === ' ' && this.session.getState() === 'flight' && !this.inputBlocked()) {
        ev.preventDefault();
        this.session.activateAbility();
      }
      if (ev.key === 'Enter') this.activatePrimary();
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
        this.refreshTitleStats();
        this.title.show();
        this.hud.hide();
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
      this.results.isVisible() ||
      this.pauseMenu.isVisible() ||
      this.rotate.isVisible() ||
      this.settings.isVisible() ||
      this.achvScreen.isVisible() ||
      this.credits.isVisible() ||
      this.botIntro.isVisible()
    );
  }

  private onEscape(): void {
    if (this.settings.isVisible()) {
      this.settings.toggle(false);
      return;
    }
    if (this.credits.isVisible()) {
      this.credits.toggle(false);
      return;
    }
    if (this.achvScreen.isVisible()) {
      this.achvScreen.toggle(false);
      return;
    }
    if (this.phase === 'levelSelect') {
      if (!this.levelSelect.back()) this.goTitle();
      return;
    }
    if (this.phase === 'title') return;
    this.togglePause();
  }

  /** Enter activates the primary button of the topmost open modal. */
  private activatePrimary(): void {
    const el = document.activeElement;
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) return;
    const wraps = [...this.uiRoot.querySelectorAll<HTMLElement>('.modal-wrap.open, .results-panel.open')];
    const top = wraps[wraps.length - 1];
    const primary = top?.querySelector<HTMLButtonElement>('.ui-primary');
    primary?.click();
  }

  private applySetting(key: string, value: number | boolean | string | null): void {
    if (key === 'music' || key === 'sfx' || key === 'voice') {
      const v = value as number;
      this.save.settings[key] = v;
      if (key === 'music') this.audio.setMusicVolume(v);
      if (key === 'sfx') this.audio.setSfxVolume(v);
      if (key === 'voice') this.audio.setVoiceVolume(v);
    } else if (key === 'muted') {
      this.save.settings.muted = Boolean(value);
      this.audio.muted = this.save.settings.muted;
    } else if (key === 'reducedMotion') {
      this.save.settings.reducedMotion = value as boolean | null;
    } else if (key === 'aimGuide') {
      this.save.settings.aimGuide = value as 'off' | 'short';
      this.applyAimGuide();
    }
    this.save.persist();
  }

  /** Levels 1–3 always show the short guide; otherwise honor the setting. */
  private applyAimGuide(): void {
    const def = this.levelId ? levelById(this.levelId) : null;
    const early = def ? this.levelRefs().indexOf(def) < 3 : false;
    const mode = this.save.settings.aimGuide === 'short' || early ? 'short' : 'off';
    this.renderer.setAimGuide(mode);
  }

  private openSettings(): void {
    this.settings.populate(this.save.settings);
    this.settings.toggle(true);
  }

  private openCredits(): void {
    this.credits.toggle(true);
  }

  private openAchievements(): void {
    this.achvScreen.populate(this.save.achievements, this.save, this.levelRefs());
    this.achvScreen.toggle(true);
  }

  private refreshTitleStats(): void {
    this.title.setStats(
      this.save.totalStars(this.levelRefs()),
      this.levelRefs().length * 3,
      Object.keys(this.save.achievements).length,
      ACHIEVEMENTS.length
    );
  }

  private botImage(kind: string): string {
    const tex = botFaces(kind).idle;
    const img = tex.image as HTMLCanvasElement;
    return img?.toDataURL?.() ?? '';
  }

  private pigImage(): string {
    const tex = pigFaces(false, 'none').smug;
    const img = tex.image as HTMLCanvasElement;
    return img?.toDataURL?.() ?? '';
  }

  private toast(text: string, cls = ''): void {
    const el = document.createElement('div');
    el.className = `ui-toast ${cls}`.trim();
    el.innerHTML = `${iconSvg('trophy', 20)}<span></span>`;
    el.querySelector('span')!.textContent = text;
    this.uiRoot.appendChild(el);
    window.setTimeout(() => el.remove(), 2500);
  }

  private leavePlay(): void {
    this.paused = false;
    this.backgrounded = false;
    this.pauseMenu.toggle(false);
    this.sling.cancelActive();
    this.syncSimulationPause();
  }

  private goTitle(): void {
    this.leavePlay();
    this.phase = 'title';
    this.levelSelect.hide();
    this.results.hide();
    this.hud.hide();
    this.refreshTitleStats();
    this.title.show();
  }

  private goLevelSelect(): void {
    this.leavePlay();
    this.phase = 'levelSelect';
    this.title.hide();
    this.results.hide();
    const refs = this.levelRefs();
    const artBot: Record<string, string> = {
      training: this.botImage('grok'),
      workshop: this.botImage('dash'),
      citadel: this.botImage('heavy'),
    };
    this.levelSelect.populate(allLevels(), {
      unlocked: (id) => this.isLevelUnlocked(id),
      starsFor: (id) => this.save.levelProgress(id)?.stars ?? 0,
      chapterUnlocked: (c) => this.unlockAll || this.save.isChapterUnlocked(c, refs),
      chapterStars: (c) => this.save.chapterStars(c, refs),
      chapterGateText: (c) => {
        const order = CHAPTERS.find((x) => x.id === c)?.order ?? 0;
        const prev = CHAPTERS.find((x) => x.order === order - 1);
        const need = PROGRESSION.chapterStars[c] ?? 0;
        return `Clear ${prev?.name ?? 'previous chapter'} 10 · ${need}★ needed`;
      },
      chapterArt: (c) => artBot[c] ?? '',
      currentId: () =>
        currentLevelId(refs, (id) => this.save.levelProgress(id)),
    });
    this.levelSelect.show();
    this.hud.hide();
  }

  private startLevel(id: string): void {
    const def = levelById(id);
    if (!def) return;
    this.leavePlay();
    this.levelId = id;
    this.phase = 'play';
    this.resultRecorded = false;
    this.resultDelay = 0;
    this.pendingResult = null;
    this.levelSelect.hide();
    this.title.hide();
    this.results.hide();
    this.trail.clear();
    this.introElapsed = 0;
    this.impactCenter = null;
    this.nextBotT = null;
    this.bonusT = null;
    this.bonusFired = 0;
    this.shotDestroyed = 0;
    this.destroyedTimes.length = 0;
    this.hitStopLeft = 0;
    this.slowMoLeft = 0;
    this.shotsFired = 0;
    this.maxCombo = 0;
    this.shotTnt = 0;
    this.maxTntChain = 0;
    this.kingKilled = false;
    this.runUnlocks = [];
    this.gestures.reset();
    this.renderer.clearLevel();
    this.session.loadLevel(def, effectiveReducedMotion(this.save.settings.reducedMotion));
    this.renderer.setChapter(def.chapter);
    this.renderer.setTerrain(def.terrain);
    this.audio.setChapter(def.chapter);
    const sim = this.session.getSim();
    if (sim) sim.fragmentsEnabled = true;
    this.bindSimAudio();
    this.sling.resetForLevel();
    this.applyAimGuide();
    this.hud.show();
    this.hud.setStarThresholds(def.stars);
    this.hud.setStars(0);
    this.hud.setTargetsLeft(def.pigs.length);
    if (!this.seenTips.has(def.id)) {
      this.seenTips.add(def.id);
      this.hud.showTip(def.hint ?? this.tipFor(def));
    }
    this.pendingBotCard = firstUnseenBotInQueue(def.bots, this.save.tutorialsSeen);
  }

  private restartLevel(): void {
    if (!this.levelId || this.phase !== 'play') return;
    this.startLevel(this.levelId);
  }

  private onResultsAction(action: 'retry' | 'next' | 'levels' | 'skip'): void {
    this.results.hide();
    this.audio.play('ui');
    if (action === 'levels') {
      this.goLevelSelect();
      return;
    }
    if (action === 'retry' && this.levelId) {
      this.startLevel(this.levelId);
      return;
    }
    if (action === 'skip' && this.levelId) {
      this.save.skipLevel(this.levelId);
      const n = nextLevel(this.levelId);
      if (n && this.isLevelUnlocked(n.id)) this.startLevel(n.id);
      else this.goLevelSelect();
      return;
    }
    if (action === 'next' && this.levelId) {
      const n = nextLevel(this.levelId);
      if (n) this.startLevel(n.id);
      else this.goLevelSelect();
    }
  }

  private togglePause(force?: boolean): void {
    if (this.phase !== 'play') return;
    if (this.results.isVisible()) return;
    this.paused = force ?? !this.paused;
    if (this.paused) {
      this.sling.cancelActive();
      this.audio.onPause();
      this.pauseMenu.setValues({
        music: this.save.settings.music,
        sfx: this.save.settings.sfx,
      });
    } else {
      this.audio.onResume();
    }
    this.pauseMenu.toggle(this.paused);
    this.syncSimulationPause();
  }

  /** Orientation recovery must run even while simulation is paused. */
  private syncSimulationPause(): void {
    const rotate = this.rotate.update();
    this.loop.paused =
      this.paused || this.backgrounded || rotate || this.botIntro.isVisible();
  }

  private recordResultOnce(): void {
    const state = this.session.getState();
    if (state !== 'won' && state !== 'lost') return;
    if (this.resultRecorded) return;
    this.resultRecorded = true;
    const won = state === 'won';
    const stars = this.session.getStars();
    const score = this.session.getScore();
    let newBest = false;
    let canSkip = false;
    if (this.levelId) {
      const prev = this.save.levelProgress(this.levelId);
      newBest = won && score > (prev?.bestScore ?? 0);
      this.save.recordLevel(this.levelId, score, stars, won);
      if (won) {
        this.save.setBestCombo(this.maxCombo);
      } else {
        this.save.recordFail(this.levelId);
        canSkip = this.save.canSkip(this.levelId, this.levelRefs());
      }
    }
    this.evaluateRun(won, stars);
    this.pendingResult = { won, score, stars, newBest, canSkip };
    this.resultDelay = 1.15;
    this.audio.play(won ? 'victory' : 'defeat');
    if (won) {
      const bonus = this.session.getBonus();
      if (bonus > 0) {
        const at = this.impactCenter ?? { x: 0, y: 2 };
        this.renderer.juice.textSprite(at.x, at.y + 1.2, `+${bonus.toLocaleString()}`, PALETTE.score.bonus, 1.3);
      }
    }
  }

  private evaluateRun(won: boolean, stars: number): void {
    if (!this.levelId) return;
    const fresh = evaluateAchievements(
      {
        levelId: this.levelId,
        won,
        stars,
        shotsUsed: this.shotsFired,
        botsUnused: this.session.getBotQueue().length,
        maxCombo: this.maxCombo,
        maxTntChain: this.maxTntChain,
        kingKilled: this.kingKilled,
      },
      this.save,
      this.save.achievements,
      this.levelRefs()
    );
    for (const id of fresh) {
      if (this.save.unlockAchievement(id)) this.runUnlocks.push(id);
    }
  }

  private tipFor(def: { id: string; bots: string[] }): string {
    if (def.id === 'first-flight') return 'Pull back and release. Drag to the perch to cancel.';
    if (def.bots[0] === 'dash') return 'Tap during flight to dash.';
    if (def.bots.includes('split')) return 'Glass breaks easily. Tap to split in mid-air.';
    return 'Clear every target.';
  }

  /** Structure hits own the collapse camera. Ground and sling skims do not. */
  private noteStrike(x: number, y: number): void {
    if (x < TUNING.sling.x + 2.5) return;
    const prev = this.impactCenter;
    this.impactCenter = { x, y };
    if (!prev || Math.hypot(x - prev.x, y - prev.y) > 0.6) this.camera.addTrauma(0.55);
  }

  private bindSimAudio(): void {
    const sim = this.session.getSim();
    if (!sim) return;
    const reducedMotion = () => effectiveReducedMotion(this.save.settings.reducedMotion);
    sim.bus.on('block:destroyed', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play(`break:${e.material}`);
      this.save.addDestroyed(e.material);
      this.renderer.juice.burst(e.material, e.x, e.y, e.material === 'tnt' ? 1.4 : 1);
      if (e.points > 0) {
        const color =
          e.material === 'stone'
            ? PALETTE.score.stone
            : e.material === 'glass'
              ? PALETTE.score.glass
              : e.material === 'tnt'
                ? PALETTE.score.bonus
                : PALETTE.score.wood;
        this.renderer.juice.textSprite(e.x, e.y, `+${e.points}`, color);
      }
      const state = this.session.getState();
      if (state === 'flight' || state === 'resolve') {
        this.shotDestroyed += 1;
        this.maxCombo = Math.max(this.maxCombo, this.shotDestroyed);
        if (e.material === 'tnt') {
          this.shotTnt += 1;
          this.maxTntChain = Math.max(this.maxTntChain, this.shotTnt);
        }
        if (this.shotDestroyed >= 3) {
          this.renderer.juice.textSprite(
            this.currentView.cx,
            this.currentView.cy + this.currentView.h * 0.3,
            `COMBO x${this.shotDestroyed}`,
            PALETTE.score.bonus,
            1.35
          );
        }
        const now = performance.now() / 1000;
        this.destroyedTimes.push(now);
        this.destroyedTimes = this.destroyedTimes.filter((t) => now - t <= 0.5);
        if (this.destroyedTimes.length >= 4 && !reducedMotion()) this.slowMoLeft = 0.8;
      }
    });
    sim.bus.on('pig:destroyed', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play('pig');
      const entity = sim.registry.all().find((x) => x.id === e.id);
      if (entity?.kind === 'pig' && entity.king) {
        this.kingKilled = true;
        this.save.addKing();
      }
      this.renderer.juice.burst('pig', e.x, e.y);
      if (e.points > 0) {
        this.renderer.juice.textSprite(e.x, e.y + 0.35, `+${e.points.toLocaleString()}`, PALETTE.score.pig, 1.45);
      }
    });
    sim.bus.on('pig:damaged', (e) => {
      this.noteStrike(e.x, e.y);
      if (e.hpRatio > 0) this.renderer.juice.impactStars(e.x, e.y + 0.4);
    });
    sim.bus.on('block:damaged', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play(`impact:${e.material}`);
    });
    sim.bus.on('block:landed', (e) => {
      this.renderer.juice.burst('dust', e.x, e.y);
    });
    sim.bus.on('explosion', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play('explosion');
      this.renderer.juice.explosion(e.x, e.y, e.radius);
      this.camera.addTrauma(0.9);
      if (!reducedMotion()) this.hitStopLeft = 0.06;
    });
    sim.bus.on('bot:ability', () => this.audio.play('ability'));
    sim.bus.on('bot:firstImpact', (e) => {
      this.audio.play('impact');
      this.renderer.juice.flash(e.x, e.y, '#fff2d8');
      this.trail.noteImpact(sim.getSimTime(), e.x, e.y);
    });
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
        this.results.show({
          won: pending.won,
          score: pending.score,
          stars: pending.stars,
          newBest: pending.newBest,
          canSkip: pending.canSkip,
          isFinal,
          unlockedNames: this.runUnlocks
            .map((id) => achievementById(id)?.name ?? id),
          pigImgUrl: this.pigImage(),
          chime: (rate) => this.audio.playRate('victory', rate),
          tick: () => this.audio.play('ui'),
        });
        this.hud.hide();
        for (const id of this.runUnlocks) {
          const name = achievementById(id)?.name ?? id;
          this.toast(name, 'achv');
        }
      }
    }

    if (state === 'aim' && this.pendingBotCard) {
      const kind = this.pendingBotCard;
      this.pendingBotCard = null;
      const face = botFaces(kind).idle.image as CanvasImageSource;
      this.botIntro.show(kind, face, () => {
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
        impactCenter: this.impactCenter,
        introElapsed: this.introElapsed,
        reducedMotion: effectiveReducedMotion(this.save.settings.reducedMotion),
        topHudPx: 56,
        canvasPxH: this.canvas.clientHeight,
        manualOffset: this.gestures.manualOffset(),
      },
      dt
    );

    const best = this.levelId ? (this.save.levelProgress(this.levelId)?.bestScore ?? 0) : 0;
    this.hud.setScore(this.session.getScore(), best, def?.stars[2] ?? 1);
    this.hud.setStars(this.session.getStars());
    this.hud.setTargetsLeft(sim?.pigsAlive() ?? 0);
  }

  /** Zoom limits + pan bounds for CameraGestures on the current level. */
  private gestureLimits(): { minH: number; maxH: number; pan: import('../camera/fitRect').Rect } {
    const def = this.levelId ? levelById(this.levelId) : null;
    if (!def) {
      return { minH: 6, maxH: 30, pan: { x0: -20, x1: 40, y0: -4, y1: 14 } };
    }
    const slingH = this.camera.slingView(def).h;
    const overH = this.camera.overviewView(def).h;
    const c = def.camera;
    const pan = unionRect(
      { x0: c.minX, x1: c.maxX, y0: c.minY, y1: c.maxY },
      { x0: def.sling.x - 4, x1: def.sling.x + 4, y0: 0, y1: 7 }
    );
    return { minH: slingH, maxH: overH * 1.2, pan };
  }

  private draw(_alpha: number, frameDt: number): void {
    this.syncSimulationPause();
    // Hit-stop and collapse slow-motion scale the sim clock; render keeps running.
    const rm = effectiveReducedMotion(this.save.settings.reducedMotion);
    this.hitStopLeft = Math.max(0, this.hitStopLeft - frameDt);
    this.slowMoLeft = Math.max(0, this.slowMoLeft - frameDt);
    this.loop.timeScale = rm ? 1 : this.hitStopLeft > 0 ? 0 : this.slowMoLeft > 0 ? 0.6 : 1;
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
