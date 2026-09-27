# Angry Bots — project state

> Rolling SSOT for agents. Last updated **2026-09-27**.
> Persistent notes: `memory/MEMORY.md` · Lessons: `tasks/lessons.md`
> Older gauntlet ledger (pre-launch-readiness): `docs/GAUNTLET_STATUS.md`

## Current

**Resume instruction:** Everything is merged to `main` (latest: PR #6, merge `4a222df`) and live on https://angrybots.lol (Cloudflare Worker `angrybots`, version `2781548e`). No open PRs or WIP branches. Launch-readiness phases 1–6 plus four polish batches (PRs #3–#6) are done. Deploys are manual: `npm run build && npx wrangler deploy` from `main`. Next work comes from user feedback; the human-only items below are still open.

| Field | Value |
| --- | --- |
| Branch | `main` @ `4a222df` (PR #6 merged). No open PRs |
| Tests | CI green on PR #6 (verify + e2e desktop + e2e phone-landscape). Local: unit 197/197, physics 187/187, level:check 30/30, level:curve ok, size 264.99 kB gzip (budget 350), last full e2e `--workers=1` 72 passed / 22 intentional project skips / 0 failed |
| Public site | https://angrybots.lol/ + https://www.angrybots.lol/ (Cloudflare static-assets Worker, `wrangler.jsonc`, root base). https://fubak.github.io/angrybots/ mirror auto-deploys from `main` via Pages |
| Temporary flags | `UNLOCK_ALL_LEVELS = true` in `src/game/progression.ts` — flip to `false` to restore chapter/level gates |
| Bot art | Official GrokBot sticker set supplied by the user: `src/assets/bots/*.svg` (runtime), `art/bots/png/` (2048px masters). `tools/extract-bot-art.ts` → `src/render/botArt.generated.ts`; `src/render/botArt.ts` paints cached body/eyes textures. Composite check `tools/check-bot-composite.mjs` diffs runtime `paintSticker` output vs outlined SVG references. Evidence: `docs/evidence/bots/` |
| Review artifacts | `/tmp/angrybots-review/` (phase1..phase5 screenshots). Key idles committed at `docs/evidence/phase4/` + `docs/evidence/phase5/` so they survive reboots |

## Change log

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
| `0c74c90` | 6 | CI root cause: SwiftShader ~1 fps + frameDt clamp 0.1 s + 5-step cap ran the sim at ~10% wall time → all post-launch polls timed out. FixedStepLoop now has a 60 ms/frame wall-clock catch-up budget, 40-step cap, 0.5 s frame-dt cap — sim keeps real-time pace on slow renderers |
| `a2c2f58` | 6 | Pseudo-3D head yaw matching user's refs: per-eye planes/textures, sin-slide clamped inside a silhouette ellipse, cos foreshortening + near/far asymmetry, edge fade to back-of-head at \|yaw\|>~0.96, yaw-velocity lean/squash (off under reduced motion). Queue + loaded-sling idle look-around (4.8 s cycle, staggered), loss turn-away-and-hold, rare title gag |
| `a29b340` | 6 | User animation references committed to `art/bots/` (gif/mp4/webp/originals, not shipped); motion comparison sheets + lost-turnaway evidence in `docs/evidence/bots/`; `tools/capture-bot-motion.mjs` + `tools/motion-sheet.html`; regenerated level1-idle baseline |
| `fix/polish-sling-music-celestial` (PR #4) | polish | Sun/moon pill eyes via `yawEyeTransforms`; music retune (roots G2–D3, sine/triangle, `SWING 0.59`, AABA motifs, kick+dark shaker, `MUSIC_LP_HZ 2000`, `MUSIC_BUS 0.09`); sling Y-fork resized so the bot seats in the pouch (tips `anchor.y+0.35`, crotch below heavy's underside, layered back arm→band→pouch→bot→front band→arm); queue→pouch hop + staggered queue advance (`SLING_HOP_SECONDS` 0.7 shared const); intro = `structureView` close-up (1.2 s hold + ≤5% push) → 1.4 s pan to sling (`INTRO_SECONDS` 2.8), tap skips, RM snaps to sling. Pass-2 fixes: eyes are one ShapeGeometry capsule mesh each (face z raised above light shafts); fork widened/deepened (`SLING_FORK` 1.8, `SLING_JOINT_Y` anchor−1.85, `SLING_TIP_Y` anchor+0.35, `SLING_ARM_W` 0.46 — arm-centerline clearance 1.134 ≥ r_max 0.72 + half-arm 0.23 + 0.08, unit-tested per bot kind); `__debug.loadLevel` routes through `App.startLevel`+`skipIntro` so fixture captures show the real loaded bot; parallax anchored to `slingView` (keeps citadel moon in frame during aim). Determinism: reduced motion stills scenery + queue bounce, `snapshot().frame` render counter, camera-settle poll needs frames+3 still samples. Pass-3 fixes: all sticker bodies get a dark outline ring — `paintBodyLayer` fills the silhouette in `PALETTE.outline` at full size then rim/body/extras at `STICKER_INSET` 0.9 (heavy's #98693d read as transparent against sling/dirt browns); `tools/bot-composite.html` + `check-bot-composite.mjs` now diff actual `paintSticker`/Path2D output vs an outlined SVG reference using a binary-mask/structural diff (catches a missing body layer at ~45%); `snapshot().sling` exposes loaded/queue/hopper pose, `__debug.sample` reads rendered canvas pixels; `tests/e2e/bot-pixels.spec.ts` asserts every kind's loaded+queue body color on-screen and the hop's crouch/stretch/rise/tumble thresholds; `tools/capture-hop-strip.mjs` regenerates the cropped deterministic hop strip |
| `fix/camera-gaze-menu-eyes` (PR #5) | polish+mobile | Title lineup uses `stickerBodyImage` (body-only) under animated eyes; clouds moved behind celestial group (z = hillsFar−6); sun/moon gaze tracks pouch→flight→impact via world-space direction + `shotReaction` mood anims (great/good/miss; suppressed under RM; blink suppressed while a reaction plays); camera frames `contentRect(level)` at real aspect + HUD inset, ground-anchored; `UNLOCK_ALL_LEVELS` temporary flag in progression; rotate prompt only while phase==='play' && !anyModalVisible (pointer-events:none so pause HUD stays tappable); mobile CSS pass: 100dvh+safe-area modals w/ internal scroll + sticky close, compact short-height title, portrait column chapter cards, short-landscape horizontal level-map nodes + normalized 0–100 SVG path + sticky map head. E2E: `launchSolution` converges pull additively in world space (release only after 2 consecutive sub-pixel-stable samples); `mobile.spec.ts` viewport-containment + elementFromPoint hit tests at 5 mobile sizes; lifecycle rotate test updated (prompt hidden under pause). Evidence in `docs/evidence/camera/` + `docs/evidence/mobile/`; regenerated `level1-idle` baseline. Review pass 2 fixes: splash.ready guarded on phase==='play' (title-over-gameplay race); shot baseline moved into GameSession.beginFlight — launches are DOM events between ticks so tick never saw the aim→flight edge and good/miss never fired (great worked only via won=true); reaction evidence captured with `celestialFreezeReact` mid-envelope (SwiftShader screenshots outlast the ~1.4s reaction); new `celestial.spec.ts` proves real shot→reaction (solution hit→'great', weak lob→'miss'); mobile.spec asserts settings last row scrolls into view |
| `feature/starbar-title-playground` (PR #6) | polish | Star bar = three equal segments (`src/ui/starBar.ts` `starBarFill`/`nextStarTarget`), stars at 1/3, 2/3, end; lit = score ≥ threshold; "Next ★ N" / "★★★ Max!" label; centered, mute+pause grouped in `.hud-left`; `setStarThresholds` zeroes the score so a new level never flashes stale stars. Title playground (`src/ui/titlePlayground.ts`): seeded fixed-step sim, no DOM/Math.random — walk, bounce, chase/flee, bump, leapfrog, nap (≤1 at a time), dance, tap-to-jump; feet on `Renderer.groundScreenY()`; zones from the title card rect (full strip or L/R gutters, hidden if neither fits); cast size ≤55% of zone width (12 @1280×720, 4 @390×664); `ResizeObserver` on the card re-derives zones; stage hidden until first layout. Evidence `docs/evidence/title/` |

## Shipped PRs

| PR | Merge | Scope |
| --- | --- | --- |
| #3 | `ae20e0f` | Launch readiness phases 1–6 (sticker bots) |
| #4 | `6e8a46a` | Sling seat/fork, music retune, pill celestial eyes, hop, castle intro |
| #5 | `3e6bbab` | Full-level real-aspect framing, sun/moon gaze + reactions, mobile menus/modals/map, lineup single eyes, clouds behind sun, unlock all |
| #6 | `4a222df` | Three-segment star bar, roaming title playground |

## Next steps

1. **Needs the user (cannot be done in code):** headphone listen of the retuned music, real-device soak (iOS Safari, Android Chrome), artist review of sticker art, licensed music / VO decision, analytics vendor (needs a backend).
2. **Before a public "release":** decide whether to flip `UNLOCK_ALL_LEVELS` back to `false`.
3. **Open design question:** HUD lit stars use score ≥ threshold (live progress), while `starsForScore` is win-gated with a 1★ minimum on any win — they can disagree on a low-score win or a loss. User has not asked to change it.

## Open

| Item | Status |
| --- | --- |
| Headphone listen / phone soak | Open (needs the user) |
| Angry Birds art parity | Not claimed. Bots use the official sticker set; blocks/scenery are canvas-painted |
| Deploy automation | Manual `wrangler deploy`; no CI deploy to angrybots.lol |
