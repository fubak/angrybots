# Gauntlet status ledger

**Last updated:** 2026-09-21  
**Starting commit:** `16170cf`  
**Loop 1 commit:** `3cf1261`  
**Working branch:** `main`  
**Environment:** Linux, Node 22, Playwright Chromium  
**Active loop:** Loop 2 in progress after Loop 1  
**Commands:** `npm run typecheck` · `npm run build` · `npm test` · `npx playwright test tests/e2e` · `npm run lint:forbidden`

The previous ledger pointed at `5face02` and 74 browser tests from a removed implementation. Those claims are retired. This file is current evidence only.

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **implemented** | Loop 1 exit met on this revision. First Flight mouse+touch win/loss, ammo/cancel, pause freeze/resume, navigation, predecessor unlock. Remaining: CCD/Hz soak, hidden-tab e2e. |
| **2** Three-level quality slice | **in progress** | Scenery, juice, synth audio, tips on First Flight / Powder Row / Glass House. Listening and art parity unverified. |
| **3** 30 levels / 4 bots | **partial** | 30 files exist; `docs/specs/ISSUES.md` I-01: 25 are duplicates. |
| **4** Production reliability | **in progress** | Isolated e2e on port 5181; 31 pass / 1 skip (desktop portrait, ISSUE-1). |
| **5** Independent QA | **unverified** | Human/device/listening not run. |

**Overall:** `in progress` — Loop 1 playable gate earned; production parity not claimed.

## Loop 1 findings (from `docs/FRESH_REVIEW_1dc4a50.md`)

| # | Status | Evidence |
|---|--------|----------|
| 1 Drag reset | **verified** | `SlingModel.setLoaded` is a transition; `tests/unit/sling-model.test.ts`; e2e held-drag |
| 2 Missing sling/loaded bot | **verified** | `SlingView` pouch/bands/queue/preview; `docs/evidence/loop1-aim-first-flight.png` |
| 3 Pause → Levels stuck | **verified** | `tests/e2e/pause.spec.ts` |
| 4 Portrait deadlock | **verified** | Orientation checked in `draw()`; phone e2e in `lifecycle.spec.ts` |
| 5 Touch abilities | **verified** | Flight tap + Space; `abilities.spec.ts` dash once |
| 6 Audio stub | **open** | Loop 2 — `SoundBank` still no-op |
| 7 Placeholder visuals | **partial** | Sling visible; characters still primitive. Loop 2. |
| 8 Predecessor unlock | **verified** | `SaveStore.isUnlocked`; progression e2e + reload |
| 9 Results every tick | **verified** | `resultRecorded` once-per-transition |
| 10 Permissive tests | **verified** | Real-input win/loss; F6 catches `__debug!.launch!` |
| 11 Stale ledger | **verified** | This file rewritten against `16170cf`+ |
| 12 Duplicate levels | **open** | Loop 3 |

## Fresh review R01–R10 (re-audited)

| ID | Status | Evidence |
|----|--------|----------|
| R01 Portrait framing | **partial** | Rotate prompt + recovery e2e; physical phone unverified |
| R02 Pause/resume | **verified** | Moving-body freeze/resume e2e |
| R03 Roof drop / crush | **partial** | Physics suite; no new pointer crush case this loop |
| R04 Support collapse | **partial** | Physics rewrite; no new e2e this loop |
| R05 Misleading tests | **verified** | Player e2e pointer-only; fixtures stay in `DebugApi` DEV |
| R06 Victory assertion | **verified** | Exact `Victory!` heading |
| R07 Level reset | **verified** | Pause → Restart e2e |
| R08 HUD live updates | **verified** | Score/shots after inspected shot (5020 / Shots: 2) |
| R09 Level overlaps | **verified** | Existing `validate-static` 31 tests |
| R10 Defeat remnants | **unverified** | Not re-tested this loop |

## Latest verification

```
starting commit     16170cf
npm run typecheck   pass
npm run build       pass (production preview :5182 identified as Angry Bots)
npm test            140 pass / 21 files
npm run lint:forbidden  pass
npx playwright test tests/e2e
  31 passed, 1 skipped (desktop portrait — ISSUE-1; phone project runs it)
  isolated server 127.0.0.1:5181 --strictPort, reuseExistingServer: false
inspected preview   http://127.0.0.1:5182/  title Angry Bots — Grok Edition
                    data-game=angrybots
fps (preview aim)   p50≈59.9  p95≈60.2
```

Evidence:
- `docs/evidence/loop1-aim-first-flight.png` — loaded bot, sling, queue, structure, HUD
- `docs/evidence/loop1-drag-first-flight.png` — held pull + trajectory dots
- `docs/evidence/loop1-aftershot-first-flight.png` — post-impact score/ammo

## Next actions

1. Finish Loop 2: inspect/listen First Flight, Powder Row, Glass House; replace remaining primitive character art; authored samples if synth is weak.
2. Keep Loop 1 e2e green.
3. Loop 3: replace 25 duplicate layouts after the slice is finished.

## Continuation checkpoint

If a later session resumes: pull `main`, read this ledger, reproduce Loop 2 weakest visual (aim + impact on First Flight and Powder Row), then author unique levels 6–30. Do not restart Loop 1. First command: `npx playwright test tests/e2e/win.spec.ts --project=desktop`.

## Explicitly unverified

- Physical phone touch, headphones listening, human AB (K07–K09)
- Production art/audio parity
- Hidden-tab e2e
- Desktop synthetic ≠ mobile performance
