# Angry Bots — project state

> Rolling SSOT for agents. Last updated **2026-09-25**.
> Persistent notes: `memory/MEMORY.md` · Lessons: `tasks/lessons.md`
> Older gauntlet ledger (pre-launch-readiness): `docs/GAUNTLET_STATUS.md`

## Current

**Resume instruction:** Work is on branch `feature/launch-readiness` (not pushed, no PR). `main` is still `6d31c19`. The branch executes a launch-readiness review against an Angry Birds production bar in five phases. Phases 1–4 are committed and phase 4 is DONE (camera bounds, star recalibration, difficulty floors + retune, screenshots, full gate). Phase 5 is not started. Start with "Next steps" below.

| Field | Value |
| --- | --- |
| Branch | `feature/launch-readiness` at docs commit on top of `1c880c7`, not pushed |
| Tests | typecheck, lint:forbidden, unit 119/119, physics 178/178 (incl. robustness ≥3/4 per level), level:check 30 ok, level:curve ok (floors + star gaps), build ok, size 236.64 kB gzip (budget 350). e2e --workers=1: 37 passed, 1 intentionally skipped (portrait rotate prompt) |
| Public site | https://fubak.github.io/angrybots/ still serves `main` (old build) |
| Review artifacts | `/tmp/angrybots-review/` (phase1..phase4b screenshots). Phase-4b idles also committed at `docs/evidence/phase4/` so they survive reboots |

## Commits on the branch

| Commit | Phase | Summary |
| --- | --- | --- |
| `574ae75` | 1 | Removed dead lights/shadow map (all materials are MeshBasic; 2D painted look). Instanced blob shadows, additive sprite flashes, parallax layers, title sky fix, per-tick save read removed, SaveStore deep defaults, audio double-gain + lazy AudioContext, saved volumes applied at boot, reduced-motion honors OS, time-based flinch, mesh/material disposal, fps `p5Low`, real size gate + vendor chunks |
| `64fdd82` | 2 | Distinct bot colors (grok black, dash amber, split blue, heavy purple blob, blast red disc with "!"; blast keeps circle collider). Target eye tracking, taunts, pop death. Queue bounce, hop to sling, bonus hops. Y-fork sling with sagging/wobbling bands. Puff trail. Instanced particle pools (8), explosion VFX for TNT and blast, hit-stop, collapse slow-mo, landing dust, glass glints, impact stars. Glyph-atlas popups. Per-material impact audio. Combo bonus `(N-2)*250` |
| `583c5e7` + `40013d7` | 3 | Splash, title, chapter map + level path, progression gates (`src/game/progression.ts`), skip after 3 fails, save v3, HUD rework (star bar, count-up, targets counter, tip toast), results modal (count-up, star fill, highscore ribbon), pause, settings (volumes, mute, reduced motion, aim guide, reset), credits, bot intro cards, achievements (15) + toasts, camera pinch/wheel zoom + pan (`src/camera/CameraGestures.ts`), SVG icons |
| `1eaee06` | 4A | Popup glyph layout fix, stronger fireball/shockwave, App.ts split (`src/app/simFeedback.ts`, `src/app/screens.ts`) |
| `330faa9` + `4cdf290` | 4B | Campaign rebuilt by `tools/rebuild-campaign.ts` (dense archetypes, 12–60 blocks). solutions.json + pouch-solutions.json regenerated. New checks: settle/idle drift in `level:check`, `tests/physics/solution-robustness.test.ts`, `npm run level:curve`. Rater is a deterministic grid (seed `grid-a4-70s3-v13-23s1`). `Level.settle()` zeroes residual velocity (`src/physics/freeze.ts`). validatePhysics counts unused-bot bonus from the winning shot prefix |
| `4ed9c23` | 4C | docs: session handoff — memory, README, lessons |
| `f22c651` | 4C | Camera bounds: validator rule (block AABB + pig circle inside `camera` with ≥0.5 maxX/maxY margin) + generator computes maxX/maxY from real `expandLevel` extents + margin (ceil). Only camera fields changed in JSONs |
| `d92617f` | 4C | Star thresholds on min-win vs best-known axes (`star1=floor500(P)`, `star3=floor500(best)`, `star2=round500(star1+0.55Δ)`), span ≥5000 + gaps ≥2000 rules in `level:curve`; global-order bug fix (`chapterIndex*10+order`) |
| `afc6d47` + `f9e18fb` | 4C | Difficulty floors (L1 ≥20, L2–3 ≥10, bot intros + chapter openers ≥5, anyKill ≥15) + retuned 8 levels (powder-row, glass-house, stone-keep, twin-posts, split-lesson, blast-shed, king-court, triple-keep). New robust anchor + pouch solutions; hat-row/triple-keep re-solved for star span. level:curve green |
| `8c1e834` + `14d6670` | 4C | phase4b idle screenshots (11 levels) at `/tmp/angrybots-review/phase4b/` + `docs/evidence/phase4/` |
| `1c880c7` | 4C | campaign-wins e2e updated to powder-row's new two-shot pouch plan (24/21 then 34/20); verified passing on desktop + phone-landscape |

## Next steps (in order)

1. **Phase 4 — DONE.** Full gate green including e2e single-worker (37 passed, 1 intentional skip).
2. **Phase 5 (not started):**
   - longer procedural music (60–90 s per chapter plus a title theme) and a victory/defeat sting
   - finished citadel palette (clouds tinted, contrast for black bots)
   - terrain textures, and 3 damage-state textures per material
   - PWA (manifest, service worker, offline)
   - an analytics hook: a vendor-neutral event interface, no vendor SDK
   - daily challenge (seeded level of the day, local only)
   - update stale docs: `docs/ASSET_MANIFEST.md` references nonexistent `abTextures.ts`/Cannon; README "every level is selectable" is no longer true
3. **Needs the user (cannot be done in code):** artist sprite atlas + skeletal animation, licensed or commissioned music, recorded VO, real-device soak (iOS Safari and Android Chrome), headphone listen, leaderboards or analytics vendor choice (needs a backend).
4. **Ship:** review the whole branch diff, open a PR (`gh pr create`), deploy Pages from `main` after merge.

## Open

| Item | Status |
| --- | --- |
| e2e on `feature/launch-readiness` | Done: 37 passed, 1 skipped (portrait rotate prompt, intentional), 0 failed |
| Headphone listen / phone soak | Open (needs the user) |
| Angry Birds art parity | Open. Art is still canvas-painted in code |
