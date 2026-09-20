# 03 — Levels

Goal: levels that are physically valid by construction, proven winnable, and have a measured difficulty curve.

## Format v2

One JSON file per level in `src/levels/data/NN-<id>.json`. **All y values are bottom edges**, so stacking is simple addition: a block on a plank at y = 2 with plank height 0.4 has y = 2.4.

```ts
// src/levels/schema.ts
export type KitId = 'plankL' | 'plankM' | 'plankS' | 'postL' | 'postM' | 'postS' | 'cube' | 'cubeS' | 'slab'
  | 'wheel' | 'wheelS' | 'triR' | 'triL';              // wheel/tri: see Kit
export type LevelV2 = {
  version: 2;
  id: string;                       // kebab-case, unique
  name: string;                     // shown in UI, ≤ 18 chars
  chapter: string;                  // chapter id, see 11-content.md
  order: number;                    // 1-based position in chapter
  bots: BotKind[];                  // shot queue, 1..6
  stars: [number, number, number];  // score thresholds, ascending
  camera: { minX: number; maxX: number; minY: number; maxY: number }; // playable bounds
  sling: { x: number };             // sling base x; y is always ground (0) or terrain top below it
  terrain: TerrainV2[];
  blocks: BlockV2[];
  pigs: PigV2[];
  hint?: string;                    // optional one-line tip on the level card
};
export type TerrainV2 =
  | { kind: 'plateau'; x0: number; x1: number; top: number }               // flat-top box from ground
  | { kind: 'ramp'; x0: number; x1: number; y0: number; y1: number }        // straight slope from ground
  | { kind: 'ledge'; x0: number; x1: number; top: number; thickness: number }; // floating static platform
export type BlockV2 = {
  id: string;                       // unique within level
  material: 'wood' | 'stone' | 'glass' | 'tnt';
  kit: KitId;
  x: number;                        // center x
  y: number;                        // BOTTOM y
  rot?: 0 | 90;                     // 90 = rotated a quarter turn (plank stood up); only for box kits
};
export type PigV2 = { id: string; size: 'S' | 'M' | 'L'; helmet?: 'hat' | 'helmet'; king?: boolean; x: number; y: number /* bottom */ };
```

Rules:

- Blocks must use a kit piece. No free sizes. This keeps art, fragments, and balance consistent.
- `tnt` may only use `cube` or `cubeS`.
- `rot` is 0 or 90 only. Angled pieces come from triangles and ramps, not rotated boxes.
- `king` pigs belong to chapter finales only (see [11-content.md](11-content.md)).

## Kit

Sizes are in world units (the Grok bot's diameter is 1.16). The depth is for rendering only.

| Kit | w × h | Depth | Notes |
| --- | --- | --- | --- |
| `plankL` | 4.0 × 0.4 | 0.9 | |
| `plankM` | 2.0 × 0.4 | 0.9 | |
| `plankS` | 1.0 × 0.4 | 0.9 | |
| `postL` | 0.4 × 2.0 | 0.9 | |
| `postM` | 0.4 × 1.2 | 0.9 | |
| `postS` | 0.4 × 0.8 | 0.9 | |
| `cube` | 0.8 × 0.8 | 0.9 | |
| `cubeS` | 0.4 × 0.4 | 0.9 | |
| `slab` | 2.0 × 0.8 | 0.9 | |
| `wheel` | circle r 0.4 | 0.9 | y is the bottom; center = y + 0.4 |
| `wheelS` | circle r 0.2 | 0.9 | |
| `triR` | right triangle 0.8 × 0.8, right angle bottom-left | 0.9 | apex above the left edge |
| `triL` | mirror of `triR` | 0.9 | |

## Validation

`src/levels/validate.ts` exports `validateStatic(level): string[]` (pure geometry) and `validatePhysics(level): string[]` (runs Planck headless). A level is valid only if both return `[]`.

### Static rules

Port from `reference/sim.mjs` `validateStatic`, extended for the new kit shapes:

| # | Rule | Tolerance |
| --- | --- | --- |
| S1 | No two blocks overlap (true shape vs true shape; boxes AABB, circles and triangles via SAT) | touching allowed; overlap > 0.002 fails |
| S2 | No pig overlaps a block, terrain, or another pig | same |
| S3 | Every block's bottom rests on ground, terrain, or the top of another block, with ≥ 0.05 horizontal contact | height match within 0.003 |
| S4 | Every pig's bottom point rests on ground, terrain, or a block top | same |
| S5 | Everything lies inside `camera` bounds, and the sling x is at least 12 units left of the nearest block | exact |
| S6 | Ids are unique; `stars` ascending; `bots.length` in 1..6; name ≤ 18 chars | exact |
| S7 | Schema: every field typed per `LevelV2` (validate with a hand-written type guard; no library needed) | exact |

### Physics rules

| # | Rule | Threshold |
| --- | --- | --- |
| P1 | Settle 2 s with damage off: max movement of any block or pig | ≤ 0.08 |
| P2 | Settle: max rotation of any block | ≤ 1° |
| P3 | Idle 3 s with damage **on** after settle: nothing destroyed, no hp lost | exact |
| P4 | The committed reference solution (below) clears all pigs | exact |
| P5 | The reference solution's score ≥ `stars[0]` | exact |

## Tooling

Port the reference scripts to TypeScript under `tools/`, run with `tsx`:

```bash
npm run level:check              # S1–S7, P1–P3 for every level; exit 1 on any error
npm run level:check -- hilltop   # one level
npm run level:solve -- hilltop   # greedy grid search; prints shots + score; writes nothing
npm run level:rate -- hilltop    # difficulty metrics (below)
```

`level:solve` searches angles 4°–70° in 3° steps and speeds 13–23 m/s in 1 m/s steps, using each queued bot's real radius and density, greedily one shot at a time. It launches from the anchor (−7.5, 2.2) with no abilities. **A level that the solver can't clear without abilities is still allowed** if a human-found solution using abilities is committed (see Solutions). The solver just proves the easy case.

### Difficulty metrics

`level:rate` fires every grid shot as the **first** shot and reports:

- `oneShotClear` — % of grid shots that clear every pig
- `avgKills` — average pigs killed by one grid shot
- `anyKill` — % of grid shots that kill at least one pig

Target bands by position in a chapter (from Angry Birds Classic's early episodes: levels 1–3 teach, then difficulty climbs):

| Level position | `anyKill` | `oneShotClear` |
| --- | --- | --- |
| Tutorial (first of chapter) | ≥ 40% | 3–40% |
| Early (2–4) | ≥ 20% | 0.5–25% |
| Mid (5–10) | ≥ 10% | 0–8% |
| Late / finale | ≥ 5% | 0–3% |

A level outside its band is not rejected automatically. The task that adds it must state the numbers and why it's acceptable.

## Solutions

`src/levels/solutions.json` maps level id → a list of shots that clears the level:

```json
{ "first-flight": { "shots": [{ "angleDeg": 34, "speed": 18 }], "score": 31350, "source": "solver" },
  "hilltop": { "shots": [{ "angleDeg": 31, "speed": 23 }, { "angleDeg": 67, "speed": 20 }], "score": 42900, "source": "solver" } }
```

- `source: "solver"` — found by `level:solve`. Replayed in CI through the physics harness (P4).
- `source: "human"` — found by play, may use abilities: `{ "angleDeg", "speed", "abilityAt"?: seconds after launch }`. Also replayed in CI.
- Scores are informational. CI checks the level clears and score ≥ `stars[0]`, not the exact score (it changes when tuning changes).

## Slice levels (verified)

These 5 levels are in [reference/levels-json/](reference/levels-json/). Copy them to `src/levels/data/` unchanged. Every one was checked with Planck 1.5.0 and the tuning in [02-physics.md](02-physics.md).

| # | Id | Name | Teaches | Bots | Pigs | Blocks | Settle move | `anyKill` | `oneShotClear` | Solver solution | Solver score | Stars (1/2/3) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `first-flight` | First Flight | Aim, power, direct hits | grok ×3 | 2 M | 3 | 0.030 | 62% | 6.3% | 34°, 18 | 31,350 | 12k / 20k / 30k |
| 2 | `powder-row` | Powder Row | TNT chains; Dash tap | dash, grok, split | S, M ×3 | 10 | 0.044 | 31% | 14.6% | 43°, 20 | 46,050 | 22k / 34k / 44k |
| 3 | `glass-house` | Glass House | Glass is weak; Split tap | grok, grok, split | M ×2, S ×2 | 7 | 0.050 | 67% | 0.4% | 40°, 17 | 41,520 | 22k / 31k / 40k |
| 4 | `stone-keep` | Stone Keep | Helmets; Heavy slam vs stone | heavy, grok, heavy | L helmet, S, M | 11 | 0.074 | 20% | 3.6% | 25°, 23 | 39,230 | 17k / 27k / 37k |
| 5 | `hilltop` | Hilltop | Terrain; mixed queue | grok, split, dash, heavy | S ×2, L, M | 9 + plateau | 0.042 | 23% | 0.0% | 31°, 23 (grok) then 67°, 20 (split) | 42,900 | 22k / 32k / 41k |

(Solver scores include 10,000 per unused bot. `anyKill` comes from `reference/dist-output.txt`. Rates fire the level's first bot. Solver solutions use each bot's real radius and density from [04-slingshot-and-bots.md](04-slingshot-and-bots.md#bot-profiles), the anchor launch origin, and no abilities; see `reference/solve-output.txt`.)

**3-star thresholds require clearing with spare bots.** Each unused bot adds 10,000. The 3-star line is about 1,000–3,000 below the best solver score, so 3 stars needs a near-optimal clear with at least one spare bot.

## Authoring rules (for new levels)

1. Build bottom-up: every y is the top of what's below it. Write the arithmetic in a comment when it isn't obvious (`// 2.0 + 0.4 deck`).
2. Pigs must be hittable or reachable by collapse. No pig fully enclosed on all four sides by stone unless the level has a Heavy or Blast bot.
3. Every level has one idea (its "Teaches" line). Two at most for finales.
4. Keep the first structure at least 12 units from the sling (rule S5) so arcs have room.
5. Use at least 3 kit piece types per level from level 4 onward.
6. Run `level:check`, then `level:rate`, then commit a solution. A level without a committed solution can't merge.
7. Don't place TNT touching a pig. Leave ≥ 0.3 gap so the player causes the explosion.

## Tasks

### LVL-01 — Schema, kit, loader (S)

- **Depends on:** APP-01
- **Do:** `schema.ts`, `kit.ts`, `load.ts` (JSON → typed `LevelV2`, with the type guard from S7); copy the 5 JSON files.
- **Tests:** all 5 load; a copy with a misspelled `kit` fails with a message naming the field.

### LVL-02 — Static validator (M)

- **Depends on:** LVL-01
- **Do:** S1–S7, including circle and triangle SAT. Port the box logic from the reference.
- **Tests:**
  - all 5 slice levels pass
  - fixtures in `tests/levels/invalid/` each fail with the expected rule id: overlapping planks (S1), pig in a block (S2), floating cube (S3), floating pig (S4), sling too close (S5), duplicate id (S6), wheel overlapping a post (S1 circle), triangle overlapping a cube (S1 SAT)
  - **all 30 legacy levels from commit `65baa72` fail** (a regression test that the validator catches what the old one missed); keep them as JSON fixtures in `tests/levels/legacy/`

### LVL-03 — Physics validator, tools, solutions (M)

- **Depends on:** LVL-02, PHY-07
- **Do:**
  - `validatePhysics` (P1–P5), and `tools/level-check.ts`, `level-solve.ts`, `level-rate.ts`
  - `solutions.json` with the 5 solver solutions above
  - delete the old `src/levels/*.ts`, `validateLayout.ts`, `authoring/fortDeck.ts`, and old tests `level-layout`, `level-catalog`, `levels-registry`
- **Tests:** `npm run level:check` exits 0; `tests/physics/levels.test.ts` runs P1–P5 for every level in CI; `level:rate` for each slice level matches the table within ±3 percentage points.

### LVL-04 — Level registry and chapters (S)

- **Depends on:** LVL-03
- **Do:** `src/levels/registry.ts` loads every JSON under `data/` with `import.meta.glob`, sorted by (chapter order, `order`). `chapters.ts` defines chapter metadata (id, name, color, levels).
- **Tests:** ids are unique; `order` values are contiguous within a chapter; `nextLevel(id)` works across chapter boundaries.
