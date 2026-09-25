# Angry Bots — project state

> Rolling SSOT for agents. Last updated **2026-09-25**.
> Persistent notes: `memory/MEMORY.md` · Lessons: `tasks/lessons.md`
> Older gauntlet ledger (pre-launch-readiness): `docs/GAUNTLET_STATUS.md`

## Current

**Resume instruction:** Work is on branch `feature/launch-readiness` (not pushed, no PR). `main` is still `6d31c19`. The branch executes a launch-readiness review against an Angry Birds production bar in five phases. Phases 1–4 are committed; phase 4 has three small deferred items; phase 5 is not started. Start with "Next steps" below.

| Field | Value |
| --- | --- |
| Branch | `feature/launch-readiness` at `4cdf290`, tree clean, not pushed |
| Tests at `4cdf290` | typecheck, lint:forbidden, unit 119/119, physics 175/175 (incl. robustness 30/30), level:check 30 ok, level:curve ok, build ok, size 236.79 kB gzip (budget 350). **e2e not run since phase 3** (phase 3: 35 pass / 2 flaky / 1 skip on 2 workers; flakes pass isolated) |
| Public site | https://fubak.github.io/angrybots/ still serves `main` (old build) |
| Review artifacts | `/tmp/angrybots-review/` (phase1..phase4 screenshots, `phase4/STATUS.md` has the full per-level table). `/tmp` may not survive a reboot |

## Commits on the branch

| Commit | Phase | Summary |
| --- | --- | --- |
| `574ae75` | 1 | Removed dead lights/shadow map (all materials are MeshBasic; 2D painted look). Instanced blob shadows, additive sprite flashes, parallax layers, title sky fix, per-tick save read removed, SaveStore deep defaults, audio double-gain + lazy AudioContext, saved volumes applied at boot, reduced-motion honors OS, time-based flinch, mesh/material disposal, fps `p5Low`, real size gate + vendor chunks |
| `64fdd82` | 2 | Distinct bot colors (grok black, dash amber, split blue, heavy purple blob, blast red disc with "!"; blast keeps circle collider). Target eye tracking, taunts, pop death. Queue bounce, hop to sling, bonus hops. Y-fork sling with sagging/wobbling bands. Puff trail. Instanced particle pools (8), explosion VFX for TNT and blast, hit-stop, collapse slow-mo, landing dust, glass glints, impact stars. Glyph-atlas popups. Per-material impact audio. Combo bonus `(N-2)*250` |
| `583c5e7` + `40013d7` | 3 | Splash, title, chapter map + level path, progression gates (`src/game/progression.ts`), skip after 3 fails, save v3, HUD rework (star bar, count-up, targets counter, tip toast), results modal (count-up, star fill, highscore ribbon), pause, settings (volumes, mute, reduced motion, aim guide, reset), credits, bot intro cards, achievements (15) + toasts, camera pinch/wheel zoom + pan (`src/camera/CameraGestures.ts`), SVG icons |
| `1eaee06` | 4A | Popup glyph layout fix, stronger fireball/shockwave, App.ts split (`src/app/simFeedback.ts`, `src/app/screens.ts`) |
| `330faa9` + `4cdf290` | 4B | Campaign rebuilt by `tools/rebuild-campaign.ts` (dense archetypes, 12–60 blocks). solutions.json + pouch-solutions.json regenerated. New checks: settle/idle drift in `level:check`, `tests/physics/solution-robustness.test.ts`, `npm run level:curve`. Rater is a deterministic grid (seed `grid-a4-70s3-v13-23s1`). `Level.settle()` zeroes residual velocity (`src/physics/freeze.ts`). validatePhysics counts unused-bot bonus from the winning shot prefix |

## Next steps (in order)

1. **Finish phase 4:**
   - recapture idle screenshots for `blast-shed` and `split-keep` (their layouts changed after capture)
   - run `npm run test:e2e -- --workers=1` and fix failures
2. **Phase 4 design problems I found in review** (all constraints passed; these are design issues, not constraint failures):
   - **Star thresholds are packed** 500–1500 points apart on every level (e.g. last-stand 49000/49500/50000), so 2★ vs 3★ is almost binary and the HUD star bar bunches at the right. Recalibrate so the stars separate meaningfully (e.g. 1★ = worst winning sequence, 2★ = win with one bot spare, 3★ = win with two spare or high destruction), then re-run `level:check`.
   - **Difficulty is front-loaded.** Level 1 is 37.5% oneShotClear, but level 2 is 5.5% and the intro levels (4 split, 7 dash) are 0%. Split Lesson / Grand Stand (L10) has 4.3% anyKill. The `level:curve` rule "≤ prev + 5" is trivially satisfied by 0%. Make intro levels easy (a floor, e.g. ≥10% oneShotClear) and add a floor rule to `tools/level-curve.ts`.
   - **Last Stand's structure runs off the right edge** of the idle frame (`phase4/idle-30-last-stand.png`). Level `camera` bounds must include every block; add a validator rule and check all 30.
3. **Phase 5 (not started):**
   - longer procedural music (60–90 s per chapter plus a title theme) and a victory/defeat sting
   - finished citadel palette (clouds tinted, contrast for black bots)
   - terrain textures, and 3 damage-state textures per material
   - PWA (manifest, service worker, offline)
   - an analytics hook: a vendor-neutral event interface, no vendor SDK
   - daily challenge (seeded level of the day, local only)
   - update stale docs: `docs/ASSET_MANIFEST.md` references nonexistent `abTextures.ts`/Cannon; README "every level is selectable" is no longer true
4. **Needs the user (cannot be done in code):** artist sprite atlas + skeletal animation, licensed or commissioned music, recorded VO, real-device soak (iOS Safari and Android Chrome), headphone listen, leaderboards or analytics vendor choice (needs a backend).
5. **Ship:** full e2e, review the whole branch diff, open a PR (`gh pr create`), deploy Pages from `main` after merge.

## Open

| Item | Status |
| --- | --- |
| e2e on `4cdf290` | Not run |
| Headphone listen / phone soak | Open (needs the user) |
| Angry Birds art parity | Open. Art is still canvas-painted in code |
