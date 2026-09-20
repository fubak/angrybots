# 09 — Performance

Goal: a steady 60 fps on a mid-range phone during the heaviest collapse, fast loading, and no slowdown after many retries.

## Budgets

| Metric | Target | Measured by |
| --- | --- | --- |
| Frame time, normal play (mid-range phone) | p95 ≤ 16.7 ms, p99 ≤ 25 ms | PERF-04 device session |
| Frame time, heaviest slice collapse (Powder Row TNT chain) | p95 ≤ 25 ms | PERF-04 |
| Physics step, 150 dynamic bodies | ≤ 4 ms on desktop Chrome headless, ≤ 8 ms phone | `tests/perf/physics-bench.test.ts` |
| Draw calls, any slice frame | ≤ 250 | `renderer.info.render.calls` in `__debug.snapshot()` |
| Triangles | ≤ 150k | `renderer.info.render.triangles` |
| JS heap after 20 restarts | within +10% of after the 1st | PERF-03 |
| GPU memory: geometries and textures | back to baseline ± 5 after level unload | `renderer.info.memory` |
| JS bundle (gzip) | ≤ 350 kB initial | `npm run size` |
| First playable, cold cache, 10 Mbps | ≤ 5 s | PERF-05 (Lighthouse throttling) |
| Audio loaded before title | ≤ 1.5 MB (music streams) | build report |

**Reference devices** for the human gate: one Android phone at the level of a Pixel 6a / Galaxy A54, and one iPhone 11 or newer, in Chrome and Safari.

## Performance tiers

`src/render/perfTier.ts` picks a tier at boot and can drop it while playing.

| Tier | When | Changes |
| --- | --- | --- |
| `high` | Default on desktop | Everything on, pixel ratio up to 2 |
| `medium` | `(pointer: coarse)` or `deviceMemory ≤ 4` | Pixel ratio up to 1.5; blob shadows every 0.2 s; fragment limit 80 |
| `low` | Automatic drop: frame p95 > 25 ms over a 3 s window, twice | Pixel ratio 1; half the particles; fragment limit 40; no outlines on fragments; clouds static |

Never raise the tier automatically while a level is in progress (it avoids flicker). Show the tier in `__debug.snapshot()`.

## Rules

1. **No allocation in hot loops.** Per-frame and per-step code reuses `Vec2` and `Vector3` scratch objects. No `new` inside `update`, `render`, or contact handlers, except pooled objects. (The current `Game.tick` allocates several `THREE.Vector3` every frame.)
2. **Pool** particles (600), score popups (24), trail dots (120), and blob shadows (one `InstancedMesh`).
3. **Share** geometry and materials across views with the same key (kit × material × damage stage). Only fragments get unique geometry.
4. **Dispose** on level unload: every view removes its meshes; unique geometries (fragments, terrain) are disposed; shared cached ones are kept. `EntityRegistry.clear()` destroys every Planck body.
5. **No per-frame DOM writes** unless a value changed (the HUD score writes at most once per frame, only while counting).
6. **No physics worlds for preview.** The aim guide is analytic (the current code builds a new cannon world every frame).
7. **Lazy textures.** Damage-stage canvases are generated the first time a block reaches that stage, then cached.
8. **Code-split** the title and level select from the game: dynamic `import()` of `app/App.ts` after the title renders.
9. **Three.js imports** are named (`import { Mesh } from 'three'`), so tree-shaking works.

## Tasks

### PERF-01 — Bench and counters (S)

- **Depends on:** PHY-02, REN-01
- **Do:**
  - `tests/perf/physics-bench.test.ts`: build 150 wood cubes in a 15 × 10 grid on the ground, settle, then time 300 steps
  - add `renderer.info` numbers and fps p50/p95 (a 3 s window) to `__debug.snapshot()`
- **Tests:** the bench meets its budget in CI (it runs on the GitHub-hosted runner; the budget there is ×1.5).

### PERF-02 — Pools and allocation audit (M)

- **Depends on:** REN-06, REN-08
- **Do:** pools per the rules; remove allocations from `update`/`render`/handlers.
- **Tests:** `tests/perf/heap.spec.ts`, a Playwright CDP heap sample: during 10 s of the Hilltop fixture replay, `JSHeapUsedSize` grows by less than 3 MB and at most 2 major GCs happen (`Performance.getMetrics`).

### PERF-03 — Disposal and restart soak (S)

- **Depends on:** PERF-02, GAME-01
- **Tests:** `tests/perf/restart-soak.spec.ts` (the perf layer may use fixtures): restart Stone Keep 20 times, running the fixture solution each time. Then:
  - heap within +10% of after run 1
  - `renderer.info.memory.geometries` and `.textures` within ±5 of run 1
  - Planck body count after each load equals blocks + pigs + terrain + 1 (ground)

### PERF-04 — Device session (HUMAN)

Run the slice on both reference devices. Record fps p95 per level (via `?debug=1` overlay) in `docs/PERF_PROFILE.md`, along with the device, OS, browser, and date. The tier logic must keep p95 within budget. If it doesn't, file specific issues (which effect, which level).

### PERF-05 — Load budget (S)

- **Depends on:** AUD-04, UI-04
- **Do:** `npm run size` (with `size-limit` or a small script reading `dist/assets/*.js` gzip sizes) plus a Lighthouse CI run with simulated throttling.
- **Tests:** in CI, the bundle is within budget and Lighthouse "Time to Interactive" ≤ 5 s.
