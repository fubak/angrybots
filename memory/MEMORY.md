# Angry Bots — agent memory

**Project:** angrybots
**Last sync:** 2026-09-27
**SSOT:** `tasks/state.md`
**Ledger:** `docs/GAUNTLET_STATUS.md`

## Product fact

Vite + TypeScript slingshot game. Rendering is Three.js ortho. Physics is Planck (`planck`). Identity is Grok. Public site: https://angrybots.lol (+ www) — Cloudflare static-assets Worker `angrybots` (`wrangler.jsonc`), deployed manually with `npm run build && npx wrangler deploy` from `main`; mirror https://fubak.github.io/angrybots/ auto-deploys from `main` (repo `fubak/angrybots` is public). Do not claim Angry Birds parity.

## What the player sees

- Bots render the official GrokBot sticker set (`src/assets/bots/GrokBot_StickerSet_GrokBot-01..12.svg`, PNG masters in `art/bots/png`): grok = 01 black disc, dash = 08 red triangle, split = 11 blue drop (children share it), heavy = 06 brown disc, blast = 05 pink cyclops; stickers 02/03/04/07/09/10/12 are title-lineup + achievement art only. Layered runtime: `tools/extract-bot-art.ts` → `src/render/botArt.generated.ts`, `src/render/botArt.ts` paints backing+body+extras and a separate eyes layer that looks/blinks/squints. Blast still uses a circle collider — a capsule broke last-stand's recorded solution. Queue spacing uses `TUNING.bots[kind].r`.
- The sling is a Y-fork sized so the loaded bot sits IN the pouch between the arms: tips at `anchor.y + 0.35`, crotch below the largest bot's underside (joint ≲ `anchor.y − 0.97` so heavy r=0.72 clears), trunk to the ground. Layering back→front: back arm, back band, pouch, bot, front band, front arm — wood never crosses the bot's face. `SLING.anchor` and launch physics are unchanged; queue x stays `anchor.x − FORK − 1.5`.
- The sun and moon wear the bots' dark pill eyes (`Scenery.addEyes`/`lookAt` reuse `yawEyeTransforms` — group slide, mild far-eye narrowing, never merging; blink = pill scaleY).
- Queue bots hop into the pouch on `nextBot` and during the last `SLING_HOP_SECONDS` (0.7 s) of the intro: crouch → stretch-rise → half-tumble → apex hang → landing squash, pouch/bands dip, dust puff, then each remaining queue bot hops forward staggered. `SLING_HOP_SECONDS` lives in `src/sling/launch.ts` and is shared by `GameSession.hopTimer` and `SlingView` — presentation only, no physics dependency. Reduced motion = a plain arc.
- Level intro (~2.8 s, `INTRO_SECONDS` in `GameSession`): snap to `CameraDirector.structureView` (blocks + targets + terrain, ≤70% of the visible frame, real aspect, ground-pinned), 1.2 s hold with a 3% pull-back (a push-in crops), 1.4 s eased pan that lands exactly on the aim frame; the lead bot hops in over the last hop-beat of the pan. Tap/click skips (`SlingInput.onDown` → `skipIntro`). Reduced motion snaps straight to the sling view.
- Targets are still `kind: 'pig'` in the sim. On screen they are a chat bubble (plain), a host with antennae (`hat`), a visor robot (`helmet`), or a flagship with a gold antenna (`king`). Not other companies' logos.
- A target with `airborne` set (center above `r + 0.18`) is destroyed on a grass contact whose approach speed is at least 1.2. A target that starts on the grass is not. Terrain is not that contact.
- Plateaus, ramps, and ledges are drawn by `Renderer.setTerrain`. They exist in Hilltop, Ramp Run, and Ledge Nest. Without that mesh the stacks look like they float.
- The camera frames `contentRect(level)` (sling + full queue + blocks + pigs + terrain) at the real canvas aspect with the top-HUD inset, ground-anchored; `slingView()` takes aspect/HUD params — do not hardcode 16/9. Flight and impact only nudge the center (`nudge` in `CameraDirector`). During `aim`, `CameraGestures` adds pinch/wheel zoom and one-pointer pan (clamped to level bounds + 20%); double-tap resets. Do not bring back the close follow zoom.
- The sun/moon watch the action: gaze targets the pulled pouch → flying bot → `fx.impactCenter` → pig centroid, computed from the celestial's world position (parallax-layer-local position is wrong). `celestialMood.shotReaction` → `Scenery.react` great/good/miss; suppressed under reduced motion, and blinks pause while a reaction plays. The shot baseline (score, pigs alive) is captured in `GameSession.beginFlight` — launches arrive on DOM pointerup between ticks, so `App.tick` never sees the aim→flight edge. Drifting clouds live behind the celestial group (z = `DEPTH.hillsFar − 6`).
- Levels are gated by `src/game/progression.ts`: sequential within a chapter; workshop needs training's L10 cleared plus 15★, citadel needs workshop's L10 plus 35★. After 3 fails a level offers Skip (max 3 active; counts for unlock only). `?unlockAll=1` or the temporary `UNLOCK_ALL_LEVELS` flag unlocks everything in any build.
- The portrait "turn your device" prompt shows only during live gameplay (`phase === 'play'` and no modal open) and is `pointer-events: none`; menus/modals stay usable in portrait. Modals cap at `100dvh − safe-area insets` with internal scroll and sticky close. Short-landscape (<500 px tall) level maps lay nodes out horizontally; the map SVG uses a normalized `0 0 100 100` viewBox with `preserveAspectRatio="none"` so the path tracks percentage-positioned nodes.
- HUD star bar (`src/ui/starBar.ts`): three equal segments, segment i fills from thresholds[i−1] (0 first) to thresholds[i]; stars sit at 1/3, 2/3, end and light at score ≥ threshold, with a "Next ★ N" / "★★★ Max!" label. This is live progress; results stars come from win-gated `starsForScore` (1★ minimum on any win).
- Title screen: a roaming "playground" (`src/ui/titlePlayground.ts`, seeded fixed-step sim, no DOM or Math.random) rendered by `TitleScreen` as DOM stickers (body-only image + separate eye images). Feet sit on `Renderer.groundScreenY()`. Zones come from the title card rect: a full-width strip, or left/right gutters on short screens, or hidden. Cast size ≤55% of zone width, playable 5 first. Reduced motion = static lineup. `splash.ready` never shows the title while `phase === 'play'`.
- E2E `launchSolution` must converge the pull in WORLD space — `pull = anchor − pointerWorld` — because the camera keeps easing (tension widen) mid-drag and stale screen targets oscillate; release only after two consecutive sub-pixel-stable samples.

## Architecture

- Session states: `intro → aim → flight → resolve → nextBot | bonus → won | lost`. `GameSession` owns the machine. `resolve → won` is allowed when the last bot clears the level. Leftover bots still go through `bonus`.
- Player launches from the pulled pouch (`GameSession.launchFromPull`). Solver shots in `src/levels/solutions.json` launch from the sling anchor; pouch plans live in `src/levels/pouch-solutions.json`. Overwrite either book only via the solver tools, and only for levels whose layout changed.
- First Flight wins from the pouch at 22° / speed 23. `window.__debug.launch(angleDeg, speed)` is that order, and only exists when `import.meta.env.DEV`.
- `window.__debug.loadLevel` updates the sim only. It does not change `App.levelId`.
- `import.meta.glob` in `src/levels/registry.ts` only works under Vite. Do not pouch-search with `npx tsx` against the registry.
- Save is `angrybots-save-v4`, migrating from v3/v2/v1; adds `daily` ({lastDate, bestByDate (kept to last 30), streak}). Daily challenge = FNV-1a of the LOCAL `YYYY-MM-DD` string mod 30 levels (`src/game/daily.ts`); daily runs call `recordDailyResult`, never `recordLevel`/`recordFail`/`skipLevel`.
- `src/app/App.ts` is split: sim-event → juice/audio wiring lives in `src/app/simFeedback.ts`, screen/navigation flow in `src/app/screens.ts`. Game time scale (hit-stop, collapse slow-mo) lives on `loop.timeScale`.
- Analytics: `src/analytics/` exports `track(name, props)` with a typed event union and `setAnalyticsSink`. Default no-op, DEV console sink. No network, no PII.
- PWA: `vite.config.ts` emits `sw.js` at build (precache = bundle + `public/` + index.html, cache version from content hash). Registered only in prod with scope `import.meta.env.BASE_URL`; deploys at both `/` (angrybots.lol) and `/angrybots/` (Pages). In the SW, match cache entries by URL string — `caches.match(request)` can miss entries stored by `addAll` (Vary check against synthesized requests).
- Music: `src/audio/music.ts` builds deterministic note sequences (title + 3 chapter tracks + victory/defeat stings) rendered lazily with `OfflineAudioContext` and cached — no boot-time render. Peak kept ≤ 0.9. Current tuning: roots G2–D3, sine/triangle palette only, swung eighths (`SWING = 0.59`), seeded 2-bar motifs in AABA phrases (lead drops out on the final phrase except the cadence), soft kick (sine 140→50 Hz) + dark shaker (~2.8 kHz bandpass), `MUSIC_LP_HZ = 2000` lowpass on the music bus in live + offline paths, and `SoundBank.MUSIC_BUS = 0.09` (was 0.18 ≈ −6 dB). Melodic events stay ≤880 Hz, lead median ≤400 Hz — unit-tested per track.
- Reduced motion stills ambient scenery entirely: `Renderer.render` skips `Scenery.update`/`lookAt` (cloud drift, gaze, blink) and the queue idle bounce — this is also what makes the visual baselines deterministic.
- `Scenery` parallax is anchored by `setParallaxAnchor` at level load (App passes the real-aspect aim view; the celestial is clamped inside it). Don't let it capture from a live frame — a mid-transition capture offsets every background layer and the pixel baselines flake ~5%.
- Fragments spawn only when `Level.fragmentsEnabled` is true. `App` turns that on for a played level.
- Sling posts are visual, not physics bodies.
- Pages build sets `GITHUB_PAGES=1`, so Vite `base` is `/angrybots/`. Local `npm run dev` keeps base `/`.

## Rendering

- No real-time lights or shadow maps. Every material is `MeshBasicMaterial`; lighting is painted into textures (2D cartoon look).
- Shadows are instanced blob shadows (`src/render/BlobShadows.ts`); parallax layers live in `Scenery.applyParallax`.
- Damage visuals: `Renderer.tintDamage` swaps the block-face `map` to shared `damagedBlockTexture(material, stage)` at hp ≤ 66% (cracked) and ≤ 33% (broken); terrain bodies/caps use shared `TEX.terrainBody`/`TEX.terrainCap`. Citadel clouds are night-tinted; bot stickers carry their own white borders (the phase-5 pale rim was removed with the sticker switch).
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
