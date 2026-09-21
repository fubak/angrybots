# Gauntlet status ledger

**Last updated:** 2026-09-21  
**Starting commit:** `16170cf`  
**Loop 1 commit:** `3cf1261`  
**Loop 2 commit:** `eb37bc4`  
**Working branch:** `main`  
**Environment:** Linux, Node 22, Playwright Chromium  
**Active loop:** Loop 3 in progress after Loop 2 increment  
**Commands:** `npm run typecheck` · `npm run build` · `npm test` · `npx playwright test` · `npm run lint:forbidden` · `npx tsx tools/batch-solve.ts`

The previous ledger pointed at `5face02` and 74 browser tests from a removed implementation. Those claims are retired. This file is current evidence only.

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **implemented** | Loop 1 exit remains green on this revision. |
| **2** Three-level quality slice | **in progress** | Distinct bot/pig silhouettes, TNT bands, inspected First Flight / Powder Row / Glass House. Listening and Angry Birds art parity unverified. |
| **3** 30 levels / 4 bots | **implemented / unverified UI** | 30 unique authored files, 3 chapters, dash/split/heavy/blast taught as lead bots. Solver clears all 30. Real-pointer wins: First Flight + Lone Guard only. |
| **4** Production reliability | **in progress** | Isolated e2e on port 5181, 2 workers. 35 pass / 1 skip (desktop portrait — ISSUE-1). Physical device / 15-min soak missing. |
| **5** Independent QA | **unverified** | Human/device/listening not run. |

**Overall:** `awaiting verification` — campaign content is in, production parity is not claimed.

## Loop 1 findings (from `docs/FRESH_REVIEW_1dc4a50.md`)

| # | Status | Evidence |
|---|--------|----------|
| 1 Drag reset | **verified** | Loop 1 |
| 2 Missing sling/loaded bot | **verified** | Loop 1 + current `SlingView` characters |
| 3 Pause → Levels stuck | **verified** | `tests/e2e/pause.spec.ts` |
| 4 Portrait deadlock | **verified** | phone e2e in `lifecycle.spec.ts` |
| 5 Touch abilities | **verified** | `abilities.spec.ts` |
| 6 Audio stub | **partial** | Synth `SoundBank`; listening unverified |
| 7 Placeholder visuals | **partial** | Distinct silhouettes; not production character art |
| 8 Predecessor unlock | **verified** | progression e2e uses `lone-guard` |
| 9 Results every tick | **verified** | Loop 1 |
| 10 Permissive tests | **verified** | Real-input win/loss; F6 still enforced |
| 11 Stale ledger | **verified** | This file |
| 12 Duplicate levels | **verified** | 30 unique fingerprints in `tests/unit/campaign.test.ts` |

## Latest verification

```
starting commit     16170cf
npm run typecheck   pass
npm run build       pass (production preview :5183 identified as Angry Bots)
npm test            177 pass / 24 files
npm run lint:forbidden  pass
npx playwright test
  35 passed, 1 skipped (desktop portrait — ISSUE-1; phone project runs it)
  isolated server 127.0.0.1:5181 --strictPort, reuseExistingServer: false, workers: 2
inspected preview   http://127.0.0.1:5183/
```

Evidence:
- `docs/evidence/loop2-aim-first-flight.png` — visor Grok, faced pigs, sling, queue
- `docs/evidence/loop2-aim-powder-row.png` — dash capsule, TNT band, destruction-heavy slice
- `docs/evidence/loop2-aim-glass-house.png` — glass readability + tip
- `docs/evidence/loop3-aim-king-court.png` — citadel dusk, Heavy box, crowned king
- `docs/evidence/loop3-level-select.png` — 30 campaign slots, three chapter names in a11y tree

## Next actions

1. Replay remaining solver shots through pouch/UI (pouch mapping still misses some Planck-anchor solutions).
2. Listen to slice audio; replace synth if weak.
3. Physical phone + 15-minute soak + independent review.
4. Keep Loop 1 e2e green after any pouch mapping change.

## Continuation checkpoint

If a later session resumes: pull `main`, read this ledger, do **not** restart Loop 1. Next unmet criterion is pouch-accurate UI solutions for levels after Lone Guard (start with Heavy Gate / Twin Posts), then listening. First command: `npx playwright test tests/e2e/win.spec.ts tests/e2e/campaign-wins.spec.ts --project=desktop`.

## Explicitly unverified

- Headphones listening, physical phone, human AB review (K07–K09)
- Real-pointer solutions for 28 of 30 levels (solver + static/physics only)
- Production art/audio parity
- Desktop synthetic ≠ mobile performance
- Hidden-tab e2e
