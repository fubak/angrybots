# Angry Bots — project state

> Rolling SSOT for agents. Last updated **2026-09-25**.
> Persistent notes: `memory/MEMORY.md` · Lessons: `tasks/lessons.md`
> Older gauntlet ledger (pre-launch-readiness): `docs/GAUNTLET_STATUS.md`

## Current

**Resume instruction:** Work is on branch `feature/launch-readiness` with PR #3 open (`main` merged in; PR was MERGEABLE with green CI before the bot-art task). The branch executes a launch-readiness review against an Angry Birds production bar. Phases 1–5 + merge reconciliation are DONE; phase 6 replaced procedural bots with the official GrokBot sticker set (user-supplied SVGs in `src/assets/bots`, PNG masters in `art/bots/png`) with a layered body/eyes runtime and full expression animation. Remaining: PR merge, deploy.

| Field | Value |
| --- | --- |
| Branch | `feature/launch-readiness`, PR #3 open at https://github.com/fubak/angrybots/pull/3 |
| Tests | `verify:full` green except the 2 visual-baseline tests whose snapshots were being regenerated mid-run (they passed standalone right after): typecheck, lint:forbidden, unit 140/140, physics 187/187, level:check 30 ok, level:curve ok, size 255.07 kB gzip (budget 350). e2e --workers=1: 41 passed + 2 baseline misses in the full run, then 2 passed after regen; 3 skips intentional (portrait-rotate on desktop, baselines on phone). Visual baselines regenerated for sticker art |
| Public site | https://angrybots.lol/ is the primary target (root base); https://fubak.github.io/angrybots/ mirror still serves `main` (old build) |
| Bot art | Official GrokBot sticker set supplied by the user: `src/assets/bots/*.svg` (runtime), `art/bots/png/` (2048px masters). `tools/extract-bot-art.ts` → `src/render/botArt.generated.ts`; `src/render/botArt.ts` paints cached body/eyes textures. Composite check `tools/check-bot-composite.mjs` = 0.00% diff all 12. Evidence: `docs/evidence/bots/` |
| Review artifacts | `/tmp/angrybots-review/` (phase1..phase5 screenshots). Key idles committed at `docs/evidence/phase4/` + `docs/evidence/phase5/` so they survive reboots |

## Commits on the branch

| Commit | Phase | Summary |
| --- | --- | --- |
| `574ae75` | 1 | Removed dead lights/shadow map (all materials are MeshBasic; 2D painted look). Instanced blob shadows, additive sprite flashes, parallax layers, title sky fix, per-tick save read removed, SaveStore deep defaults, audio double-gain + lazy AudioContext, saved volumes applied at boot, reduced-motion honors OS, time-based flinch, mesh/material disposal, fps `p5Low`, real size gate + vendor chunks |
| `64fdd82` | 2 | Distinct bot colors — superseded by the official sticker set in phase 6 (grok black, dash amber, split blue, heavy purple blob, blast red disc with "!"; blast keeps circle collider). Target eye tracking, taunts, pop death. Queue bounce, hop to sling, bonus hops. Y-fork sling with sagging/wobbling bands. Puff trail. Instanced particle pools (8), explosion VFX for TNT and blast, hit-stop, collapse slow-mo, landing dust, glass glints, impact stars. Glyph-atlas popups. Per-material impact audio. Combo bonus `(N-2)*250` |
| `583c5e7` + `40013d7` | 3 | Splash, title, chapter map + level path, progression gates (`src/game/progression.ts`), skip after 3 fails, save v3, HUD rework (star bar, count-up, targets counter, tip toast), results modal (count-up, star fill, highscore ribbon), pause, settings (volumes, mute, reduced motion, aim guide, reset), credits, bot intro cards, achievements (15) + toasts, camera pinch/wheel zoom + pan (`src/camera/CameraGestures.ts`), SVG icons |
| `1eaee06` | 4A | Popup glyph layout fix, stronger fireball/shockwave, App.ts split (`src/app/simFeedback.ts`, `src/app/screens.ts`) |
| `330faa9` + `4cdf290` | 4B | Campaign rebuilt by `tools/rebuild-campaign.ts` (dense archetypes, 12–60 blocks). solutions.json + pouch-solutions.json regenerated. New checks: settle/idle drift in `level:check`, `tests/physics/solution-robustness.test.ts`, `npm run level:curve`. Rater is a deterministic grid (seed `grid-a4-70s3-v13-23s1`). `Level.settle()` zeroes residual velocity (`src/physics/freeze.ts`). validatePhysics counts unused-bot bonus from the winning shot prefix |
| `4ed9c23` | 4C | docs: session handoff — memory, README, lessons |
| `f22c651` | 4C | Camera bounds: validator rule (block AABB + pig circle inside `camera` with ≥0.5 maxX/maxY margin) + generator computes maxX/maxY from real `expandLevel` extents + margin (ceil). Only camera fields changed in JSONs |
| `d92617f` | 4C | Star thresholds on min-win vs best-known axes (`star1=floor500(P)`, `star3=floor500(best)`, `star2=round500(star1+0.55Δ)`), span ≥5000 + gaps ≥2000 rules in `level:curve`; global-order bug fix (`chapterIndex*10+order`) |
| `afc6d47` + `f9e18fb` | 4C | Difficulty floors (L1 ≥20, L2–3 ≥10, bot intros + chapter openers ≥5, anyKill ≥15) + retuned 8 levels (powder-row, glass-house, stone-keep, twin-posts, split-lesson, blast-shed, king-court, triple-keep). New robust anchor + pouch solutions; hat-row/triple-keep re-solved for star span. level:curve green |
| `8c1e834` + `14d6670` | 4C | phase4b idle screenshots (11 levels) at `/tmp/angrybots-review/phase4b/` + `docs/evidence/phase4/` |
| `1c880c7` | 4C | campaign-wins e2e updated to powder-row's new two-shot pouch plan (24/21 then 34/20); verified passing on desktop + phone-landscape |
| `82f4462` | 4C | phase 4 closeout — state, catalog, solutions, lessons |
| `e0ba3c2` | 5 | Procedural music: deterministic note sequences → lazy `OfflineAudioContext` render + cache (`src/audio/music.ts`); title + 3 chapter tracks (60–90s) + victory/defeat stings; peak ≤0.9 |
| `46e65e3` | 5 | Citadel night clouds (`ChapterLook.cloud`) + pale rim on dark bots (`shadeAndOutline` rim arg); idle screenshots in `docs/evidence/phase5/` |
| `0a4de20` | 5 | Terrain textures (`TEX.terrainBody`/`terrainCap` on plateau/ramp/ledge) + shared 3-state damage maps (`damagedBlockTexture`, hp ≤66% cracked / ≤33% broken) replacing crack overlay; `__debug.damage` for evidence captures |
| `e7578c2` | 5 | PWA: `public/manifest.webmanifest`, generated PNG/maskable icons (`scripts/gen-icons.mjs`), build-time `sw.js` (precache all assets + public, hash-versioned, cache-first assets / network-first index), prod-only registration at `BASE_URL` scope, offline e2e |
| `f16b946` | 5 | `src/analytics/` typed events + pluggable sink (noop default, DEV console), wired at App/screens seams |
| `d620420` | 5 | Daily challenge: FNV-1a date picker (`src/game/daily.ts`), save v4 + migration, streak/best (last 30 dates), title Daily button, results daily best+streak, no campaign side effects |
| `1f9ef99` | 5 | Issues: I-05 invalid-fixture matrix (9 fixtures incl. camera-margin S5, iterated in validate-static.test), I-03 `verify:full` script, I-02 visual baselines (title + level 1 idle, desktop, 3× stable) |
| `0cde173` | merge | `origin/main` merged into `feature/launch-readiness`; conflicts resolved to our side; main's rolling-target physics + lower-field camera anchoring dropped (camera/Level/types/bodies/SaveStore byte-identical to pre-merge; `src/levels/` 0-line diff incl. solutions/ratings books) |
| `6624eb4` | merge | Additive visuals ported from main: sun/moon disc with action-tracking eyes + rays, light shafts, level-name banner, bot impact squash, HUD mute (uses existing `settings.muted`, save stays v4), `border-box` portrait panels. Skipped: queue idle (equivalent bounce exists), SaveV2, campaign re-solve |
| `8719810` | merge | CI: e2e split into per-project matrix jobs (desktop / phone-landscape), `workers: CI?1:2`, `reducedMotion: 'reduce'`, retry 1 on CI, job timeouts; visual baselines skipped under CI (ISSUE-02 tag) — main CI had failed 37/38 on SwiftShader "element is not stable" timeouts |
| `976eb52` | merge | Evidence screenshots for ported visuals in `docs/evidence/merge/` |

## Next steps (in order)

1. **Phases 1–5 — DONE.** Phase 5 delivered: procedural music, citadel night palette + bot rims, terrain + 3-state damage textures, PWA/offline, analytics hook, daily challenge + save v4, I-02/I-03/I-05 resolved, docs refreshed.
2. **Needs the user (cannot be done in code):** artist sprite atlas + skeletal animation, licensed or commissioned music, recorded VO, real-device soak (iOS Safari and Android Chrome), headphone listen, leaderboards or analytics vendor choice (needs a backend).
3. **Ship:** review the whole branch diff, open a PR (`gh pr create`), deploy: angrybots.lol at root + Pages from `main` after merge.

## Open

| Item | Status |
| --- | --- |
| e2e on `feature/launch-readiness` | Done: 37 passed, 1 skipped (portrait rotate prompt, intentional), 0 failed |
| Headphone listen / phone soak | Open (needs the user) |
| Angry Birds art parity | Open. Art is still canvas-painted in code |
