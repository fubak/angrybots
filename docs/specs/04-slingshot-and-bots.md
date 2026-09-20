# 04 — Slingshot, Bots, and Abilities

Goal: aiming that feels like Angry Birds. The power you see is the power you get, there's no auto-correction, and each bot has a one-tap ability that changes how you solve a level.

## What changes from today

| Today | v2 |
| --- | --- |
| Launch speed has an 11 m/s floor: even a tiny pull goes far | Linear from 0 to max after a small dead zone |
| Low shots are silently lifted (`SLING_MIN_LAUNCH_LIFT`) | No correction; the launch direction is exactly opposite the pull |
| Full predicted flight path every shot | The previous shot's trail. Optional short guide in settings (off by default) |
| 55 ms "coiling" delay after release | Launch on the release event |
| Abilities are passive (faster, heavier, auto-split) | Tap during flight to activate |
| Next bots only shown as HUD dots | Bots wait in line on the ground and hop onto the sling |

## Launch math (headless)

```ts
// src/sling/launch.ts
export const SLING = {
  anchor: { x: -7.5, y: 2.2 },   // fork center; y is measured from the sling base (ground or terrain)
  maxPull: 2.6,                  // world units
  deadZone: 0.25,                // below this, release = cancel
  maxSpeed: 23,                  // m/s at full pull
  minLaunchDeg: -60, maxLaunchDeg: 90,   // allowed launch direction range (0 = straight right)
};
export type Pull = { x: number; y: number };   // anchor − bot position (points away from the launch)

/** Clamp a raw pull (from the pointer) to the allowed range. */
export function clampPull(raw: Pull, botRadius: number): Pull;
/** Returns null when the pull is inside the dead zone (cancel). */
export function launchVelocity(pull: Pull): { vx: number; vy: number; speed: number; angleDeg: number } | null;
```

`clampPull` rules, applied in this order:

1. Length above `maxPull` → scale down to `maxPull`.
2. Launch angle (the direction of `pull`) outside [−60°, 90°] → rotate to the nearest limit, keeping length.
3. The bot's pulled position (anchor − pull) must keep its bottom at least 0.02 above the ground. If it doesn't, shorten the pull along its direction until it does.

`launchVelocity`:

- `len = |pull|`; if `len < deadZone` → `null`
- `speed = maxSpeed × (len − deadZone) / (maxPull − deadZone)` (**linear**, no exponent, no floor)
- direction = `pull / len`
- The bot is released **from its pulled position** with that velocity.

The physics harness and `level:solve` launch from the anchor with an explicit angle and speed. That's intentional; they test levels, not input.

## Sling model and input

```ts
// src/sling/SlingModel.ts — headless state
export type SlingPhase = 'empty' | 'loaded' | 'dragging';
export class SlingModel {
  phase: SlingPhase;
  pull: Pull;                          // current clamped pull
  tension(): number;                   // |pull| / maxPull, 0..1
  beginDrag(worldX: number, worldY: number): boolean;  // true if the grab is accepted
  moveDrag(worldX: number, worldY: number): void;
  endDrag(): { vx: number; vy: number } | 'cancel';
  cancel(): void;
}
```

`SlingInput.ts` maps pointer events to the model. Rules:

- **Grab:** `pointerdown` is accepted when the game state is `aim` and either (a) the world point is within 1.4 units of the loaded bot's center, or (b) the screen point is in the left 35% of the canvas and the camera is in sling view. For (b), pull is measured from where the pointer went down, not from the bot, so a drag anywhere on the left side works.
- Only the first pointer aims. Other pointers are ignored until it ends.
- `pointermove` → `moveDrag` with the world point from the orthographic camera. Emit `sling:aimUpdate` at most once per frame.
- `pointerup` → `endDrag`. Velocity → emit `bot:launched`, go to `flight`. `cancel` → emit `sling:cancel`, stay in `aim`.
- `pointercancel`, `lostpointercapture`, window `blur`, a resize, or pausing → `cancel()`.
- The canvas has `touch-action: none`. Call `preventDefault` on touch `pointerdown` and `pointermove` while dragging.
- Keyboard (accessibility): with the canvas focused, arrow keys adjust the pull (←/→ angle ±2°, ↑/↓ tension ±5%), Space launches, Escape cancels. The pull starts at 45° and 75% tension.

## Shot trail

`src/sling/ShotTrail.ts` (headless; `render/fx/TrailView.ts` draws it):

- From launch, record the tracked bot's position every 0.05 s until 0.4 s after its first impact, or until it's removed.
- Split: track the middle child.
- Keep the **current** trail and the **previous** trail. While aiming, show the previous trail. When the next bot launches, the current trail becomes previous.
- Clear both on restart and level load.
- Drawing: alternate dot radii 0.07 and 0.12, white with a 0.02 dark outline, full opacity. Mark the first-impact point with a 0.2 "puff" ring.

## Aim guide (accessibility setting)

Setting `aimGuide: 'off' | 'short'`, default `'off'`. When `'short'` and dragging, draw 6 dots along the analytic arc `p(t) = p0 + v·t + ½·g·t²` at t = 0.05…0.30 s. It never extends past 0.30 s. It's computed analytically: no physics world is created.

## Bot profiles

```ts
// src/bots/profiles.ts
export type BotKind = 'grok' | 'dash' | 'split' | 'heavy' | 'blast';
export const BOT_PROFILES: Record<BotKind, BotProfile> = { … };
```

| Kind | Radius | Density | Mass | Launch speed | Affinity | Ability (tap) | Role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grok | 0.58 | 1.0 | 1.06 | ×1.0 | none | none (a chirp and a blink only) | All-rounder |
| dash | 0.50 | 1.0 | 0.79 | ×1.0 | wood ×2 | **Boost** | Punches through wood |
| split | 0.50 | 1.0 | 0.79 | ×1.0 | glass ×2.5 | **Split into 3** | Glass, spread targets |
| heavy | 0.72 | 1.1 | 1.79 | ×1.0 | stone ×2 | **Slam** straight down | Stone, crushing |
| blast | 0.62 | 1.0 | 1.21 | ×1.0 | none | **Detonate** | Expansion only ([11-content.md](11-content.md)) |

All bots launch at the same speed for the same pull. Differences come from mass, size, affinity, and ability.

## Abilities

```ts
// src/bots/abilities.ts (headless)
export function canActivate(bot: BotEntity, now: number): boolean;
export function activate(bot: BotEntity, ctx: AbilityContext): void;  // emits 'bot:ability'
```

**Activation:** the first `pointerdown` on the canvas (not on a UI button) during state `flight`, or the Space key. It applies to the most recently launched bot. **Once per bot.**

**Window:** from launch until the bot's first impact or 4.0 s after launch, whichever comes first. Exception: Blast can detonate after impact (see its row). After the window closes, taps do nothing and no sound plays.

| Kind | Effect | Exact behavior |
| --- | --- | --- |
| dash | Boost | `v' = normalize(v) × min(max(|v| × 1.9, 20), 36)`. Flame trail for 0.6 s. |
| split | Split | Remove the bot body. Spawn 3 children at the same position, offset ±0.45 perpendicular to v for the outer two. Velocities are v rotated by −12°, 0°, +12° at the same speed. Children: radius 0.38, density 1.0, category BOT with mask excluding BOT, same affinity as split. The shot ends when all 3 are done. |
| heavy | Slam | `v' = (v.x × 0.3, −26)`. Set fixture density to 3.0 and call `body.resetMassData()`. Shockwave ring effect. |
| blast | Detonate | `explode(botCenter, radius 3.5, impulse 18, damage 45)`, remove the bot. If not tapped, it detonates automatically 1.5 s after first impact. |
| grok | none | Blink and chirp. Doesn't count as used. |

Setting velocity is allowed here and only here (see the forbidden patterns in [02-physics.md](02-physics.md#forbidden-in-physics-code)).

## Bot queue

- The level's `bots` array is the queue. The first bot loads into the pouch at level start.
- Waiting bots stand on the ground left of the sling at `x = sling.x − 1.6 − i × 1.3` (i = 0 for the next bot), bottoms on the ground. They are **views only**, not physics bodies.
- Idle animation: a small bounce every 1.5–3 s (random per bot, seeded), plus a blink.
- **Next-bot hop** (state `nextBot`, 0.45 s): the next bot jumps along a parabola from its spot to the pouch (peak 1.2 above the start), lands with a squash, then the line shuffles right over 0.3 s.
- The HUD still shows compact bot icons as a secondary indicator.

## Tasks

### SLG-01 — Launch math (S)

- **Depends on:** APP-01
- **Tests:** `tests/unit/launch.test.ts`
  - `launchVelocity({x: 0.2, y: 0})` → null (dead zone)
  - full pull at 45° → speed 23, angle 45° ± 0.01
  - pull length (0.25 + 2.6) / 2 → speed 11.5 ± 0.01 (linearity)
  - pull pointing toward launch angle 120° → clamped to 90°
  - pulled position below ground → shortened so bottom = 0.02 ± 0.001
  - the monotonic property: 100 random lengths sorted → speeds sorted

### SLG-02 — SlingModel and SlingInput (M)

- **Depends on:** SLG-01, APP-02
- **Do:** implement both; delete `src/systems/SlingSystem.ts`, `sling/launchCurve.ts`, `sling/launchImpulse.ts`, `sling/ballisticArc.ts`, `sling/pointerTiming.ts` and their tests.
- **Tests:** unit tests for the model (grab radius, cancel paths). e2e: `tests/e2e/sling.spec.ts`
  - mouse drag from the bot 150 px left and 100 px down, then release → `snapshot().bot.vx > 0`, `vy > 0`, and the launch angle is within ±3° of the angle computed from the camera projection
  - a drag that returns inside the dead zone → cancel, bots left unchanged
  - a touch drag using Playwright's `touchscreen` in the mobile project → launches
  - a second finger during aim doesn't change the pull
  - `pointercancel` mid-drag → cancel

### SLG-03 — Shot trail and aim guide (S)

- **Depends on:** SLG-02, REN-01
- **Tests:** unit: point spacing is 0.05 s; the previous/current swap; clears on restart. Visual: `tests/visual/trail.spec.ts` screenshot of the trail after a fixture shot on First Flight.

### SLG-04 — Bot profiles and abilities (M)

- **Depends on:** PHY-03, SLG-02
- **Tests:** `tests/physics/abilities.test.ts`, fixture launches at 45°, 18 m/s:
  - dash activated at t = 0.4 s: speed after = min(max(speed_before × 1.9, 20), 36) ± 0.01
  - split at t = 0.4 s: exactly 3 bot bodies; velocity angles differ by 12° ± 0.1; the original body is gone
  - heavy at t = 0.4 s: vy = −26 ± 0.01 and mass = 3.0 × π × 0.72² ± 0.01
  - a second activation does nothing
  - activation after first impact does nothing (except blast)
  - C14–C16 from [02-physics.md](02-physics.md#phy-03--contact-pipeline-and-damage-m)

### SLG-05 — Bot queue and hop (S)

- **Depends on:** SLG-04, APP-03
- **Do:** use the placeholder bot views; REN-03 swaps in the final characters.
- **Tests:** e2e: after the first shot resolves on Powder Row, within 1.5 s the state is `aim` and `snapshot().bot.kind === 'grok'`. Visual: the queue screenshot at level start shows 2 waiting bots.
