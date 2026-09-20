# 11 — Content Expansion

Goal: grow from the 5-level slice to 30 levels in 3 chapters, with new pieces, pig types, and the Blast bot. **Don't start this phase until Gate G4 passes** ([10-qa.md](10-qa.md#human-gates)).

## New mechanics

| Mechanic | Physics | Art | First appears |
| --- | --- | --- | --- |
| `wheel` / `wheelS` kit (round blocks that roll) | Circle fixtures, `angularDamping` 0.6 | Cylinder with a spoke texture (wood) or a disc with a mortar ring (stone) | Ch1 L7 |
| `triR` / `triL` kit | Convex polygon, centroid-shifted ([02-physics.md](02-physics.md#bodies)) | Extruded triangle | Ch1 L8 |
| `ramp` / `ledge` terrain | Static polygons | Grass and dirt style | Ch2 L1 |
| Hat pig | hp × 1.5 | Brown hat | Ch1 L9 |
| Helmet pig | hp × 2.5 (already in the slice) | Gray helmet; dented at ≤ 50% | Slice |
| King pig | Size L, hp × 3, **10,000 points** | Crown; cape (a flat extruded shape behind) | Finales |
| Blast bot | [04-slingshot-and-bots.md](04-slingshot-and-bots.md#abilities) | Black round bot with a fuse | Ch3 L1 |

## Chapters

| # | Id | Name | Theme | Palette tweak (sky top / hills mid) | Focus | Bots available |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `training` | Bot Yard | Sunny meadow | defaults | Basics, then wheels, triangles, hats | grok, dash, split, heavy |
| 2 | `glassworks` | Glassworks | Crystal valley at dusk | `#6a8fe0` / `#7aa38a` | Glass towers, ramps, ledges, precision | + all |
| 3 | `quarry` | Stone Quarry | Canyon, warm light | `#e9a760` / `#c9975a` | Stone forts, TNT depots, Blast bot, king | + blast |

Each chapter has 10 levels. The level after chapter N's 10th is chapter N+1's 1st.

## Level briefs

The implementing model authors each level from its brief, following the authoring rules in [03-levels.md](03-levels.md#authoring-rules-for-new-levels) and the loop below. **Slice levels 1–5 are chapter 1 levels 1–5** and don't change.

| Ch-L | Id | Name | Teaches / idea | Bots | Pigs | Key pieces | Band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1-6 | `lean-to` | Lean-To | Knock a leaning wall onto pigs | grok, dash, grok | M ×2 | postL, plankL, cube | Mid |
| 1-7 | `rolling-stones` | Rolling Stones | Wheels roll into pigs when freed | grok, heavy, grok | S ×2, M | wheel ×3 on a plank shelf, posts | Mid |
| 1-8 | `a-frame` | A-Frame | Triangles as roof braces | split, grok, dash | M ×3 | triR, triL, plankM, postM | Mid |
| 1-9 | `hat-trick` | Hat Trick | Hat pigs need a stronger hit | heavy, dash, grok, grok | hat M ×2, S | slab, cube, postL | Mid |
| 1-10 | `yard-boss` | Yard Boss | **Finale:** king pig in a two-tower fort | grok, dash, split, heavy, grok | king, M ×2, hat M | Every chapter-1 piece + TNT ×2 | Late |
| 2-1 | `glass-ramp` | Glass Ramp | Ramp terrain: shots skip up | split, split, grok | M ×2 | ramp, glass posts and planks | Tutorial |
| 2-2 | `pane-stack` | Pane Stack | Tall glass stack; Split tears it | split, grok, split | S ×3 | glass cube/postM columns | Early |
| 2-3 | `ledge-lookout` | Ledge Lookout | Pigs on floating ledges | grok, dash, split | M ×2 | ledge ×2, wood caps | Early |
| 2-4 | `prism` | Prism | Glass shell around stone core | heavy, split, grok | helmet M, S ×2 | stone cubes inside glass walls | Early |
| 2-5 | `skylight` | Skylight | Drop a stone roof through glass | grok, heavy, split | M ×3 | stone slab over a glass ceiling | Mid |
| 2-6 | `wind-chimes` | Wind Chimes | Wheels on glass shelves | split, grok, dash | S ×2, M ×2 | wheelS ×4, glass planks | Mid |
| 2-7 | `twin-spires` | Twin Spires | Two tall towers, topple one into the other | dash, grok, split | M ×2, hat M | postL stacks, triangles on top | Mid |
| 2-8 | `crystal-canyon` | Crystal Canyon | Structure in a terrain dip | split, heavy, grok | M ×3 | plateau + ramp, glass | Mid |
| 2-9 | `greenhouse` | Greenhouse | A wide, low glass building | split, split, dash, grok | S ×4, M | glass everywhere, wood frame | Late |
| 2-10 | `glass-throne` | Glass Throne | **Finale:** king in a glass palace on a ledge | split, dash, heavy, split, grok | king, helmet M, M ×2 | ledge, glass, wheels, triangles | Late |
| 3-1 | `first-blast` | First Blast | Blast bot: detonate on tap | blast, grok, blast | M ×2 | wood hut, stone base | Tutorial |
| 3-2 | `quarry-gate` | Quarry Gate | Stone wall; Heavy or Blast through | heavy, blast, grok | helmet M, M | slab ×3, postL stone | Early |
| 3-3 | `powder-depot` | Powder Depot | TNT chain through a shelf | dash, grok, blast | S ×3, M | tnt ×4, wood shelving | Early |
| 3-4 | `bunker` | Bunker | Pigs under a stone lid | heavy, blast, heavy | helmet M ×2 | slab roof, stone posts | Early |
| 3-5 | `ore-cart` | Ore Cart | Wheels as a cart that rolls when hit | grok, dash, blast | M ×3 | wheel ×2 under a plankM, ramp | Mid |
| 3-6 | `cliffside` | Cliffside | Knock pigs off a plateau edge | dash, heavy, grok | M ×2, hat M | plateau, tall posts at the edge | Mid |
| 3-7 | `stacked-deck` | Stacked Deck | Three floors, each a different material | split, dash, heavy, grok | S ×2, M ×2, helmet M | glass, wood, and stone floors | Mid |
| 3-8 | `fuse-line` | Fuse Line | A long TNT row to set off in order | blast, grok, dash | M ×4 | tnt ×5 spaced 1.6 apart, planks | Mid |
| 3-9 | `fortress` | Fortress | A full stone fort, multiple structures | heavy, blast, split, dash | helmet L, M ×3 | every kit piece | Late |
| 3-10 | `king-of-the-quarry` | King of the Quarry | **Finale:** king on top of the biggest fort | blast, heavy, dash, split, grok, blast | king, helmet L, helmet M ×2, M ×2 | ≥ 30 blocks, ramps, ledge, TNT ×3 | Late |

Band = the target from [03-levels.md](03-levels.md#difficulty-metrics).

## Authoring loop (per level)

1. Write the JSON from the brief. Keep the arithmetic comments in a sibling `NN-id.notes.md` (JSON has no comments).
2. `npm run level:check -- <id>`. Fix every static error. Physics errors (P1–P3) usually mean an unsupported or top-heavy piece: widen its support or lower it.
3. `npm run level:rate -- <id>`. Compare with the band. Too easy: add protection (stone in front, helmets), move pigs deeper, or remove a bot. Too hard: expose a pig, add a TNT near a weak point, or add a bot.
4. `npm run level:solve -- <id>`. If there's no solver solution, find one by playing with abilities (use `?debug=1` and record angle/speed/ability time from the debug overlay's last-shot readout), then add it as `source: "human"`.
5. Set `stars` from the best known score: 3★ = best − 2,000 (rounded to 1,000); 2★ = the clear score with 1 bot spare, minus 3,000; 1★ = the pig total (5,000 × pigs).
6. **Iteration cap:** 6 rounds of steps 2–4. If the level still misses its band, commit it with the numbers in the PR description and flag it for G5 review. Don't reshape the brief.

## Tasks

### CNT-01 — Wheel and triangle kit (M)

- **Depends on:** CNT-04
- **Do:** physics shapes, SAT in the validator, render views, fragments (wheel → 8-gon split), textures.
- **Tests:** validator fixtures for circle and triangle overlaps; a wheel on a flat plank stays put through settle; a wheel on a 10° ramp rolls; visual snapshots.

### CNT-02 — Hat and king pigs (S)

- **Depends on:** Gate G4
- **Tests:** hp multipliers; king points 10,000; visual lineup updated.

### CNT-03 — Blast bot (S)

- **Depends on:** Gate G4
- **Tests:** a tap detonates; auto-detonation 1.5 s after impact; explosion radius and damage per spec; audio and effects hooked up.

### CNT-04 — Ramp and ledge terrain (S)

- **Depends on:** Gate G4 (do this first in Phase 7)
- **Tests:** a static polygon for each kind. Blocks and pigs may rest only on flat tops (ground, plateau, ledge, blocks): extend S3/S4 so anything resting on a ramp fails, with a fixture. Visual.

### CNT-05 — Chapter theming (S)

- **Depends on:** CNT-04
- **Do:** per-chapter palette overrides for sky and hills, a chapter card in level select, and a chapter-intro splash (1.5 s) before its first level.

### CNT-06 — Chapter 1 levels 6–10 (L)

- **Depends on:** CNT-01, CNT-02
- **Do:** author 5 levels per the briefs and the loop.
- **Tests:** `level:check` passes; solutions are committed; the rate numbers are in the PR.

### CNT-07 — Chapter 2 (L)

- **Depends on:** CNT-06, CNT-04, CNT-05
- **Do:** 10 levels.

### CNT-08 — Chapter 3 (L)

- **Depends on:** CNT-07, CNT-03
- **Do:** 10 levels.

### CNT-09 — Balance pass (M)

- **Depends on:** CNT-08
- **Do:** run `level:rate` on all 30 and produce a difficulty chart (`docs/LEVEL_CATALOG.md`, regenerated by `tools/level-catalog.ts`). Fix outliers that break the curve by more than one band.
- **Human:** G5 playtest.
