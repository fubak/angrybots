# 01 — Architecture

Goal: split the 1,300-line `Game.ts` into modules with one job each, and keep simulation code headless so it can be tested in Node.

## Coordinates and units

- x points right, toward the structures. y points up. z points toward the camera.
- **Physics ground top is y = 0.** The drawn ground top is also y = 0 (the current mismatch of about 0.43 is removed).
- Gameplay happens in the plane z = 0. Meshes have depth for the toon look; physics is 2D.
- Slingshot base: x = −7.5, y = 0. Launch anchor (the fork center): `SLING.anchor = { x: -7.5, y: 2.2 }`.
- Structures live between x = 6 and x = 30. The level's `camera` bounds define the playable rectangle.
- Time: seconds. Physics step: fixed 1/60 s.
- Angles: radians in code, degrees only in level data and test names.

## Folder layout

Create this layout. Names in parentheses are the current files each module absorbs; delete the old file when the task that replaces it is done (see the Removal list).

```text
src/
  main.ts                    bootstrap only
  app/
    App.ts                   wires modules, owns the loop       (Game.ts constructor)
  core/
    EventBus.ts              typed pub/sub
    FixedStepLoop.ts         accumulator loop + interpolation alpha
    StateMachine.ts          generic FSM with enter/exit hooks
    rng.ts                   seeded PRNG (mulberry32)
    math.ts                  clamp, lerp, damp, easing        (math.ts)
  config/
    tuning.ts                every gameplay number             (config.ts)
    render.ts                palette, outline widths, layers
  physics/                   HEADLESS (no three, no DOM)
    PhysicsWorld.ts          planck World, step, contact hooks (systems/PhysicsWorld.ts, physics/*)
    damage.ts                approach-speed + impulse damage   (game/ContactSystem.ts)
    explosions.ts            TNT and Blast radial impulses
    fragments.ts             convex splitting of broken blocks (systems/DebrisSystem.ts)
    quiet.ts                 quiet detection                   (game/SceneQuiescence.ts)
    categories.ts            collision filter bits
  entities/                  HEADLESS
    Block.ts  Pig.ts  Bot.ts  Terrain.ts  Fragment.ts
    EntityRegistry.ts        id → entity, iteration, disposal
  bots/                      HEADLESS
    profiles.ts              per-bot numbers                   (bots/registry.ts, bots/types.ts)
    abilities.ts             tap abilities
  sling/                     HEADLESS except SlingInput
    launch.ts                pull → velocity                   (sling/launch*.ts)
    SlingModel.ts            pull state, phases
    SlingInput.ts            pointer events → SlingModel       (systems/SlingSystem.ts input half)
    ShotTrail.ts             previous-shot trail points
  levels/                    HEADLESS
    schema.ts  kit.ts  validate.ts  load.ts
    data/*.json              one file per level                (levels/*.ts)
  game/                      HEADLESS
    GameSession.ts           rules: shots, win/lose, bonus     (Game.ts rules)
    Scoring.ts               (game/Scoring.ts)
    SaveStore.ts             (game/ProgressStore.ts)
  camera/
    CameraDirector.ts        (systems/CameraRig.ts)
    fitRect.ts               HEADLESS math
  render/                    three.js only
    Renderer.ts  toon.ts  outline.ts  Environment.ts
    views/ BlockView.ts PigView.ts BotView.ts SlingView.ts FragmentView.ts TerrainView.ts
    fx/ ParticlePool.ts ScorePopups.ts TrailView.ts BlobShadows.ts
  audio/
    AudioBus.ts  SoundBank.ts  manifest.json                   (systems/AudioSystem.ts)
  ui/
    Hud.ts  PauseMenu.ts  ResultsScreen.ts  LevelSelect.ts  TitleScreen.ts
    SettingsPanel.ts  RotatePrompt.ts  styles.css              (ui/FlowOverlay.ts, style.css)
  debug/
    DebugApi.ts              dev-only read-only snapshot + fixture hooks
tools/
  level-check.ts  level-solve.ts  level-rate.ts  calibrate.ts
tests/
  unit/  physics/  e2e/  visual/
```

**Headless rule:** files marked HEADLESS may import only from other headless folders, `planck`, and the standard library. A CI check enforces this (see [10-qa.md](10-qa.md#forbidden-patterns)).

## Module contracts

### EventBus

```ts
// src/core/EventBus.ts
export type GameEvents = {
  'level:loaded': { levelId: string };
  'level:settled': {};
  'sling:aimStart': {};
  'sling:aimUpdate': { tension: number; angle: number };
  'sling:cancel': {};
  'bot:launched': { botId: string; kind: BotKind; speed: number };
  'bot:ability': { botId: string; kind: BotKind };
  'bot:firstImpact': { botId: string; x: number; y: number };
  'contact:impact': { aId: string; bId: string; x: number; y: number; impulse: number; materialA: MaterialOrActor; materialB: MaterialOrActor };
  'block:damaged': { id: string; material: Material; hpRatio: number; points: number; x: number; y: number };
  'block:destroyed': { id: string; material: Material; x: number; y: number; angle: number; points: number };
  'pig:damaged': { id: string; hpRatio: number; x: number; y: number };
  'pig:destroyed': { id: string; x: number; y: number; points: number };
  'explosion': { x: number; y: number; radius: number };
  'shot:resolved': { pigsLeft: number; botsLeft: number };
  'score:changed': { score: number; delta: number };
  'game:state': { from: GameStateId; to: GameStateId };
  'game:won': { score: number; stars: 0 | 1 | 2 | 3; bonus: number };
  'game:lost': { score: number };
};
export class EventBus<E extends Record<string, unknown>> {
  on<K extends keyof E>(type: K, fn: (e: E[K]) => void): () => void; // returns unsubscribe
  emit<K extends keyof E>(type: K, e: E[K]): void;
  clear(): void;
}
```

Events are emitted **after** the physics step completes, never from inside Planck callbacks. Physics callbacks only push to queues (see [02-physics.md](02-physics.md#contact-pipeline)).

### FixedStepLoop

```ts
// src/core/FixedStepLoop.ts
export class FixedStepLoop {
  constructor(opts: { step: number /* 1/60 */; maxStepsPerFrame: number /* 5 */;
    update: (dt: number) => void; render: (alpha: number, frameDt: number) => void;
    schedule: (cb: (nowMs: number) => void) => number;   // App passes requestAnimationFrame; tests pass a fake
    now: () => number });                                 // App passes performance.now
  start(): void; stop(): void;
  paused: boolean;          // when true, update() is not called; render() still is
  timeScale: number;        // 1 normally; used for slow-motion on big impacts (0.35 for 0.25 s)
  /** For tests: advance exactly n fixed steps synchronously. */
  advance(n: number): void;
}
```

- Accumulate real frame time (clamped to 0.1 s), call `update(step)` while the accumulator is at least `step`, up to `maxStepsPerFrame`, and drop any excess.
- `render(alpha)` gets the interpolation factor. Views interpolate between previous and current body transforms using alpha, so motion is smooth on 120 Hz displays without changing physics.
- **Pause** = `paused = true`. Nothing else changes: the bot keeps its velocity, timers freeze. This fixes the old pause bug (R02) by construction.

### StateMachine

```ts
export type GameStateId = 'boot' | 'title' | 'levelSelect' | 'intro' | 'aim' | 'flight'
  | 'resolve' | 'nextBot' | 'bonus' | 'won' | 'lost';
export class StateMachine<S extends string> {
  constructor(initial: S, table: Record<S, { enter?(): void; exit?(): void; update?(dt: number): void; next: S[] }>);
  go(to: S): void;  // throws if `to` is not in current.next
  readonly current: S;
}
```

Pause is **not** a state. It is a flag on the loop plus the pause menu overlay, so resuming always returns to exactly where play stopped.

State table and transitions: see [06-game-flow-ui.md](06-game-flow-ui.md#state-machine).

### Entities (headless)

```ts
export type Material = 'wood' | 'stone' | 'glass' | 'tnt';
interface EntityBase { id: string; body: planck.Body | null; alive: boolean; }
export interface BlockEntity extends EntityBase { kind: 'block'; material: Material; shape: 'box' | 'circle' | 'triangle';
  w: number; h: number; r?: number; depth: number; hp: number; maxHp: number; }
export interface PigEntity extends EntityBase { kind: 'pig'; size: 'S' | 'M' | 'L'; helmet: 'none' | 'hat' | 'helmet'; r: number; hp: number; maxHp: number; }
export interface BotEntity extends EntityBase { kind: 'bot'; botKind: BotKind; r: number; abilityUsed: boolean;
  firstImpactAt: number | null; spawnedFrom?: string; }
```

- Every Planck body's `userData` is its entity (`body.setUserData(entity)`).
- Entities never reference Three.js objects. Views look entities up by id.
- The `EntityRegistry` owns creation and destruction and emits `entity:added` / `entity:removed` so views can attach and detach.

### Render bridge

`render/` subscribes to registry and bus events. Every frame, `Renderer.render(alpha)`:

1. For each live entity, sets `view.position/rotation` from the interpolated body transform.
2. Updates effects (particles, popups, trail).
3. Asks `CameraDirector.update(frameDt)` for the camera rectangle and applies it.
4. Draws.

## Config

- `src/config/tuning.ts` exports one frozen object `TUNING` with the exact shape of `TUNING` in [reference/sim.mjs](reference/sim.mjs), extended by later specs (sling, camera, abilities, scoring). Every gameplay number comes from here.
- `src/config/render.ts` exports `PALETTE`, `OUTLINE`, `LAYERS` (render order), `DEPTH` (mesh z-depths). Every visual constant comes from here.

## Debug API (dev only)

`src/debug/DebugApi.ts` is attached as `window.__debug` only when `import.meta.env.DEV` or `?debug=1` is set. It has two groups of functions:

- **Read-only** (usable in any test): `snapshot()` → `{ state, levelId, score, botsLeft, pigsAlive, blocks: {id, material, x, y, angle, hpRatio}[], pigs: {...}[], bot: {...} | null, camera: {cx, cy, height}, fps }`.
- **Fixtures** (usable only in `tests/physics` and `tests/visual`, never `tests/e2e`): `loadLevel(id)`, `launch(angleDeg, speed)`, `advance(steps)`, `setSeed(n)`, `freezeTime(bool)`.

The production build must not contain the fixture functions. Tree-shake them behind `import.meta.env.DEV || __DEBUG_BUILD__`. CI verifies this with a grep on `dist/`.

## Removal list

Delete these when the replacing task is done. Each task names its deletions.

| Delete | Removed by |
| --- | --- |
| `cannon-es` dependency, `src/physics/planar.ts`, `src/physics/materials.ts` | PHY-01 |
| anchoring (`lockPhysics`, `pinIfAnchored`, `forceWake`, `structureWarmup`, `transferBotStrike`) | PHY-04 |
| `src/levels/*.ts` level files, `validateLayout.ts`, `authoring/fortDeck.ts` | LVL-03 |
| `src/systems/SlingSystem.ts` | SLG-03 |
| `src/systems/CameraRig.ts` | CAM-02 |
| `src/systems/AudioSystem.ts` (kept as `audio/SynthFallback.ts` until AUD-05) | AUD-05 |
| `src/ui/FlowOverlay.ts`, `src/style.css` | UI-06 |
| `src/Game.ts` | APP-03 |
| `src/counter.ts`, `src/assets/typescript.svg`, `src/assets/vite.svg`, `src/types/howler.d.ts` (use `@types/howler`) | APP-01 |
| `debugLaunchIntoFort` and every e2e use of it | QA-02 |
| `scripts/gauntlet-loop.sh` | APP-01 |

## Tasks

### APP-01 — Branch, cleanup, tooling (S)

- **Depends on:** none
- **Do:**
  - create branch `v2`
  - delete the unused files in the Removal list marked APP-01
  - add dev dependencies `tsx`, `@types/howler`, `@axe-core/playwright`, `@fontsource/baloo-2`
  - add `npm` scripts: `test:unit`, `test:physics`, `test:perf`, `level:check`, `level:solve`, `level:rate`, `lint:forbidden`, `size`, `verify` (the body of `verify` can start as `typecheck && test:unit` and grows with QA-04)
  - set `vitest.config.ts` to include `tests/unit/**` and `tests/physics/**`
  - create empty folders from the layout with an `index.ts` only where needed
  - add `docs/specs/ISSUES.md` (empty table: id, found in task, description, status)
  - extend `scripts/update-progress.mjs` with `task <ID> <todo|doing|done|blocked> [note]` writing `public/progress.json` → `tasks`, and update `public/progress.html` to show the phase tables from [PLAN.md](PLAN.md) with status colors; remove the old `pieces`/gauntlet fields
- **Tests:** `npm run verify` passes on the cleaned tree. The game still runs as before; nothing is rewired yet.

### APP-02 — Core: EventBus, FixedStepLoop, StateMachine, rng (S)

- **Depends on:** APP-01
- **Tests:** `tests/unit/core.test.ts`
  - the bus delivers events in subscription order; unsubscribe works; `clear` removes all
  - the loop with a fake `schedule`/`now`: 1 frame of 50 ms → 3 updates; 1 frame of 500 ms → 5 updates (capped); `paused` → 0 updates and still 1 render; `timeScale` 0.5 → half the updates; alpha in [0, 1)
  - the state machine throws on an illegal transition and calls exit then enter
  - `rng(seed)` produces the same first 5 values for the same seed; different seeds differ

### APP-03 — App wiring; retire Game.ts (L)

- **Depends on:** APP-02, PHY-02, LVL-03, SLG-02, GAME-02, CAM-02, REN-01
- **Do:**
  - `App.ts` creates the bus, loop, physics world, registry, session, sling input, camera director, renderer, audio, UI, and debug API, and connects them
  - `main.ts` only calls `new App(document.querySelector('#app')!)`
  - use simple placeholder views (plain toon boxes and spheres) until the REN tasks land
  - delete `Game.ts`
- **Tests:**
  - `levels-smoke.spec.ts` (every level reaches `aim` with no console errors)
  - `win.spec.ts` on First Flight
  - `pause.spec.ts`
