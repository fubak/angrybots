import '../ui/styles.css';
import { EventBus } from '../core/EventBus';
import { FixedStepLoop } from '../core/FixedStepLoop';
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

  private hud: Hud;
  private pauseMenu: PauseMenu;
  private results: ResultsPanel;
  private title: TitleScreen;
  private levelSelect: LevelSelect;

  constructor(root: HTMLElement) {
    this.save.load();
    this.shell = document.createElement('div');
    this.shell.style.cssText = 'position:relative;width:100%;height:100%;min-height:100vh';
    root.appendChild(this.shell);

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%';
    this.shell.appendChild(this.canvas);

    this.uiRoot = document.createElement('div');
    this.uiRoot.id = 'ui-root';
    this.shell.appendChild(this.uiRoot);

    this.renderer = new Renderer(this.canvas);
    this.sling = new SlingInput(this.canvas, this.session, this.bus);

    this.hud = new Hud(this.uiRoot, () => this.togglePause(), () => this.session.restart());
    this.pauseMenu = new PauseMenu(this.uiRoot, {
      resume: () => this.togglePause(false),
      restart: () => {
        this.togglePause(false);
        this.session.restart();
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
      this.impactCenter = { x: e.x, y: e.y };
    });

    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.togglePause();
      if (ev.key === 'r' || ev.key === 'R') this.session.restart();
      if (ev.key === ' ' && this.session.getState() === 'flight') {
        this.session.activateAbility();
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
      loop: this.loop,
      fixtures,
    });

    this.loop.start();
  }

  private goLevelSelect(): void {
    this.phase = 'levelSelect';
    this.title.hide();
    this.results.hide();
    this.pauseMenu.toggle(false);
    this.levelSelect.populate(allLevels(), (id) => {
      const l = levelById(id);
      if (!l) return false;
      if (l.order === 1) return true;
      return this.save.levelProgress(id)?.cleared === true || l.order <= 5;
    });
    this.levelSelect.show();
    this.hud.hide();
  }

  private startLevel(id: string): void {
    const def = levelById(id);
    if (!def) return;
    this.levelId = id;
    this.phase = 'play';
    this.levelSelect.hide();
    this.title.hide();
    this.results.hide();
    this.trail.clear();
    this.introElapsed = 0;
    this.impactCenter = null;
    this.session.loadLevel(def, this.save.settings.reducedMotion === true);
    this.hud.show();
    this.sling.syncLoadedBot();
  }

  private onResultsAction(action: 'retry' | 'next' | 'levels'): void {
    this.results.hide();
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
    this.paused = force ?? !this.paused;
    this.loop.paused = this.paused || this.rotate.update();
    this.pauseMenu.toggle(this.paused);
  }

  private tick(dt: number): void {
    if (this.rotate.update()) {
      this.loop.paused = true;
      return;
    }
    if (this.phase !== 'play') return;

    const prev = this.session.getState();
    if (prev === 'intro') this.introElapsed += dt;
    this.session.update(dt);
    const state = this.session.getState();

    if (state === 'won' || state === 'lost') {
      const won = state === 'won';
      const stars = this.session.getStars();
      const score = this.session.getScore();
      if (this.levelId) {
        this.save.recordLevel(this.levelId, score, stars, won);
      }
      this.results.show(won, score, stars);
    }

    const sim = this.session.getSim();
    const bot = sim?.shotBots()[0];
    if (bot?.body && state === 'flight') {
      const p = bot.body.getPosition();
      this.trail.sample(p.x, p.y, sim!.getSimTime(), dt);
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
  }

  private draw(_alpha: number, frameDt: number): void {
    const shake = this.camera.getShake();
    this.sling.setProjector((cx, cy) =>
      clientToWorld(cx, cy, this.canvas, this.currentView)
    );
    this.renderer.syncLevel(this.session.getSim());
    this.renderer.applyView(this.currentView, shake.x, shake.y);
    this.renderer.render(_alpha, frameDt);
  }

  private onResize(): void {
    const w = this.shell.clientWidth;
    const h = this.shell.clientHeight;
    this.renderer.setSize(w, h);
  }
}
