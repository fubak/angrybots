# 05 — Camera

Goal: the camera tells the story of each shot. It shows the whole level, frames the sling for aiming, follows the flight, holds on the destruction, and returns. The player can always look around between shots.

The camera is orthographic, looking down −z. Everything is expressed as a **view rectangle** in world units: `{ cx, cy, h }` (center and visible height). Width comes from the aspect ratio.

## Math (headless)

```ts
// src/camera/fitRect.ts
export type Rect = { x0: number; x1: number; y0: number; y1: number };
export type View = { cx: number; cy: number; h: number };
/** Smallest view that shows `r` fully at this aspect, plus padding (world units). */
export function fitRect(r: Rect, aspect: number, pad = 0.5, topHudPx = 0, canvasPxH = 1): View;
/** Clamp a view so it stays inside bounds. If the view is larger than the bounds on an axis, center it on that axis. */
export function clampView(v: View, bounds: Rect, aspect: number): View;
export function unionRect(a: Rect, b: Rect): Rect;
```

- `fitRect`: `h = max(r.height + 2·pad, (r.width + 2·pad) / aspect)`. Then add HUD room: `h += h × topHudPx / canvasPxH`, and shift `cy` up by half of that addition.
- The level `camera` field is the bounds used by `clampView`.

## Named views

| View | Rectangle |
| --- | --- |
| `overview` | The level's `camera` bounds |
| `sling` | x from `sling.x − 3.5` to `sling.x + 15.5`, y from 0 to 9 |
| `aim(t)` | `sling` widened right by `4 × tension` (the camera eases out while pulling, as in Angry Birds) |
| `follow` | See Flight |
| `impact` | See Impact |

## Director modes

`src/camera/CameraDirector.ts` replaces `systems/CameraRig.ts`. It picks a target view each frame based on game state, then smooths toward it.

| Game state | Mode | Target |
| --- | --- | --- |
| `intro` | intro | `overview` for 1.0 s, then eases to `sling` over 1.2 s (ease-in-out cubic). Any tap or key skips to `sling`. |
| `aim` | aim | `aim(tension)` unless manual control is active |
| `flight` | follow | Flight rule below |
| `flight` after the first impact, and `resolve` | impact | Impact rule below |
| `nextBot` | return | Eases to `sling` over 0.9 s |
| `won` / `lost` | overview | `overview` over 1.0 s |

**Flight rule:** each frame, with bot position p and velocity v:

- `lead = clamp(v.x × 0.25, −2, 4)`
- rect x from `p.x + lead − 9` to `p.x + lead + 9`
- rect y from `bounds.minY` to `max(p.y + 3, 9)`
- target = `clampView(fitRect(rect))`

High arcs zoom out, and the ground stays in view.

**Impact rule:** on `bot:firstImpact`, compute the bounding box of every live block and pig whose center is within 10 units of the impact point, union it with the bot's position, and pad by 2. Minimum width 14. Recompute every 0.25 s while bodies are moving, so a toppling tower stays in frame. Never zoom in more than `sling.h × 0.85`.

## Smoothing

- Critically damped approach on `cx`, `cy`, `h` separately: `x += (target − x) × (1 − exp(−λ·dt))`
- λ = 3.5 for intro, return and overview; 6 for follow; 4 for impact; 12 for aim.
- Timed transitions (intro, return) use their fixed duration and easing. Apply λ smoothing only after the transition ends.

## Manual look

- Available in `aim` (when not dragging the sling) and `resolve`.
- One-pointer drag that doesn't start on the sling grab area pans. Pan is 1:1 with the pointer in world units.
- Mouse wheel and two-finger pinch zoom around the pointer or pinch midpoint. `h` ranges from `sling.h × 0.85` to `overview.h`.
- Once the player pans or zooms, manual control holds until the next launch, a double-tap, or the HUD recenter button. Then the camera eases back to the mode target over 0.6 s.
- During `flight` all manual input is ignored, because taps activate abilities.

## Screen shake

A trauma model (smoother and more controllable than the current sin-sum):

- `trauma` in [0, 1]. Add on events:
  - `contact:impact`: `min(impulse / 40, 0.35)`
  - `explosion`: 0.6
  - heavy slam landing: 0.45
  - `pig:destroyed`: 0.1
- Offset = `0.35 × trauma² × (noise1(t × 25), noise2(t × 25))` in world units, using a seeded 1D value noise from `core/rng.ts`.
- `trauma` decays 1.6 per second.
- Shake is applied after clamping, so it can briefly show past the bounds. That's fine.

**Slow motion (juice):** when 2 or more explosions happen within 0.3 s, or a single contact impulse exceeds 30, set `loop.timeScale = 0.35` for 0.25 s real time, then restore. At most once per shot.

## Reduced motion

When the `reducedMotion` setting is on, or `prefers-reduced-motion: reduce` is set and the player hasn't changed the setting:

- no shake and no slow motion
- intro: show `sling` directly, no overview pan
- every transition lasts 0.2 s
- follow uses λ = 20 (nearly locked, so there's no swaying)

## Orientation

- Landscape is the target. On devices with `(pointer: coarse)` in portrait, show `RotatePrompt` (see [06-game-flow-ui.md](06-game-flow-ui.md)) and pause the loop.
- Desktop windows of any shape work: `fitRect` handles any aspect ratio.

## Tasks

### CAM-01 — fitRect and clampView (S)

- **Depends on:** APP-01
- **Tests:** `tests/unit/camera-math.test.ts`
  - a 10 × 5 rect at aspect 2 → h = 5 + 2·pad
  - a 10 × 5 rect at aspect 1 → h = 10 + 2·pad
  - HUD padding shifts `cy` up
  - clamp keeps the view inside bounds; oversized views are centered
  - union of two rects

### CAM-02 — CameraDirector modes (M)

- **Depends on:** CAM-01, GAME-02
- **Do:** implement every mode and the smoothing; delete `systems/CameraRig.ts`.
- **Tests:** `tests/visual/camera.spec.ts` (fixture mode, fixed seed):
  - at level start after 1.0 s, every pig and block projects inside NDC [−1, 1] (overview)
  - at 2.5 s, the loaded bot is in the left third of the screen (sling view)
  - during a fixture flight on Hilltop, the bot is inside NDC [−0.9, 0.9] every frame
  - 0.5 s after first impact, every pig within 10 units of the impact is inside the view
  - after `nextBot`, the view is within 0.05 of `sling`

### CAM-03 — Manual look (S)

- **Depends on:** CAM-02, SLG-02
- **Tests:** e2e:
  - dragging on the right half in `aim` moves `snapshot().camera.cx`
  - the wheel changes `h` within its limits
  - a double-tap restores
  - during flight, a drag doesn't move the camera and does trigger the ability

### CAM-04 — Shake, slow motion, reduced motion (S)

- **Depends on:** CAM-02
- **Tests:** unit: the trauma decay curve, and the offset bound (never over 0.35). e2e: with reduced motion on, the intro skips (sling view within 0.3 s) and the camera offset is always 0.
