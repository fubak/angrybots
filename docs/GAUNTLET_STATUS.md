# Gauntlet status ledger

**Last updated:** 2026-09-20 (local)  
**Branch:** main (pending push after this commit)  
**Environment:** Linux, Node 22, Playwright Chromium  
**Commands:** `npm run typecheck` · `npm test` · `npx playwright test tests/e2e` · `npm run gauntlet`

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **in progress** | R02/R03/R07/R09 regression tests added; pointer gauntlet + lifecycle e2e green (desktop three-shot occasionally flaky; CI retry) |
| **2** Three-level quality slice | **started** | E01 `docs/ART_SPEC.md`; E02 ground cross-section + softer parallax hills |
| **3** 30 levels / 4 bots | **not started** | 3 levels only |
| **4** Production reliability | **in progress** | CI + e2e; strict TS / perf / device profiling **unverified** |
| **5** Independent QA | **awaiting verification** | No human AB, listening, or real-phone session recorded |

**Overall:** `in progress` — not complete per PRODUCTION_GAUNTLET_PROMPT.md.

## Fresh review (R01–R10)

| ID | Status | Evidence |
|----|--------|----------|
| R01 Portrait framing | **verified** | e2e `portrait framing` passes 390×844 |
| R02 Pause/resume | **verified** | `tests/e2e/lifecycle.spec.ts` pause-during-flight |
| R03 Pig crush / roof drop | **verified** | `ContactSystem` crush + fatal fall delta; `tests/e2e/glass-arch.spec.ts` (dev launch scenario) |
| R04 Support collapse | **partial** | Pin until first shot; Glass Arch level roof on glass; no dedicated chain-collapse unit test |
| R05 Misleading tests | **verified** | Debug launch isolated; gauntlet pointer-only |
| R06 Victory assertion | **verified** | Exact `Victory!` heading |
| R07 Level reset lifecycle | **verified** | `lifecycle.spec.ts` level-select resets `launchedThisShot` |
| R08 HUD live updates | **implemented-unverified** | `maybeUpdateHud`; no automated HUD assert |
| R09 Level overlaps | **verified** | `tests/level-layout.test.ts` spawn validator |
| R10 Defeat remnants | **verified** | Pig hidden after pop |

## Backlog highlights (A01–K10)

Full matrix: `docs/ANGRYBOTS_PARITY_BACKLOG.md`.

| Area | Progress |
|------|----------|
| E01 Art spec | **done** — `docs/ART_SPEC.md` |
| E02 Ground cross-section | **done** — `src/visuals/groundCrossSection.ts` |
| B / physics | Pig sync pin fix; win when structure still; spawn-based fatal falls |
| I Content | Glass Arch layout rework (roof on glass) |

## Latest verification (this session)

```
npm run typecheck  → pass
npm test           → 7 pass (5 files)
npx playwright test tests/e2e → 14/14 pass (single run; desktop three-shot may flake without retry)
```

## Next actions

1. Expand per-backlog-ID rows in this ledger as items complete.
2. Gate 2: FX/audio/camera beats (F/G), reference captures (E03).
3. Gate 3+ content and production hardening (strict TS, perf profile, human QA).

## Explicitly unverified

- Real touch on physical phone
- Audio listening pass (G01–G08)
- Human AB parity (K07–K08)
- 30 levels / four bot types (Gate 3)
