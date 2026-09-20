# Gauntlet status ledger

**Last updated:** 2026-09-20 (local)  
**Branch:** main (uncommitted work in progress — see git log after next push)  
**Environment:** Linux, Node 22, Playwright Chromium  
**Commands:** `npm run typecheck` · `npm test` · `npx playwright test tests/e2e` · `npm run gauntlet`

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **in progress** | R01–R10 fixes landed; pointer e2e green; support collapse after first shot enabled |
| **2** Three-level quality slice | **not started** | Art/audio/animation still prototype |
| **3** 30 levels / 4 bots | **not started** | 3 levels only |
| **4** Production reliability | **in progress** | CI + e2e; strict TS / perf / device profiling **unverified** |
| **5** Independent QA | **awaiting verification** | No human AB, listening, or real-phone session recorded |

**Overall:** `in progress` — not complete per PRODUCTION_GAUNTLET_PROMPT.md.

## Fresh review (R01–R10)

| ID | Status | Evidence |
|----|--------|----------|
| R01 Portrait framing | **verified** | `CameraRig` no longer overwrites ortho; `Game.onResize` sets portrait center; e2e `portrait framing` passes 390×844 |
| R02 Pause/resume | **implemented-unverified** | `pauseSnapshot` preserves flight/resolving; manual pause-during-flight retest **unverified** |
| R03 Pig crush damage | **implemented-unverified** | `ContactSystem` block→pig crush thresholds; needs Glass Arch drop scenario test |
| R04 Support collapse | **partial** | Dynamic sleep + pin until `playerHasShot`; post-launch gravity/chains **needs scenario tests** |
| R05 Misleading tests | **verified** | Debug launch isolated to `physics-launch.spec.ts`; gauntlet uses pointer only |
| R06 Victory assertion | **verified** | Exact `Victory!` heading, count 1 |
| R07 Level reset lifecycle | **implemented-unverified** | `loadLevel` clears shot timers/flags; regression test **TODO** |
| R08 HUD live updates | **implemented-unverified** | `maybeUpdateHud` on state/score; manual spot-check **unverified** |
| R09 Level overlaps | **implemented-unverified** | level1/level2 pig Y adjusted; overlap validator script **TODO** |
| R10 Defeat remnants | **verified** | Pig group hidden after pop |

## Backlog rollup (A01–K10)

Full 87-row matrix lives in `docs/ANGRYBOTS_PARITY_BACKLOG.md`. Summary:

- **A** Game lifecycle: partial (title/results/levels/pause fix; loading/settings/a11y open)
- **B** Physics: partial (contacts, materials, debris, crush wake; CCD/replay/B12 validator open)
- **C–D** Sling/camera/mobile: partial (monotonic curve, portrait center; pan/zoom/trail open)
- **E–G** Art/FX/audio: **not started** (prototype visuals; no listening pass)
- **H** UI/progression: partial (HUD, stars, saves; tutorial/settings open)
- **I** Content: 3/30 levels, 1 bot type
- **J** Engineering: partial (CI, e2e, Vitest; strict TS, perf profile open)
- **K** QA: partial (honest e2e; visual regression/human/device **unverified**)

## Latest verification (this session)

```
npm run typecheck  → pass
npm test           → 4 pass
npx playwright test tests/e2e → 8 pass (desktop + mobile projects)
```

## Next three actions

1. Add Vitest/Playwright regressions: pause-during-flight, level-select during flight, Glass Arch roof-pig crush win.
2. Gate 2 art spec (E01) + ground cross-section (E02) — replace prototype hills/ground.
3. Expand backlog ledger to per-ID rows as items are verified (do not mark PASS without evidence).

## Resume instructions

1. `git pull` · `npm ci` · `npx playwright install chromium`
2. Read this file and `docs/FRESH_REVIEW_8f4aebe.md`
3. Run `npm run gauntlet` before claiming progress
4. Continue Gate 1 scenario tests, then Gate 2 art/audio slice

## Explicitly unverified

- Real touch on physical phone (Playwright mobile uses mouse-synthesized pointer)
- Audio listening / mix quality (G01–G08)
- Human AB vs Angry Birds Classic (K07–K08)
- Midrange phone 60fps / 15-minute session profile (J05)
- 30-level content and four bot abilities (Gate 3)
