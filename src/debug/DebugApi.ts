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
  camera: { cx: number; cy: number; height: number };
  fps: { p50: number; p95: number };
  renderer: { calls: number; triangles: number; geometries: number; textures: number };
};

export type DebugApi = {
  snapshot: () => DebugSnapshot;
  loadLevel?: (id: string) => void;
  launch?: (angleDeg: number, speed: number) => void;
  advance?: (steps: number) => void;
  setSeed?: (n: number) => void;
  freezeTime?: (on: boolean) => void;
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
      camera: { cx: view.cx, cy: view.cy, height: view.h },
      fps,
      renderer: info,
    };
  };

  const api: DebugApi = { snapshot: snap };

  if (opts.fixtures) {
    api.loadLevel = (id: string) => {
      const def = levelById(id);
      if (def) opts.session.loadLevel(def, true);
    };
    api.launch = (angleDeg: number, speed: number) => opts.session.launch(angleDeg, speed);
    api.advance = (steps: number) => opts.loop.advance(steps);
    api.setSeed = (n: number) => opts.session.getSim()?.setSeed(n);
    api.freezeTime = (on: boolean) => {
      opts.loop.paused = on;
    };
  }

  return api;
}

declare global {
  interface Window {
    __debug?: DebugApi;
  }
}
