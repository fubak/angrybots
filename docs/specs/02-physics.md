# 02 — Physics (Planck.js)

Goal: structures that stand on their own, fall when their supports break, and take damage only from real impacts. Everything here is headless and testable in Node.

Reference implementation: [reference/sim.mjs](reference/sim.mjs). Port it to TypeScript in `src/physics/` and `src/entities/`, following this spec.

## World

```ts
// src/physics/PhysicsWorld.ts
import { World, Vec2 } from 'planck';
export class PhysicsWorld {
  readonly world = new World({ gravity: Vec2(0, TUNING.gravity), allowSleep: true });
  step(): void {               // always exactly one fixed step
    this.world.step(TUNING.dt, TUNING.velIters, TUNING.posIters);
    this.flushContacts();      // see Contact pipeline
    this.flushRemovals();      // destroy queued bodies AFTER the step
  }
  queueRemoval(body: planck.Body): void;
}
```

| Setting | Value | Why |
| --- | --- | --- |
| `gravity` | −18 | Keeps the current arc feel. Short, punchy flights. |
| `dt` | 1/60 | Fixed. Never pass frame time to `world.step`. |
| `velIters` / `posIters` | 10 / 8 | Stable stacks up to 8 blocks tall. |
| `allowSleep` | true | Bodies sleep by themselves once still. Never force sleep. |
| Ground | static box, top at y = 0, x from −50 to 70 | One body, friction 0.8 |
| Walls | none | Bodies that leave the bounds are removed (see Out of bounds) |

## Collision categories

```ts
// src/physics/categories.ts
export const CAT = { GROUND: 0x0001, TERRAIN: 0x0002, BLOCK: 0x0004, PIG: 0x0008, BOT: 0x0010, FRAGMENT: 0x0020 } as const;
export const MASK = {
  GROUND: 0xffff, TERRAIN: 0xffff,
  BLOCK: CAT.GROUND | CAT.TERRAIN | CAT.BLOCK | CAT.PIG | CAT.BOT,
  PIG: CAT.GROUND | CAT.TERRAIN | CAT.BLOCK | CAT.PIG | CAT.BOT,
  BOT: CAT.GROUND | CAT.TERRAIN | CAT.BLOCK | CAT.PIG,          // split children don't hit each other
  FRAGMENT: CAT.GROUND | CAT.TERRAIN,                           // fragments are visual only
};
```

## Bodies

| Entity | Shape | Body settings | Fixture |
| --- | --- | --- | --- |
| Block box | `Box(w/2, h/2)` | dynamic, angle from level `rot` | density/friction/restitution from `TUNING.materials[m]` |
| Block circle | `Circle(r)` | dynamic, `angularDamping: 0.6` | same |
| Block triangle | `Polygon([(-w/2,0),(w/2,0),(apexX,h)])` shifted so the centroid is at the body origin | dynamic | same |
| Pig | `Circle(r)`, r from size | dynamic, `angularDamping: 0.8` | `TUNING.pig` |
| Bot | `Circle(r)` from profile | dynamic, **`bullet: true`**, `angularDamping: 0.4` | `TUNING.bot` × profile |
| Terrain | static convex polygons | static | friction 0.8 |
| Fragment | convex `Polygon` from splitting (≤ 8 vertices) | dynamic, `angularDamping: 0.3` | material density × 0.5, `filterCategoryBits: FRAGMENT` |

Every body gets `setUserData(entity)`. Ground and terrain get `{ kind: 'ground' }` / `{ kind: 'terrain', id }`.

## Settle

Implemented in `Level.load()`, before the first frame is drawn:

1. Build every body at its level position with damage **disabled**.
2. Step `round(TUNING.settleSeconds / dt)` = 120 times **synchronously**, without rendering.
3. Enable damage and emit `level:settled`.

The player never sees settling. A level whose bodies move more than `0.08` units or rotate more than `1°` (blocks only) during settle fails validation (see [03-levels.md](03-levels.md#validation)).

## Contact pipeline

Planck callbacks run **inside** `world.step`. Never destroy bodies, emit events, or change velocities inside them. Record data only:

```ts
// src/physics/damage.ts
const approach = new WeakMap<planck.Contact, number>();

world.on('pre-solve', (contact) => {
  // Relative normal speed BEFORE the solver resolves the contact.
  // Resting contacts ≈ 0 → static load never deals damage.
  const wm = contact.getWorldManifold(null);
  if (!wm || wm.points.length === 0) return;
  const bA = contact.getFixtureA().getBody(), bB = contact.getFixtureB().getBody();
  let maxV = 0;
  for (const p of wm.points) {
    const vA = bA.getLinearVelocityFromWorldPoint(p), vB = bB.getLinearVelocityFromWorldPoint(p);
    const vn = -((vB.x - vA.x) * wm.normal.x + (vB.y - vA.y) * wm.normal.y);
    if (vn > maxV) maxV = vn;
  }
  approach.set(contact, maxV);
});

world.on('post-solve', (contact, impulse) => {
  if (!damageEnabled) return;
  if ((approach.get(contact) ?? 0) < TUNING.minApproachSpeed) return;
  const I = impulse.normalImpulses.reduce((a, b) => a + b, 0);
  pending.push({ a: userData(A), b: userData(B), impulse: I, point: wm.points[0] });
});
```

After the step, `flushContacts()`:

1. **Aggregate** per entity: take the **maximum** impulse received this step, not the sum (one body touching several others in one step would otherwise stack damage).
2. For each (entity, impulse, otherEntity): call `applyImpact(entity, impulse, otherEntity)`.
3. Emit one `contact:impact` per pair with impulse ≥ 1.0 (for audio and effects), at most 12 per step, strongest first.

## Damage model

```ts
function applyImpact(target: Block | Pig, impulse: number, other: Entity | null) {
  const min = target.kind === 'pig' ? TUNING.pig.minImpulse : TUNING.materials[target.material].minImpulse;
  if (impulse <= min) return;
  let dmg = (impulse - min) * (target.kind === 'pig' ? 1 : TUNING.materials[target.material].damageScale);
  if (other?.kind === 'bot' && target.kind === 'block') dmg *= affinity(other.botKind, target.material);
  const dealt = Math.min(dmg, Math.max(target.hp, 0));
  target.hp -= dmg;
  if (target.kind === 'block') session.addPoints(SCORE.damagePerHp * Math.round(dealt), target);
  emit(target.kind === 'pig' ? 'pig:damaged' : 'block:damaged', …);
  if (target.hp <= 0) destroy(target);
}
```

- Bots never take damage.
- Ground and terrain never take damage.
- Fragments neither deal nor take damage (their mask keeps them out of contacts with blocks and pigs).

### Material affinity

The multiplier applies to damage a bot deals to a **block** on direct contact. This gives each bot a job, as in Angry Birds.

| Bot \ Material | wood | stone | glass | tnt |
| --- | --- | --- | --- | --- |
| grok | 1.0 | 1.0 | 1.0 | 1.0 |
| dash | **2.0** | 0.7 | 1.0 | 1.0 |
| split (each piece) | 0.8 | 0.5 | **2.5** | 1.0 |
| heavy | 1.2 | **2.0** | 1.0 | 1.0 |
| blast (expansion) | 1.0 | 1.0 | 1.0 | 1.0 |

## Tuning (initial values, calibrated)

These values are in `reference/sim.mjs` and were calibrated against the tests below. Copy them into `src/config/tuning.ts` exactly.

| Material | density | friction | restitution | hp | minImpulse | Destroy points |
| --- | --- | --- | --- | --- | --- | --- |
| wood | 0.6 | 0.6 | 0.10 | 16 | 0.6 | 500 |
| stone | 2.4 | 0.8 | 0.05 | 60 | 1.5 | 800 |
| glass | 0.5 | 0.25 | 0.10 | 6 | 0.3 | 300 |
| tnt | 0.5 | 0.6 | 0.10 | 3 | 0.5 | 500 |

| Pig size | radius | hp | Points |
| --- | --- | --- | --- |
| S | 0.40 | 3 | 5000 |
| M | 0.55 | 6 | 5000 |
| L | 0.75 | 12 | 5000 |

Pig: density 0.8, friction 0.6, restitution 0.15, `minImpulse` 1.0. A helmet multiplies hp by 2.5 (a hat by 1.5; see [11-content.md](11-content.md)).

Other values:

- `minApproachSpeed` 0.8 m/s
- bot: r 0.58, density 1.0, friction 0.5, restitution 0.25
- TNT: radius 3.0, impulse 14, damage 40

## Destruction

`destroy(entity)`:

1. Mark `alive = false` immediately, so no further damage or scoring happens.
2. `queueRemoval(body)`. The body is destroyed in `flushRemovals()` after the step.
3. Emit `block:destroyed` or `pig:destroyed` with position, angle, and points.
4. **Blocks:** call `spawnFragments(entity)` after removal. **TNT:** also call `explode(center)`.
5. **Pigs:** no fragments. The view plays the pop effect.

### Fragments

`src/physics/fragments.ts`:

```ts
export function splitRect(w: number, h: number, pieces: number, rng: Rng): Vec2[][]
```

- Start with the rectangle's 4 corners in local space. Repeatedly take the largest polygon and cut it with a random line through a point near its centroid (offset up to 20% of its size). Keep going until there are `pieces` polygons.
- Keep only convex polygons with area ≥ 0.01 and at most 8 vertices (Planck's limit). If a cut breaks these rules, retry with another random line, up to 10 attempts.
- Pieces per material: glass 7, wood 5 (cuts biased along the long axis to look like splinters: cut angle within ±20° of the long axis), stone 5, tnt 0 (TNT becomes an explosion only).
- Each fragment body inherits the parent's linear and angular velocity, plus an outward impulse of `0.15 × mass` along (fragment centroid − parent center).
- Fragments are removed after a lifetime of 3.5 s ± 0.5 s (the view fades them over the last 0.5 s), or immediately when more than 120 are alive (oldest first).
- Circles and triangles use the same routine on their bounding polygon (circle: an 8-gon).

### Explosions

`src/physics/explosions.ts`:

```ts
export function explode(center: Vec2, radius: number, impulse: number, damage: number, source: string): void
```

1. `world.queryAABB` over the square around `center` with half-size `radius`.
2. For each dynamic body of kind block, pig, or bot whose **center** is within `radius`:
   - `f = 1 − dist / radius`
   - direction = normalize(center of body − center), or (0, 1) if the distance is under 1e−4
   - `applyLinearImpulse(direction × impulse × f, bodyCenter, true)`
   - queue `damage × f` for blocks and pigs; apply it after all impulses are applied
3. TNT hit by another explosion destroys **next step**, so chains ripple visibly (one step apart, not all in one frame).
4. Emit `explosion`.

## Out of bounds

After every step, any block, pig, or bot outside `level.camera` bounds expanded by 4 units, or below y = −3, is destroyed:

- pigs: count as killed, with points
- blocks: destroyed silently (no destroy points, no fragments)
- bots: removed

## Quiet detection

`src/physics/quiet.ts`:

```ts
export function isQuiet(world): boolean
// true when every awake dynamic body of kind block, pig, or bot has |v| < 0.12 and |ω| < 0.2.
// Fragments are ignored.
```

The game treats the world as settled once it has been quiet for 0.5 s continuously (see [06-game-flow-ui.md](06-game-flow-ui.md)).

## Forbidden in physics code

The CI grep fails if any of these appear outside the files listed:

| Pattern | Allowed only in |
| --- | --- |
| `setLinearVelocity(` | `bots/abilities.ts`, `sling/launch.ts` (bot bodies only) |
| `setAngularVelocity(` | `bots/abilities.ts` |
| `setPosition(`, `setTransform(` | `entities/*` constructors, `bots/abilities.ts` (split spawn) |
| `setAwake(false)`, `.sleep(` | nowhere |
| `setType(` / `type = 'static'` on blocks or pigs | nowhere |
| `applyLinearImpulse(` | `physics/explosions.ts`, `physics/fragments.ts`, `bots/abilities.ts` |

## Tasks

### PHY-01 — Planck world and categories (S)

- **Depends on:** APP-01
- **Do:**
  - `npm i planck@1.5.0` and `npm rm cannon-es`
  - create `PhysicsWorld.ts` and `categories.ts`
  - delete `src/physics/planar.ts` and `src/physics/materials.ts`
- **Tests:** `tests/physics/world.test.ts`
  - a circle dropped from y = 5 lands on the ground: after 2 s, |y − r| < 0.01
  - `step()` advances time by exactly 1/60
  - removal queued during a callback happens after the step without throwing

### PHY-02 — Entities and bodies (M)

- **Depends on:** PHY-01, LVL-01
- **Do:** implement `Block`, `Pig`, `Bot`, `Terrain`, `EntityRegistry` (headless) per the table above; `Level.load(def)` builds bodies from level v2 and runs settle.
- **Tests:** `tests/physics/entities.test.ts`
  - every slice level loads
  - after settle, every block and pig has moved ≤ 0.08 and every block has rotated ≤ 1°
  - body count equals blocks + pigs + terrain + 1 (ground)

### PHY-03 — Contact pipeline and damage (M)

- **Depends on:** PHY-02
- **Do:** implement `damage.ts` exactly as specified: pre-solve approach speed, post-solve impulse, per-step max aggregation, affinity.
- **Tests:** `tests/physics/calibration.test.ts` — port **every row** of the calibration table below. Tolerance: ±0.12 on hpRatio.

| # | Scenario (setup as in `reference/calib.mjs`) | Expected |
| --- | --- | --- |
| C1 | Grok at 8 m/s horizontally into an M pig on the ground | pig survives, hpRatio 0.45 |
| C2 | Grok at 16 m/s into an M pig | pig destroyed |
| C3 | Grok at 20 m/s into an L pig | pig destroyed |
| C4 | Heavy (r 0.72, density 1.1) at 23 m/s into an L helmet pig | survives, hpRatio 0.29 |
| C5 | Grok at 8 m/s into a glass cube | survives, hpRatio 0.54 |
| C6 | Grok at 14 m/s into a glass cube | destroyed |
| C7 | Grok at 16 m/s into a wood cube | survives, hpRatio 0.36 |
| C8 | Grok at 23 m/s into a wood cube | destroyed |
| C9 | Grok at 23 m/s into a stone cube | survives, hpRatio 0.37 |
| C10 | M pig dropped from 0.6 above rest | survives, hpRatio 0.47 |
| C11 | M pig dropped from 3.0 above rest | destroyed |
| C12 | Heavy stack (wood posts, stone plank, 4 stone cubes, M pig) idle 10 s | **every entity hpRatio exactly 1.00** |
| C13 | Grok at 16 m/s into TNT; M pig 2.0 away | TNT and pig destroyed |
| C14 | Dash (r 0.5) at 20 m/s into a wood cube; without affinity it survives (takes ≈10.3 of 16) | destroyed |
| C15 | Heavy (r 0.72, density 1.1) at 23 m/s into a stone cube; without affinity it survives (hpRatio ≈ 0.03) | destroyed |
| C16 | Split child (r 0.38) at 14 m/s into a glass `postL`; without affinity it survives (takes ≈5.2 of 6) | destroyed |

If a row fails by more than the tolerance, **do not tune**. Compare against `reference/sim.mjs` line by line; the reference (`calib.mjs`, output in `calib-output.txt`) passes C1–C13 using the bot profiles from [04-slingshot-and-bots.md](04-slingshot-and-bots.md#bot-profiles). The reference has no affinity; its output shows C14–C16 **surviving** without it, and the affinity multipliers (×2, ×2, ×2.5) push each past its block's hp.

### PHY-04 — Remove anchoring and scripted collisions (S)

- **Depends on:** PHY-03, APP-03
- **Do:** delete `lockPhysics`, `pinIfAnchored`, `forceWake`, `wakeFromBotHit`, `structureWarmup`, `transferBotStrike`, `PIG_FATAL_FALL_DELTA`, chain-wake logic, and `botStrikeImpulse`. Add the forbidden-pattern CI check (QA-01).
- **Tests:** the CI grep finds none of the forbidden patterns; C12 still passes.

### PHY-05 — Support collapse (S)

- **Depends on:** PHY-03
- **Tests:** `tests/physics/collapse.test.ts`
  - Load First Flight. Destroy `postL` directly (call `destroy()`; test-only). Within 1.5 s, `deck` has fallen at least 0.5 or rotated more than 20°.
  - Load Glass House and destroy `winL` and `winR`. Within 1.5 s the `roof` has fallen below y = 3.0.
  - No manual wake-up calls are allowed. Planck wakes touching bodies when a body is destroyed. If a body doesn't wake, call `body.setAwake(true)` on bodies whose AABB touches the removed body's AABB (this is the one allowed wake, in `flushRemovals`).

### PHY-06 — Fragments (M)

- **Depends on:** PHY-03
- **Do:** implement `fragments.ts` per the Fragments section.
- **Tests:**
  - `splitRect` returns the requested count; every polygon is convex, area ≥ 0.01, ≤ 8 vertices; the total area is within 1% of w × h
  - a destroyed glass cube produces 7 fragments that are all removed by 4.5 s
  - more than 120 fragments trims the oldest first
  - fragments never generate `contact:impact` with blocks or pigs

### PHY-07 — Explosions and TNT chains (S)

- **Depends on:** PHY-03
- **Tests:**
  - C13 above
  - two TNT cubes 2.0 apart: hitting one destroys both on consecutive steps (step index differs by ≥ 1)
  - an explosion applies no impulse to bodies outside the radius
  - Powder Row reference solution (Dash, 43°, 20 m/s, no ability) clears all 4 pigs

### PHY-08 — Out of bounds and quiet detection (S)

- **Depends on:** PHY-02
- **Tests:**
  - a pig pushed off a terrain edge and falling below y = −3 counts as killed, with points
  - `isQuiet` is false during a collapse and true within 3 s after it
  - fragments moving do not block quiet

### PHY-09 — Determinism (S)

- **Depends on:** PHY-07
- **Tests:** replay the Hilltop reference solution (grok 31°/23, then split 67°/20, no abilities) twice in one process; the entity logs (destroy order), final positions (to 1e−9), and score are identical. Run in CI.

## Update docs

After PHY-09, update `docs/ANGRY_BIRDS_TARGET.md` physics pillars and remove the anchoring references in `docs/ART_SPEC.md` and `docs/ASSET_MANIFEST.md`.
