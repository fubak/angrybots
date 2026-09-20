# Open issues

## Phase 1 — physics parity (2026-09-20)

- Committed slice solutions only reliably clear **first-flight** and **powder-row** under `replayLevel`; **glass-house**, **stone-keep**, and **hilltop** still fail P4 until shot timing / terrain / affinity tuning is aligned with `docs/specs/reference/sim.mjs`.
- `npm run lint:forbidden` fails on legacy cannon/anchored e2e and root tests (pre–Phase 2); not introduced by headless physics work.
- LVL-02 incomplete: full `tests/levels/invalid/*` fixture set and 30× legacy JSON regression fixtures from `65baa72` not yet committed.
- Calibration suite (`tests/physics/calibration.test.ts`) covers C1, C2, C14 only; remaining C3–C16 rows still to port per spec.
- `GameSession` headless rules need `tests/physics/session.test.ts` and resolve-loop polish before GAME-01 can close.
