# Browser test report — AngryBots v2

**Branch:** `v2`  
**Date:** 2026-09-20  
**Environment:** Linux, Playwright 1.63, Vite dev server on port 5173

## Automated Playwright (`npm run test:e2e`)

| Project | Tests | Result |
| --- | --- | --- |
| desktop | 7 | pass |
| phone-landscape | 7 | pass |

**Total:** 14 passed (~24s)

### Coverage

- **levels-smoke:** All five slice levels reach `aim` (desktop + phone-landscape).
- **pause:** Pause menu opens; score unchanged while paused.
- **win:** First Flight cleared via dev `__debug.launch(34, 18)`; terminal state reached with pigs cleared when win path taken.

## CI pipeline (`npm run verify`)

| Step | Result |
| --- | --- |
| typecheck | pass |
| lint:forbidden | pass |
| test:unit (54) | pass |
| test:physics (76) | pass |
| level:check (30 levels) | pass |
| build | pass |
| test:perf | pass |

E2e is **not** wired into `verify` yet (see `docs/specs/ISSUES.md` I-03); run locally before release.

## Human gates (G1–G5)

Skipped per project directive (automated-only pass). Checklists remain in `docs/GATES.md` for a human sign-off.

## Known gaps

- Placeholder rendering (boxes/spheres); no visual baseline suite.
- Audio stubs only (`AUD-06`, `AUD-07`, `AUD-08` blocked).
- Levels 6–30 reuse slice layouts; solutions committed via solver.
