# Angry Bots — agent memory

**Project:** angrybots
**Last sync:** 2026-09-25
**SSOT:** `tasks/state.md`
**Ledger:** `docs/GAUNTLET_STATUS.md`

## Product fact

Vite + TypeScript slingshot game. Rendering is Three.js ortho. Physics is Planck (`planck`). Identity is Grok. Public site: https://fubak.github.io/angrybots/ (repo `fubak/angrybots` is public). Do not claim Angry Birds parity.

## What the player sees

- Bots are distinct colors: grok black, dash amber, split blue, heavy purple blob, blast red disc with a white "!". Blast still uses a circle collider — a capsule broke last-stand's recorded solution. Queue spacing uses `TUNING.bots[kind].r`.
- The sling is a Y-fork with visible bands (sagging at rest, wobbling on release).
- Targets are still `kind: 'pig'` in the sim. On screen they are a chat bubble (plain), a host with antennae (`hat`), a visor robot (`helmet`), or a flagship with a gold antenna (`king`). Not other companies' logos.
- A target with `airborne` set (center above `r + 0.18`) is destroyed on a grass contact whose approach speed is at least 1.2. A target that starts on the grass is not. Terrain is not that contact.
- Plateaus, ramps, and ledges are drawn by `Renderer.setTerrain`. They exist in Hilltop, Ramp Run, and Ledge Nest. Without that mesh the stacks look like they float.
- The camera stays on the wide sling frame; flight and impact only nudge the center (`nudge` in `CameraDirector`). During `aim`, `CameraGestures` adds pinch/wheel zoom and one-pointer pan (clamped to level bounds + 20%); double-tap resets. Do not bring back the close follow zoom.
- Levels are gated by `src/game/progression.ts`: sequential within a chapter; workshop needs training's L10 cleared plus 15★, citadel needs workshop's L10 plus 35★. After 3 fails a level offers Skip (max 3 active; counts for unlock only). `?unlockAll=1` unlocks everything, DEV only (`import.meta.env.DEV`).

## Architecture

- Session states: `intro → aim → flight → resolve → nextBot | bonus → won | lost`. `GameSession` owns the machine. `resolve → won` is allowed when the last bot clears the level. Leftover bots still go through `bonus`.
- Player launches from the pulled pouch (`GameSession.launchFromPull`). Solver shots in `src/levels/solutions.json` launch from the sling anchor; pouch plans live in `src/levels/pouch-solutions.json`. Overwrite either book only via the solver tools, and only for levels whose layout changed.
- First Flight wins from the pouch at 22° / speed 23. `window.__debug.launch(angleDeg, speed)` is that order, and only exists when `import.meta.env.DEV`.
- `window.__debug.loadLevel` updates the sim only. It does not change `App.levelId`.
- `import.meta.glob` in `src/levels/registry.ts` only works under Vite. Do not pouch-search with `npx tsx` against the registry.
- Save is `angrybots-save-v3`, migrating from v2/v1; adds `skipped`, `fails`, `achievements`, `stats`.
- `src/app/App.ts` is split: sim-event → juice/audio wiring lives in `src/app/simFeedback.ts`, screen/navigation flow in `src/app/screens.ts`. Game time scale (hit-stop, collapse slow-mo) lives on `loop.timeScale`.
- Fragments spawn only when `Level.fragmentsEnabled` is true. `App` turns that on for a played level.
- Sling posts are visual, not physics bodies.
- Pages build sets `GITHUB_PAGES=1`, so Vite `base` is `/angrybots/`. Local `npm run dev` keeps base `/`.

## Rendering

- No real-time lights or shadow maps. Every material is `MeshBasicMaterial`; lighting is painted into textures (2D cartoon look).
- Shadows are instanced blob shadows (`src/render/BlobShadows.ts`); parallax layers live in `Scenery.applyParallax`.
- Particles are 8 instanced pools (wood/glass/stone/feather/smoke/spark/glow/ring); popups come from a glyph atlas (`textSprite` in `src/render/Juice.ts`).

## Audio

`src/audio/oneshots.ts` feeds `SoundBank`: launch, materials, pig, yell, creak, victory, defeat, cancel, ability, UI, and a chapter music loop. Impacts duck the music. A rendered First Flight mix peaked near 0.4 with nothing clipping. This machine's login could not open the headphone jack (user was not in `audio` until a later `usermod`; the session still needed a full desktop login). Do not claim a headphone listen.

## Levels

- All 30 levels are authored by `tools/rebuild-campaign.ts`. Edit the generator, not the JSON by hand. When regenerating one level, the other 29 JSONs must stay byte-identical.
- `npm run level:check` = static checks + settle/idle-drift + recorded-solution replay + star floor. `npm run level:curve` enforces the difficulty curve. `tests/physics/solution-robustness.test.ts` perturbs each first shot ±0.3°/±0.2 speed and requires ≥3 of 4 wins.
- `npm run level:rate` is a deterministic grid (angle 4–70 step 3, speed 13–23), seed `grid-a4-70s3-v13-23s1`.
- `Level.settle()` zeroes residual linear/angular velocity (`src/physics/freeze.ts`) — this is real sim behavior, shared by gameplay, replay, and validation.
- Pouch solving: `npm run level:pouch -- <levelId>` (`tools/pouch-solve.ts`, reads JSONs directly so tsx is fine). `BEAM` widens the search beam (default 3); `FRAG=<path>` writes results to a fragment file instead of overwriting the book — merge with jq for single-level updates.
- Solver runs are slow (hours for the full campaign). Time-box them, run in the background, and log milestone lines to a progress file.

## Inspection

Playwright here stalls around a few frames per second. That is not a player measurement. Isolated play has used port **5195** and, for the LAN share, **5175** (`npm run dev -- --host 0.0.0.0 --port 5175`). Playwright `webServer` is **5181** with `reuseExistingServer: false`. `npm run dev` is `vite --host` and otherwise uses Vite's default port.

## Commands

```bash
npm run typecheck && npm run lint:forbidden && npm run test:unit && \
npm run test:physics && npm run level:check && npm run level:curve && \
npm run build && npm run size      # size is a real gate: 350 kB gzip
npm run test:e2e -- --workers=1    # 2 workers flake under SwiftShader
GITHUB_PAGES=1 npm run build       # Pages build (base /angrybots/)
```

## Do not

- Hand-edit level JSONs or solution books — regenerate via `tools/rebuild-campaign.ts` / solver tools only.
- Put OpenAI, Anthropic, DeepSeek, or other labs' logos on the targets.
- Treat `docs/FRESH_REVIEW_*.md` or pre-2026-09-23 gauntlet counts as this tree.
- Claim headphone listening, phone soak, or Angry Birds art parity.
- Launch pouch probes with `npx tsx` against `registry.ts`.
