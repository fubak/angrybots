# Gauntlet status ledger

**Last updated:** 2026-09-20 (local)  
**Branch:** main  
**Commit:** (pending this session’s push)  
**Environment:** Linux, Node 22, Playwright Chromium  
**Commands:** `npm run typecheck` · `npm test` · `npx playwright test tests/e2e` · `npm run gauntlet`

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **in progress** | R01–R10 verified; Cannon-matched trajectory preview + unit parity; Hz/stress matrix open |
| **2** Three-level quality slice | **started** | E01–E02 done; E03 parallax softened; F/G/H largely open |
| **3** 30 levels / 4 bots | **not started** | 3 benchmark levels (I04 partial) |
| **4** Production reliability | **in progress** | CI + 22 e2e; strict TS / perf / disposal **unverified** |
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
| B06–B13 | open/partial | No CCD suite; level-layout validator (B12 partial) |
| C01–C08 | partial | Monotonic sweep, Cannon trajectory, `launch-preview.spec.ts` (pointer preview vs release); Hz input **open** |
| D01 | partial | Portrait center; multi-viewport e2e partial |
| D02–D05 | open | Camera beats, pan/zoom gestures |
| E01 | **done** | `docs/ART_SPEC.md` |
| E02 | **done** | `groundCrossSection.ts` |
| E03 | partial | Softer parallax hills (spheres, lower contrast) |
| E04 | partial | Grok shell contrast/emissive tuned (readable sphere) |
| E05–E09 | open | Targets/material kit polish |
| F01–F06 | open | Juice burst clones material (F04 partial) |
| G01–G08 | open | Synth audio only; listening **unverified** |
| H01–H07 | partial | Stars, progress, flow overlay |
| I01 | partial | Level registry data-driven |
| I04 | partial | Pointer e2e: Training Yard, Glass Arch, Blast Yard |
| I02–I07 | open | 1 bot; 3 levels (benchmark trio playable) |
| J01–J07 | open/partial | CI K05; Game.ts monolith |
| K01–K06 | partial | Vitest + e2e; no visual regression grid |
| K07–K10 | unverified | Human AB, phone touch, listening |

## Latest verification

```
npm run typecheck  → pass
npm test           → 18 pass (8 files)
npx playwright test tests/e2e → 22/22 pass (desktop + mobile)
```

## Next actions

1. Gate 1: multi-Hz pointer sampling (C08); remaining A/B scenario matrix.
2. Gate 2: E04–E08 character/material pass; G listening notes; D02 camera beats.
3. Gate 3: I02 four bots + level authoring pipeline after slice sign-off.

## Explicitly unverified

- Physical phone touch, headphones listening, human AB (K07–K09)
- 30 levels, four bot abilities, strict TS, perf profile (J05)
