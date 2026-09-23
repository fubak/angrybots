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
import { Renderer } from '../render/Renderer';
import { SlingInput, clientToWorld } from '../sling/SlingInput';
import { ShotTrail } from '../sling/ShotTrail';
import { SoundBank } from '../audio/SoundBank';
import { createDebugApi } from '../debug/DebugApi';
import { Hud } from '../ui/Hud';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultsPanel } from '../ui/ResultsPanel';
import { TitleScreen } from '../ui/TitleScreen';
import { LevelSelect } from '../ui/LevelSelect';
import { RotatePrompt } from '../ui/RotatePrompt';
import type { View } from '../camera/fitRect';

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
  private pendingResult: { won: boolean; score: number; stars: number } | null = null;

  private hud: Hud;
  private pauseMenu: PauseMenu;
  private results: ResultsPanel;
  private title: TitleScreen;
  private levelSelect: LevelSelect;

  constructor(root: HTMLElement) {
    this.save.load();
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

    this.hud = new Hud(this.uiRoot, () => this.togglePause(), () => this.restartLevel());
    this.pauseMenu = new PauseMenu(this.uiRoot, {
      resume: () => this.togglePause(false),
      restart: () => {
        this.togglePause(false);
        this.restartLevel();
      },
      levels: () => this.goLevelSelect(),
      onSettings: (key, value) => {
        if (key === 'music') this.audio.setMusicVolume(value as number);
        if (key === 'sfx') this.audio.setSfxVolume(value as number);
        this.save.settings[key as 'music' | 'sfx'] = value as number;
        this.save.persist();
      },
    });
    this.results = new ResultsPanel(this.uiRoot, (a) => this.onResultsAction(a));
    this.title = new TitleScreen(this.uiRoot, () => this.goLevelSelect());
    this.levelSelect = new LevelSelect(this.uiRoot, (id) => this.startLevel(id));

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
      this.renderer.juice.burst(e.x, e.y, 'dust', 6);
    });
    this.bus.on('bot:launched', () => {
      this.trail.onLaunch();
      this.audio.play('launch');
      this.audio.play('yell');
      this.audio.tension(0);
    });
    this.bus.on('sling:aimUpdate', (e) => this.audio.tension(e.tension));
    this.bus.on('sling:cancel', () => {
      this.audio.tension(0);
      this.audio.play('cancel');
    });

    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });

    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.togglePause();
      if (ev.key === 'r' || ev.key === 'R') this.restartLevel();
      if (ev.key === ' ' && this.session.getState() === 'flight' && !this.inputBlocked()) {
        ev.preventDefault();
        this.session.activateAbility();
      }
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

    void this.audio.preload().then(() => {
      this.title.show();
      this.hud.hide();
    });

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

  private orderedIds(): string[] {
    return allLevels().map((l) => l.id);
  }

  private isLevelUnlocked(id: string): boolean {
    return this.save.isUnlocked(id, this.orderedIds());
  }

  private inputBlocked(): boolean {
    return (
      this.paused ||
      this.backgrounded ||
      this.phase !== 'play' ||
      this.results.isVisible() ||
      this.pauseMenu.isVisible() ||
      this.rotate.isVisible()
    );
  }

  private leavePlay(): void {
    this.paused = false;
    this.backgrounded = false;
    this.pauseMenu.toggle(false);
    this.sling.cancelActive();
    this.syncSimulationPause();
  }

  private goLevelSelect(): void {
    this.leavePlay();
    this.phase = 'levelSelect';
    this.title.hide();
    this.results.hide();
    this.levelSelect.populate(
      allLevels(),
      (id) => this.isLevelUnlocked(id),
      (id) => this.save.load().levels[id]?.stars ?? 0
    );
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
    this.session.loadLevel(def, this.save.settings.reducedMotion === true);
    this.renderer.setChapter(def.chapter);
    this.renderer.setTerrain(def.terrain);
    this.audio.setChapter(def.chapter);
    const sim = this.session.getSim();
    if (sim) sim.fragmentsEnabled = true;
    this.bindSimAudio();
    this.sling.resetForLevel();
    this.hud.show();
    this.hud.setTip(def.hint ?? this.tipFor(def));
    this.hud.setShots(this.session.getBotQueue().length);
  }

  private restartLevel(): void {
    if (!this.levelId || this.phase !== 'play') return;
    this.startLevel(this.levelId);
  }

  private onResultsAction(action: 'retry' | 'next' | 'levels'): void {
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
    } else {
      this.audio.onResume();
    }
    this.pauseMenu.toggle(this.paused);
    this.syncSimulationPause();
  }

  /** Orientation recovery must run even while simulation is paused. */
  private syncSimulationPause(): void {
    const rotate = this.rotate.update();
    this.loop.paused = this.paused || this.backgrounded || rotate;
  }

  private recordResultOnce(): void {
    const state = this.session.getState();
    if (state !== 'won' && state !== 'lost') return;
    if (this.resultRecorded) return;
    this.resultRecorded = true;
    const won = state === 'won';
    const stars = this.session.getStars();
    const score = this.session.getScore();
    if (this.levelId) {
      this.save.recordLevel(this.levelId, score, stars, won);
    }
    this.pendingResult = { won, score, stars };
    this.resultDelay = 1.15;
    this.audio.play(won ? 'victory' : 'defeat');
    if (won) {
      const bonus = this.session.getBonus();
      if (bonus > 0) {
        const at = this.impactCenter ?? { x: 0, y: 2 };
        this.renderer.juice.popup(at.x, at.y + 1.2, `+${bonus.toLocaleString()}`, PALETTE.score.bonus);
      }
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
    sim.bus.on('block:destroyed', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play(`break:${e.material}`);
      this.renderer.juice.burst(e.x, e.y, e.material, e.material === 'tnt' ? 16 : 12, e.angle);
      if (e.material === 'tnt') this.audio.play('explosion');
      if (e.points > 0) {
        const color =
          e.material === 'stone'
            ? PALETTE.score.stone
            : e.material === 'glass'
              ? PALETTE.score.glass
              : e.material === 'tnt'
                ? PALETTE.score.bonus
                : PALETTE.score.wood;
        this.renderer.juice.popup(e.x, e.y, `+${e.points}`, color);
      }
    });
    sim.bus.on('pig:destroyed', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play('pig');
      this.renderer.juice.pop(e.x, e.y);
      if (e.points > 0) {
        this.renderer.juice.popup(e.x, e.y + 0.35, `+${e.points.toLocaleString()}`, PALETTE.score.pig);
      }
    });
    sim.bus.on('pig:damaged', (e) => {
      this.noteStrike(e.x, e.y);
    });
    sim.bus.on('block:damaged', (e) => {
      this.noteStrike(e.x, e.y);
      this.audio.play('impact');
    });
    sim.bus.on('explosion', (e) => {
      this.noteStrike(e.x, e.y);
    });
    sim.bus.on('bot:ability', () => this.audio.play('ability'));
    sim.bus.on('bot:firstImpact', (e) => {
      this.audio.play('impact');
      this.renderer.juice.flash(e.x, e.y, 'dust');
    });
  }

  private tick(dt: number): void {
    if (this.phase !== 'play') return;
    if (this.paused || this.backgrounded || this.rotate.isVisible()) return;

    const prev = this.session.getState();
    if (prev === 'intro') this.introElapsed += dt;
    this.session.update(dt);
    const state = this.session.getState();

    this.recordResultOnce();
    if (this.pendingResult) {
      this.resultDelay -= dt;
      if (this.resultDelay <= 0) {
        const pending = this.pendingResult;
        this.pendingResult = null;
        this.results.show(pending.won, pending.score, pending.stars);
        this.hud.hide();
      }
    }

    const sim = this.session.getSim();
    const bot = sim?.shotBots()[0];
    if (bot?.body && state === 'flight') {
      const p = bot.body.getPosition();
      this.trail.sample(p.x, p.y, sim!.getSimTime(), dt);
    } else if (state !== 'resolve') {
      this.trail.clear();
    }

    this.sling.syncLoadedBot();
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
        reducedMotion: this.save.settings.reducedMotion === true,
        topHudPx: 56,
        canvasPxH: this.canvas.clientHeight,
        manualOffset: null,
      },
      dt
    );

    const best = this.levelId ? (this.save.load().levels[this.levelId]?.bestScore ?? 0) : 0;
    this.hud.setScore(this.session.getScore(), best);
    this.hud.setShots(this.session.getBotQueue().length);
    const showTip = state === 'aim' || state === 'intro';
    this.hud.setTip(showTip && def ? (def.hint ?? this.tipFor(def)) : '');
  }

  private draw(_alpha: number, frameDt: number): void {
    this.syncSimulationPause();
    const shake = this.camera.getShake();
    this.sling.setProjector((cx, cy) =>
      clientToWorld(cx, cy, this.canvas, this.currentView)
    );
    this.renderer.syncLevel(this.session.getSim());
    const aiming = this.phase === 'play' && this.session.getState() === 'aim';
    this.renderer.syncSling(
      this.sling.model,
      this.session.getBotQueue(),
      aiming,
      this.trail
    );
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
