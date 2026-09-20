# Gauntlet status ledger

**Last updated:** 2026-09-20 (local)  
**Branch:** main  
**Commit:** `cd19751`  
**Environment:** Linux, Node 22, Playwright Chromium  
**Commands:** `npm run typecheck` · `npm test` · `npx playwright test tests/e2e` · `npm run gauntlet`

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **in progress** | R01–R10 verified; Cannon-matched trajectory preview + unit parity; Hz/stress matrix open |
| **2** Three-level quality slice | **started** | E01–E02 done; E03 parallax softened; F/G/H largely open |
| **3** 30 levels / 4 bots | **started** | **14/30** levels; 3 chapters; fortDeck authoring; 4 bot roles |
| **4** Production reliability | **in progress** | CI + 28 e2e; `strict` TS; perf / disposal **unverified** |
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

Status key: **done** · **partial** · **open** · **unverified**

| ID | Status | Notes / evidence |
|----|--------|------------------|
| A01 | partial | Explicit `GameState` + sling phases; not fully isolated from render |
| A02 | partial | Shot consumption in sling; e2e ammo checks |
| A03 | partial | `resolving` + quiescence; debris no longer blocks win |
| A04 | partial | Win after pig clear; chain win path e2e on Training Yard |
| A05 | partial | Retry/next/menu/pause; e2e lifecycle |
| A06 | partial | HUD via overlay results; `hud.spec.ts` |
| A07 | partial | Visibility pause; e2e pause-during-flight |
| B01–B03 | partial | `ContactSystem` + body collide |
| B04 | partial | Sleep/pin until first shot; R04 e2e |
| B05 | partial | `enforcePlanarMotion` |
| B12 | partial | `validateLevelLayout` on full `LEVELS` registry |
| B06–B11,B13 | open | No CCD suite |
| C04 | **done** | `pointercancel` + weak release below `SLING_MIN_EFFECTIVE_PULL`; `sling-cancel.spec.ts` |
| C03 | partial | Active pointer ID; secondary touch ignored; `sling-secondary-pointer.spec.ts` |
| C01–C02,C05–C08 | partial | Monotonic sweep, trajectory e2e, pointer timing; pan/zoom (C03 remainder) |
| D01 | partial | Portrait center; multi-viewport e2e partial |
| D02 | partial | Level reveal + resolving destruction hold on fort; flight follow |
| D03–D05 | open | Pan/zoom gestures, bounds polish |
| E01 | **done** | `docs/ART_SPEC.md` |
| E02 | **done** | `groundCrossSection.ts` |
| E03 | partial | Softer parallax hills (spheres, lower contrast) |
| E04 | partial | Grok shell contrast/emissive tuned (readable sphere) |
| E05 | partial | Pig silhouette rim + brighter eyes (phone readability) |
| E06 | partial | Stone/glass kit + stone/wood HP color lerp |
| E08 | partial | Brighter hemi/sun/fill + exposure 1.12 |
| E07 | partial | Fork posts, yoke, leather pouch torus |
| E09 | **done** | `docs/ASSET_MANIFEST.md` |
| F01–F06 | open | Juice burst clones material (F04 partial) |
| G01–G03 | partial | Distinct cancel/tension/release synth cues; `docs/AUDIO_LISTENING_NOTES.md` template |
| G07 | partial | Master volume + reduced motion in pause/title (`ProgressStore`) |
| G04–G06,G08 | open | Sample assets, mix buses; listen **unverified** |
| H01–H07 | partial | Stars, progress, flow overlay |
| I01 | partial | Level registry + `chapters.ts` metadata |
| I02 | partial | 4 roles; dash strike boost; split burst on first hit + audio |
| I04 | partial | Pointer e2e: Training Yard, Glass Arch, Blast Yard |
| I06 | partial | `docs/LEVEL_SOLUTIONS.md` star paths + e2e refs |
| I07 | partial | `fortDeck` template + `docs/LEVEL_AUTHORING.md` |
| I03 | partial | **14** registry levels across 3 chapters (**16** to reach 30) |
| I05,I07 | open | Tutorials; full ability UX polish |
| J01 | partial | `strict: true` in tsconfig |
| J02–J07 | open/partial | CI K05; Game.ts monolith; perf profile |
| K01–K06 | partial | Vitest + e2e; no visual regression grid |
| K07–K10 | unverified | Human AB, phone touch, listening |

## Latest verification

```
npm run typecheck  → pass (2026-09-20)
npm test           → 23 pass (12 files)
npx playwright test tests/e2e → 28/28 pass (desktop + mobile)
npm run gauntlet       → PASS (2026-09-20)
```

## Next actions

1. Gate 1: C03 secondary-touch matrix; remaining A/B scenario tests.
2. Gate 2: D02 impact/destruction hold; fill `AUDIO_LISTENING_NOTES.md`; E09 manifest.
3. Gate 3: bulk level authoring toward 30; tutorial beats per bot.

## Explicitly unverified

- Physical phone touch, headphones listening, human AB (K07–K09)
- 30 levels, four bot abilities, strict TS, perf profile (J05)
