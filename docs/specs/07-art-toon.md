# 07 — Art: Toon-Shaded 3D

Goal: a bold cartoon look that reads clearly at phone size, and holds its own in a screenshot next to Angry Birds.

**Everything in this spec is generated in code** (geometry, canvas textures, particles). The only external asset is the UI font. That lets an implementing model build all of it without an artist. A human art-direction review happens at Gate 3 ([PLAN.md](PLAN.md)).

## Renderer

```ts
// src/render/Renderer.ts
renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;   // toon wants flat, predictable colors
renderer.shadowMap.enabled = false;           // blob shadows instead (below)
camera = new THREE.OrthographicCamera(...);   // set from CameraDirector view each frame; near 0.1, far 200, z = 50
```

### Lighting

| Light | Settings |
| --- | --- |
| `HemisphereLight` | sky `#dff1ff`, ground `#8fb46a`, intensity 1.1 |
| `DirectionalLight` (key) | `#fff4e0`, intensity 2.0, position (−4, 8, 10), target at the origin |

No other lights. The toon gradient does the shading.

### Toon material

```ts
// src/render/toon.ts
const GRADIENT = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
GRADIENT.minFilter = GRADIENT.magFilter = THREE.NearestFilter; GRADIENT.needsUpdate = true;
export function toon(color: string, opts?: { map?: THREE.Texture; transparent?: boolean; opacity?: number; emissive?: string }) {
  return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...opts });
}
```

Three bands (shadow, mid, lit). Cache materials by key (`color|mapId|opacity`) and never create one per frame.

### Outlines (inverted hull)

`src/render/outline.ts`:

```ts
export function addOutline(mesh: THREE.Mesh, kind: 'box' | 'sphere' | 'capsule' | 'extrude', width = OUTLINE.width): THREE.Mesh
```

- Creates a sibling mesh behind the original: same shape grown by `width` on every side, a `MeshBasicMaterial({ color: PALETTE.outline, side: THREE.BackSide })`, and `renderOrder` one lower than the mesh.
  - **box:** a `BoxGeometry(w + 2·width, h + 2·width, d + 2·width)`
  - **sphere/capsule:** radius + width
  - **extrude** (fragments, terrain, custom shapes): clone the geometry, merge vertices (`BufferGeometryUtils.mergeVertices`), recompute normals, and push each vertex out along its smooth normal by `width` (done once on the CPU at creation, not in a shader)
- `OUTLINE.width` = 0.035 world units for blocks, pigs, and bots; 0.05 for terrain and the sling; 0 (none) for particles and fragments smaller than 0.15.
- The outline follows its parent: add it as a child of the mesh's group.

## Palette

`src/config/render.ts` → `PALETTE`. Use these exact values.

| Key | Hex | Use |
| --- | --- | --- |
| `outline` | `#23180f` | Every outline, UI outlines |
| `sky.top` / `sky.bottom` | `#4fb0ee` / `#cfeeff` | Background gradient |
| `hills.far` / `hills.mid` / `hills.near` | `#9fd07e` / `#7fc05a` / `#5fae3f` | Parallax layers |
| `ground.grass` / `ground.grassLip` / `ground.dirt` / `ground.dirtDark` | `#6cc33c` / `#4f9e2a` / `#9a6436` / `#744824` | Ground |
| `cloud` | `#ffffff` | Clouds |
| `wood.base` / `wood.grain` / `wood.crack` | `#d9974f` / `#b5733a` / `#5e3514` | Wood |
| `stone.base` / `stone.mortar` / `stone.crack` | `#a3a9b1` / `#7c838c` / `#3e434a` | Stone |
| `glass.base` / `glass.edge` / `glass.crack` | `#aee9ff` (opacity 0.55) / `#ffffff` / `#ffffff` | Glass |
| `tnt.base` / `tnt.band` / `tnt.text` | `#d8452b` / `#2b1d14` / `#ffd84a` | TNT |
| `pig.skin` / `pig.snout` / `pig.nostril` / `pig.ear` | `#86d94f` / `#6cc23d` / `#2f5d1c` / `#72c840` | Pigs |
| `pig.helmet` / `pig.hat` / `pig.crown` | `#b7bcc4` / `#8b5a2b` / `#ffcc33` | Headgear |
| `bot.grok` / `bot.dash` / `bot.split` / `bot.heavy` / `bot.blast` | `#3a3d4a` / `#f2a51f` / `#37b6ff` / `#6b5b95` / `#2b2b2b` | Bot shells |
| `bot.accent` / `bot.eye` / `bot.visor` | `#ff6a1a` / `#f5f7ff` / `#11131a` | Bot details |
| `sling.wood` / `sling.band` / `sling.pouch` | `#8a5a2b` / `#4a2a14` / `#6b3f1f` | Slingshot |
| `trail` | `#ffffff` | Shot trail |
| `ui.button` / `ui.buttonEdge` / `ui.primary` / `ui.primaryEdge` / `ui.panel` / `ui.focus` | `#ffb938` / `#c77d0a` / `#63c132` / `#3d8a17` / `#2b3a55` / `#ffffff` | UI |
| `score.pig` / `score.wood` / `score.stone` / `score.glass` / `score.bonus` | `#8cf25a` / `#ffc16b` / `#e2e6ea` / `#b8f0ff` / `#ffe066` | Score popups |

## Depth layout

The camera is at z = 50 looking down −z. Everything is rendered orthographically.

| Layer | z | renderOrder |
| --- | --- | --- |
| Sky gradient (a full-screen quad attached to the camera) | −100 | −100 |
| Far hills (parallax 0.1) | −30 | −90 |
| Mid hills (parallax 0.25) | −20 | −80 |
| Near bushes and fence (parallax 0.5) | −10 | −70 |
| Clouds (parallax 0.15, drift +0.2 u/s) | −25 | −85 |
| Ground and terrain (depth 3, front face at z = +1.5) | 0 | 0 |
| Back sling band | −0.6 | 5 |
| Blocks, pigs, bots, fragments | 0 | 10 |
| Front sling band, pouch | +0.7 | 15 |
| Particles | +1 | 20 |
| Trail dots | +2 | 25 |
| Score popups | +3 | 30 |

Parallax: each layer's x = `camera.x × (1 − factor)`. Layers repeat by tiling 3 copies side by side, wrapping when the camera moves past a copy.

## Blocks

`src/render/views/BlockView.ts`. One view per block. Build: `Box` or `Cylinder` (wheel) or `Extrude` (triangle) with depth 0.9, a toon material with a material texture, and an outline.

**Material textures** are canvas-generated once per (material, kit) at 128 px per world unit (capped at 512 px), and cached:

| Material | Texture recipe |
| --- | --- |
| wood | Fill `wood.base`. 3–5 horizontal grain lines (`wood.grain`, 2 px, gently wavy: sine amplitude 1.5 px, period 40 px, random phase). One knot ellipse per 1.5 units of length. Plank end-lines at both short edges (a 3 px darker border). For vertical kits (posts), rotate the grain 90°. |
| stone | Fill `stone.base`. A running-bond brick grid: bricks 0.4 × 0.2 units, 3 px `stone.mortar` lines, each brick lightened or darkened by ±6% at random (seeded). |
| glass | Fill `glass.base` at alpha 1 (the material opacity does the transparency). A 4 px `glass.edge` border. Two diagonal highlight streaks (white, 30% alpha, 6 px and 3 px wide) from the top-left. |
| tnt | Fill `tnt.base`. 2 horizontal `tnt.band` stripes at 20% and 80% height (12% tall). "TNT" in the center in Baloo 2 800, `tnt.text`, outlined 3 px `tnt.band`. |

Use `THREE.CanvasTexture`, `colorSpace = SRGBColorSpace`, `anisotropy = 4`. Generate **3 seeded variants** per (material, kit); each block uses variant `hash(levelId + blockId) % 3`, so the look is varied but stable across reloads, and materials stay shared.

### Damage stages

| hpRatio | Stage | Look |
| --- | --- | --- |
| > 0.66 | 0 | Clean |
| 0.33–0.66 | 1 | Light cracks: 2–3 crack polylines from one edge, 2 px, `*.crack` color |
| ≤ 0.33 | 2 | Heavy cracks: 5–7 polylines branching, 3 px; wood also gets 2 splinter notches cut into the silhouette texture edge (drawn as dark triangles) |

- Implementation: the crack overlay is a second canvas texture on a plane placed 0.001 in front of the block's front face, same size, `transparent: true`, `depthWrite: false`. Generate stage 1 and 2 overlays per (material, kit, seed) lazily and cache them.
- On a stage change: swap the overlay texture, and play a 0.12 s "hit flash" plus a 0.1 s scale punch (1.0 → 1.04 → 1.0). The flash is a per-block white plane (the same size as the overlay, just in front of it) whose opacity goes 0 → 0.6 → 0. **Never change a shared material's color or emissive for one block.**
- Glass: stage 2 also drops opacity to 0.4.

## Fragments

`render/views/FragmentView.ts`: each physics fragment polygon becomes an `ExtrudeGeometry` (depth 0.9, no bevel) with the parent's toon material. Map its UVs by projecting the parent's texture onto the fragment's position in the parent (so splinters keep their grain). Add outlines only for fragments with area ≥ 0.05. Fade out over the last 0.5 s of life (opacity with `transparent: true` switched on only when fading starts).

## Characters

Characters are built from primitives with toon materials and outlines. Faces are on the +z side. Bodies rotate with physics (around z), so faces stay visible.

### Grok bot (and variants)

Base (radius r from the profile):

- **shell:** sphere (r), color `bot.<kind>`
- **visor band:** a torus around the shell's equator (tube 0.06·r/0.58), `bot.accent`, rotated so it reads as a band across the front
- **visor plate:** a flattened capsule on the front (width 0.62·r, height 0.36·r), `bot.visor`
- **eyes:** two pill capsules on the visor, `bot.eye`, at x = ±0.17·r/0.58
- **antenna:** a thin cylinder plus a sphere tip `bot.accent` on top, with a spring wobble

| Kind | Extra shape language |
| --- | --- |
| dash | Two swept-back fins (flattened cones) on the rear; a sharper, angry brow bar |
| split | 3 small dome "segments" on top, hinting that it splits; round, surprised eyes |
| heavy | Bigger, with 4 rivets (small spheres) around the visor; a heavy brow; a slight squash (scale y 0.92) |
| blast | A fuse on top instead of the antenna (a curved tube + an emissive spark that flickers) |

**Expressions** (eye scale x/y, eye rotation, brow):

| Mood | When | Eyes |
| --- | --- | --- |
| idle | Waiting | 0.92/1.08; blink every 1.8–4.6 s (0.1 s close) |
| aim | Dragging | Narrowed 0.68/1.2, looking toward the launch direction |
| fly | In flight | Speed > 11: squint 1.45/0.38; otherwise wide 1.08/1.22 |
| ability | 0.3 s after tap | Wide 1.3/1.3 + an emissive flash on the accent |
| hit | 0.28 s after impact | X-shaped: 1.55/0.26, rotated ±0.42 |
| celebrate | Win (queue bots) | Happy arcs 0.75/1.35 + hop |
| sad | Loss | 1.2/0.35 rotated ∓0.25, drooping antenna |

**Motion:** squash and stretch along velocity in flight (up to 1.3 stretch at 20 m/s), and a squash on landing. Keep the existing `GrokBot.ts` expression code; move it into `BotView.ts`.

### Pigs

- **body:** sphere r (size), `pig.skin`, scale y 0.94
- **snout:** a flattened cylinder on the front (0.36·r wide), `pig.snout`, with 2 nostrils (`pig.nostril` spheres)
- **ears:** 2 small cones on top, `pig.ear`
- **eyes:** white spheres, dark pupils that track the loaded bot during aim and the flying bot during flight (clamped to 0.03·r offset)
- **brows:** 2 thin boxes that angle down when worried

| Headgear | Build |
| --- | --- |
| hat | A brown cylinder brim + a short cylinder crown, `pig.hat` |
| helmet | A half-sphere, `pig.helmet`, with a darker rim torus. At hpRatio ≤ 0.5 swap to a dented variant (the top half-sphere scaled 0.9 in y and tilted 12°). |
| crown (king) | A gold ring + 5 small cones + gem spheres, `pig.crown` |

**Pig states:**

| State | Trigger | Look |
| --- | --- | --- |
| idle | Default | Breathing scale ±2% at 0.5 Hz; blink every 2–5 s |
| smug | During `aim` and `nextBot`, 20% chance per second per pig | Brows up, a 0.4 s "snicker" bounce |
| worried | The bot is flying toward the pig (reuse `computePigThreat`) | Brows angled, eyes wide, trembling ±0.01 |
| hurt | hpRatio ≤ 0.5 | A bruise decal (a dark green circle) on one cheek; one eye half closed |
| pop | Destroyed | See effects: puff + stars; the mesh scales up 1.15 over 0.08 s, then is hidden |
| laugh | `lost` | The surviving pigs bounce and squint for 1.5 s |

## Slingshot

- **Frame:** a Y shape. Base post: tapered cylinder r 0.18 → 0.14, height 1.4. Two fork arms: tapered cylinders r 0.14 → 0.10, length 1.0, angled ±22°. Color `sling.wood`, outlined. Tips at the fork: (−7.85, 2.55) and (−7.15, 2.55).
- **Bands:** each band is a box stretched between a fork tip and the pouch position, thickness `0.14 × (1 − 0.5 × tension)` (thinner when stretched), color `sling.band`, outlined. The back band is drawn behind the bot, the front band in front.
- **Pouch:** a curved box (4 segments) that wraps the bot's back, `sling.pouch`.
- **After release:** bands snap back past the rest position with a damped spring (ω 30, ζ 0.25) and settle within 0.4 s.

## Environment

`src/render/Environment.ts`:

- **Sky:** a vertical gradient on a camera-attached quad.
- **Hills:** each layer is an `ExtrudeGeometry` from a `Shape` of a wavy top edge (sum of 3 sines, seeded), depth 1, toon material, outlined 0.05. Far layer height 6, mid 4, near 2.5 (bushes: clusters of 3–5 spheres, outlined).
- **Clouds:** 3–5 per screen width. Each cloud is 4–6 overlapping flattened spheres (white, no outline, 90% opacity), drifting.
- **Ground:** from x = −40 to 70, top at y = 0, front face down to y = −6.
  - grass top strip: 0.35 thick, `ground.grass`, with a scalloped lip of 24 half-discs per 10 units along the front edge (`ground.grassLip`)
  - dirt front face: `ground.dirt`, plus a canvas texture of pebbles (`ground.dirtDark` ellipses, seeded)
- **Terrain:** plateaus, ramps, and ledges use the same grass and dirt treatment as the ground, outlined 0.05.
- **Props (decoration only, no physics):** 2 fence segments and a sign near the sling ("Bot Yard") per level, placed where they don't overlap the camera path of the bot.

## Blob shadows

`render/fx/BlobShadows.ts`: for each pig, bot, and block, a dark ellipse (`#000`, opacity 0.25 → 0 as the object rises from 0 to 3 units above the surface below it) on the ground or terrain top directly underneath. Ellipse width = object width × 1.1. Use one `InstancedMesh` for all shadows. Find the surface with a downward Planck raycast every 0.1 s per object (not every frame).

## Effects

`render/fx/ParticlePool.ts`: one `InstancedMesh` of quads (billboards, since the camera is fixed and orthographic) with a small palette texture atlas generated on a canvas (circle, star, splinter, shard, puff, spark: 6 cells, 64 px each). Pool size: 600. Per-particle data in typed arrays: position, velocity, life, size, rotation, color, cell. Update on the CPU and write the instance matrices and colors.

| Effect | Trigger | Particles |
| --- | --- | --- |
| Wood hit | `contact:impact` on wood, impulse ≥ 3 | 4–8 splinters, color `wood.grain`, speed 3–6, gravity, life 0.5–0.8 s |
| Wood break | `block:destroyed` wood | 14 splinters + 4 puffs `#e8d2b0` |
| Glass hit | impulse ≥ 2 | 6 shards `glass.base` + 3 sparkles (star cell, white) |
| Glass break | destroyed | 20 shards + 8 sparkles |
| Stone hit | impulse ≥ 5 | 4 chips `stone.mortar` + 2 dust puffs `#d8d8d8` |
| Stone break | destroyed | 10 chips + 8 dust puffs |
| TNT explosion | `explosion` | a flash sprite (white circle, scale 0 → radius over 0.08 s, fade 0.15 s) + a shockwave ring (radius 0 → blast radius over 0.25 s) + 12 smoke puffs `#5a5a5a` → `#9a9a9a` rising + 16 sparks `#ffcc33` |
| Pig pop | `pig:destroyed` | 1 big puff `#b8f28c` (scale 1.8·r, 0.35 s) + 6 small green puffs + 5 stars `#ffe066` flying out |
| Bot impact | `bot:firstImpact` | 6 small bolts (spark cell, `bot.accent`) + 1 dust puff |
| Dash boost | ability | a flame trail: 20 particles/s for 0.6 s, orange → red, behind the bot |
| Heavy slam | ability, and its landing | a downward streak + a ground shockwave ring (width 4) and dust on landing |
| Split | ability | 3 small puffs at the split point |
| Landing dust | a block or pig lands after a fall of > 1 unit | 3 dust puffs at the contact point |

The number of emitted particles per effect is halved when `perfTier === 'low'` ([09-performance.md](09-performance.md)).

## Score popups

`render/fx/ScorePopups.ts`:

- Numbers use a single canvas atlas of glyphs 0–9 and ",", Baloo 2 800, white fill with a 6 px `outline` stroke. Each popup is a group of quads (one per digit), tinted by source color (`score.*`).
- Size: 0.6 units tall for pigs and bonus, 0.4 for blocks.
- Motion: rise 1.2 units over 0.9 s with ease-out; fade over the last 0.3 s; start with a 0.1 s scale punch (0.6 → 1.1 → 1.0).
- Aggregate block damage points per block over 0.3 s windows so numbers don't spam.
- At most 24 popups alive; the oldest is removed first.

## Trail

`render/fx/TrailView.ts` draws `ShotTrail` points ([04-slingshot-and-bots.md](04-slingshot-and-bots.md#shot-trail)) as instanced circles with outlines (2 instanced meshes: outline circles behind, white circles in front).

## Tasks

### REN-01 — Renderer, toon material, outlines (S)

- **Depends on:** APP-02
- **Tests:** unit (with a mocked WebGL-less three): `addOutline` produces a BackSide mesh sized +2·width. Visual: a test scene with one of each primitive in `tests/visual/toon-primitives.spec.ts`.

### REN-02 — Blocks and damage stages (M)

- **Depends on:** REN-01, PHY-03
- **Tests:** visual snapshots of each material × kit at stages 0/1/2 (a grid scene). Unit: the texture cache returns the same texture for the same key; stage thresholds.

### REN-03 — Characters (L)

- **Depends on:** REN-01
- **Do:** `BotView` for all 5 kinds, `PigView` with sizes, headgear, and states; the queue idle.
- **Tests:** a visual lineup: every bot kind × moods, and every pig size × headgear × states.

### REN-04 — Slingshot view (S)

- **Depends on:** REN-01, SLG-02
- **Tests:** visual at tension 0 / 0.5 / 1; the bands never cross through the bot (a check in the test: band endpoints stay behind or in front per layer).

### REN-05 — Environment and blob shadows (M)

- **Depends on:** REN-01
- **Tests:** visual: every slice level at the overview view; parallax offset at camera x = −8 vs x = 12.

### REN-06 — Particles and effects (M)

- **Depends on:** REN-01, PHY-06, PHY-07
- **Tests:** unit: the pool never exceeds 600 and reuses slots; halving at the low tier. Visual: a frame 0.1 s after a TNT explosion (fixture).

### REN-07 — Fragments view (S)

- **Depends on:** REN-02, PHY-06
- **Tests:** visual: wood fragments show grain continuity; fade-out.

### REN-08 — Score popups and trail view (S)

- **Depends on:** REN-06, SLG-03, GAME-03
- **Tests:** visual; unit: aggregation windows.

### REN-09 — Remove old visuals (S)

- **Depends on:** REN-08
- **Do:** delete `visuals/abTextures.ts`, `visuals/groundCrossSection.ts`, `systems/JuiceSystem.ts`, `systems/DebrisSystem.ts` (if still present), `entities/GrokBot.ts` (moved), and `public/assets/grass-tile.png` and `wood-tile.png` unless reused. Update `docs/ART_SPEC.md` and `docs/ASSET_MANIFEST.md` to match this spec.
