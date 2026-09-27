import type { GameSession } from '../game/GameSession';
import type { Renderer } from '../render/Renderer';
import type { View } from '../camera/fitRect';
import type { FixedStepLoop } from '../core/FixedStepLoop';
import { levelById } from '../levels/registry';

export type DebugSnapshot = {
  state: string;
  levelId: string | null;
  score: number;
  botsLeft: number;
  pigsAlive: number;
  abilityUsed: boolean;
  paused: boolean;
  slingPhase: string;
  pullX: number;
  pullY: number;
  bot: {
    kind: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
  } | null;
  /** Sling fixture state: pouch bot, queue positions, hopper pose. */
  sling: {
    loaded: { x: number; y: number } | null;
    queue: { x: number; y: number }[];
    hopper: { x: number; y: number; sx: number; sy: number; rot: number; t: number } | null;
  };
  camera: { cx: number; cy: number; height: number };
  frame: number;
  fps: { p50: number; p5Low: number };
  renderer: { calls: number; triangles: number; geometries: number; textures: number };
};

export type DebugApi = {
  snapshot: () => DebugSnapshot;
  loadLevel?: (id: string) => void;
  launch?: (angleDeg: number, speed: number) => void;
  advance?: (steps: number) => void;
  setSeed?: (n: number) => void;
  freezeTime?: (on: boolean) => void;
  popup?: (x: number, y: number, text: string, color?: string, scale?: number) => void;
  damage?: (id: string, amount: number) => boolean;
  /** Read back rendered pixels: canvas-relative CSS px rect → raw RGBA bytes. */
  sample?: (x: number, y: number, w: number, h: number) => number[];
  /** Enter a level WITHOUT skipping the intro camera — evidence captures. */
  startIntro?: (id: string) => void;
  /** Force a sun/moon shot reaction — evidence captures. */
  celestialReact?: (kind: 'great' | 'good' | 'miss' | null) => void;
  /** CSS-px position of the celestial disc center — evidence captures. */
  celestialScreen?: () => { x: number; y: number };
  /** Teleport a drifting cloud (layer-local x) — evidence captures. */
  cloudJump?: (i: number, x: number) => void;
  /** Celestial layer-local home position — evidence captures. */
  celestialHome?: () => { x: number; y: number };
};

export function createDebugApi(opts: {
  session: GameSession;
  renderer: Renderer;
  getView: () => View;
  getLevelId: () => string | null;
  getPaused: () => boolean;
  getSling: () => { phase: string; pullX: number; pullY: number };
  loop: FixedStepLoop;
  fixtures?: boolean;
  /** Full App-level level entry (screens, chapter, parallax, sling reset) so
   * fixture captures render the real in-game state, not a bare session. */
  enterLevel: (id: string) => void;
  /** Same as enterLevel but keeps the intro camera (no skipIntro). */
  enterLevelIntro: (id: string) => void;
}): DebugApi {
  const snap = (): DebugSnapshot => {
    const sim = opts.session.getSim();
    const bot = sim?.shotBots()[0];
    const body = bot?.body;
    const v = body?.getLinearVelocity();
    const view = opts.getView();
    const fps = opts.renderer.fpsStats();
    const info = opts.renderer.getInfo();
    const sling = opts.getSling();
    return {
      state: opts.session.getState(),
      levelId: opts.getLevelId(),
      score: opts.session.getScore(),
      botsLeft: opts.session.getBotQueue().length,
      pigsAlive: sim?.pigsAlive() ?? 0,
      abilityUsed: opts.session.getPrimaryAbilityUsed(),
      paused: opts.getPaused(),
      slingPhase: sling.phase,
      pullX: sling.pullX,
      pullY: sling.pullY,
      bot:
        body && bot
          ? {
              kind: bot.botKind,
              x: body.getPosition().x,
              y: body.getPosition().y,
              vx: v?.x ?? 0,
              vy: v?.y ?? 0,
              speed: v?.length() ?? 0,
            }
          : null,
      sling: {
        loaded: opts.renderer.loadedPos(),
        queue: [...opts.renderer.queuePositions()],
        hopper: opts.renderer.hopperPose(),
      },
      camera: { cx: view.cx, cy: view.cy, height: view.h },
      frame: opts.renderer.frameCount,
      fps,
      renderer: info,
    };
  };

  const api: DebugApi = { snapshot: snap };

  if (opts.fixtures) {
    api.loadLevel = (id: string) => {
      if (levelById(id)) opts.enterLevel(id);
    };
    api.launch = (angleDeg: number, speed: number) => opts.session.launch(angleDeg, speed);
    api.advance = (steps: number) => opts.loop.advance(steps);
    api.setSeed = (n: number) => opts.session.getSim()?.setSeed(n);
    api.freezeTime = (on: boolean) => {
      opts.loop.paused = on;
    };
    api.popup = (x, y, text, color = '#ffe066', scale = 1) => {
      opts.renderer.juice.textSprite(x, y, text, color, scale);
    };
    api.damage = (id, amount) => {
      const e = opts.session
        .getSim()
        ?.registry.all()
        .find((x) => x.id === id && 'hp' in x);
      if (!e || !('hp' in e)) return false;
      e.hp = Math.max(0.01, e.hp - amount);
      return true;
    };
    api.sample = (x, y, w, h) => Array.from(opts.renderer.samplePixels(x, y, w, h));
    api.startIntro = (id) => {
      if (levelById(id)) opts.enterLevelIntro(id);
    };
    api.celestialReact = (kind) => opts.renderer.celestialReact(kind);
    api.celestialScreen = () => opts.renderer.celestialScreen();
    api.cloudJump = (i, x) => opts.renderer.setCloudX(i, x);
    api.celestialHome = () => opts.renderer.celestialHome();
  }

  return api;
}

declare global {
  interface Window {
    __debug?: DebugApi;
  }
}
