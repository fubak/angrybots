# Gauntlet status ledger

**Last updated:** 2026-09-20 (local)  
**Branch:** main  
**Commit:** `ba5978d`  
**Environment:** Linux, Node 22, Playwright Chromium  
**Commands:** `npm run typecheck` · `npm test` · `npx playwright test tests/e2e` · `npm run gauntlet`

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **in progress** | R01–R10 verified; Cannon-matched trajectory preview + unit parity; Hz/stress matrix open |
| **2** Three-level quality slice | **started** | E01–E02 done; F01 pig threat + D02 sling return partial; G notes inventory |
| **3** 30 levels / 4 bots | **partial** | **30/30** levels; 4 bot roles; first-visit bot tutorials (I05 partial) |
| **4** Production reliability | **in progress** | CI + 52 e2e; disposal vitest; physics fixture no longer early-resets resolve |
| **5** Independent QA | **awaiting verification** | K07–K09 human/device/audio |

**Overall:** `in progress` — not complete per PRODUCTION_GAUNTLET_PROMPT.md.

## Fresh review (R01–R10)

| ID | Status | Evidence |
|----|--------|----------|
| R01 Portrait framing | **verified** | e2e portrait + `perchNdc` |
| R02 Pause/resume | **verified** | `tests/e2e/lifecycle.spec.ts` |
| R03 Roof drop / crush | **verified** | Pointer `glass-arch.spec.ts`; physics fixture in `physics-launch.spec.ts` |
| R04 Support collapse | **verified** | Gauntlet: blocks unpin/break after first pointer shot |
| R05 Misleading tests | **verified** | Player e2e pointer-only; debug hooks only in `physics-launch.spec.ts` |
| R06 Victory assertion | **verified** | Exact `Victory!` heading |
| R07 Level reset | **verified** | `lifecycle.spec.ts` level-select |
| R08 HUD live updates | **verified** | `tests/e2e/hud.spec.ts` (pointer); `debugSnapshot.score` |
| R09 Level overlaps | **verified** | `tests/level-layout.test.ts` |
| R10 Defeat remnants | **verified** | Pig hidden after pop |

## Backlog snapshot (A01–K10)

Full **87-row** matrix: `docs/GAUNTLET_BACKLOG_MATRIX.md`.

Status key: **done** · **partial** · **open** · **unverified**

| ID | Status | Notes / evidence |
|----|--------|------------------|
| A01 | partial | Explicit `GameState` + sling phases; not fully isolated from render |
| A02 | partial | Shot consumption in sling; `ammunition.test.ts` + debug launch shot delta e2e |
| A03 | partial | `resolving` + `sceneHasMeaningfulMotion`; `scene-quiescence.test.ts` |
| A04 | partial | Win after pig clear; chain win path e2e on Training Yard |
| A05 | partial | Win/loss **Retry** resets fort + ammo; pause/level-select; win input guard (`lifecycle.spec.ts`) |
| A06 | partial | HUD via overlay results; `hud.spec.ts` |
| A07 | partial | Tab hidden → auto pause; e2e visibility + pause-during-flight |
| B01–B03 | partial | `ContactSystem` + body collide |
| B04 | partial | Sleep/pin until first shot; R04 e2e |
| B05 | partial | `enforcePlanarMotion` |
| B12 | **done** | `validateLevelLayout` on all **30** levels (`levels-registry.test.ts`) |
| B09 | partial | Material thresholds in `config`; `material-damage.test.ts` |
| B06–B08,B10–B11,B13 | open | No CCD suite |
| C04 | **done** | `pointercancel` + weak release below `SLING_MIN_EFFECTIVE_PULL`; `sling-cancel.spec.ts` |
| C03 | partial | Active pointer + secondary ignore; fort-side pan / wheel zoom (`camera-inspect.spec.ts`) |
| C01 | partial | 20-point monotonic pull in `launchCurve.test.ts` |
| C02 | partial | Preview vs snap documented in `sling-preview-snap.test.ts` + trajectory parity |
| C05–C08 | partial | Trajectory e2e, pointer timing; pan/zoom (C03 remainder) |
| D01 | partial | Portrait center; `viewports.spec.ts` NDC framing |
| D05 | partial | Five target sizes in `viewports.spec.ts` (390–1920) |
| D02 | partial | Reveal + destruction hold + `returnToSlingFraming` after shot |
| D04 | partial | Deliberate pan/zoom without launch; inspect reset on level load / sling return |
| D03,D05 | open | Bounds polish |
| E01 | **done** | `docs/ART_SPEC.md` |
| E02 | **done** | `groundCrossSection.ts` |
| E03 | partial | Softer parallax hills (spheres, lower contrast) |
| E04 | partial | Grok shell contrast/emissive tuned (readable sphere) |
| E05 | partial | Pig silhouette rim + brighter eyes (phone readability) |
| E06 | partial | Stone/glass kit + stone/wood HP color lerp |
| E08 | partial | Brighter hemi/sun/fill + exposure 1.12 |
| E07 | partial | Fork posts, yoke, leather pouch torus |
| E09 | **done** | `docs/ASSET_MANIFEST.md` |
| F01 | partial | Grok blink/aim; pig `computePigThreat` worry; `pig-threat.test.ts` |
| F04 | **done** | Per-particle juice materials (burst/dust/spark clone) |
| F06 | partial | HUD score pop animation on increases |
| F02 | partial | Grok `celebrate` mood on win (bounce + eyes) |
| F03,F05 | open/partial | Timeline polish, pooling |
| G01–G03 | partial | Distinct cancel/tension/release synth cues; `docs/AUDIO_LISTENING_NOTES.md` template |
| G07 | **done** | TNT: `breakBlock` skips explosive; `detonateExplosive` owns mix |
| G08 | partial | Master volume + reduced motion in pause/title (`ProgressStore`) |
| G04–G06,G08 | open | Sample assets, mix buses; listen **unverified** |
| H01–H06 | partial | Stars, progress, flow overlay |
| H07 | partial | Escape pause/resume + Enter title start; `keyboard-access.spec.ts` |
| I01 | partial | Level registry + `chapters.ts` metadata |
| I02 | partial | 4 roles; dash strike boost; split burst on first hit + audio |
| I04 | partial | Pointer e2e: Training Yard, Glass Arch, Blast Yard |
| I06 | partial | Benchmark paths in `LEVEL_SOLUTIONS.md`; full id catalog in `LEVEL_CATALOG.md` + vitest |
| I07 | partial | `fortDeck` template + `docs/LEVEL_AUTHORING.md` |
| I03 | **done** | **30** authored levels across training / glassworks / blast |
| I05 | partial | HUD tips all four bots; `bot-tutorial.spec.ts` (3 levels) |
| J01 | partial | `strict: true` in tsconfig |
| J04 | partial | Pig dispose vitest; level reload clears entities in `Game.loadLevel` |
| J05 | partial | `npm run perf:smoke` headless rAF; `docs/PERF_PROFILE.md` — **no phone session** |
| J02–J03,J06–J07 | open/partial | CI; Game.ts monolith |
| K01–K06 | partial | Vitest + e2e; no visual regression grid |
| K07–K10 | unverified | Human AB, phone touch, listening |

## Latest verification

```
npm run typecheck  → pass (2026-09-20)
npm test           → 41 pass (20 files)
npx playwright test tests/e2e → 56 passed, 2 skipped (58 specs; lifecycle retry A05)
npm run gauntlet       → PASS (2026-09-20; ~10.8m; 58 e2e pass / 2 skip)
```

## Next actions

1. Gate 1: C03 secondary-touch matrix; remaining A/B scenario tests.
2. Gate 2: D02 impact/destruction hold; fill `AUDIO_LISTENING_NOTES.md`; E09 manifest.
3. Gate 3: tutorial beats per bot (I05); star solutions for extended levels.
4. Gate 2/4: polish slice, perf/disposal evidence.

## Explicitly unverified

- Physical phone touch, headphones listening, human AB (K07–K09)
- 30 levels, four bot abilities, strict TS, perf profile (J05)
