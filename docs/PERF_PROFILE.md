# Performance profile (Gate 4 / J05)

**Status:** desktop-only smoke captured; midrange phone session **unverified** (K07).

## Targets (from gauntlet prompt)

| Metric | Target | Current evidence |
|--------|--------|------------------|
| Normal play p95 frame time | ≤ 20 ms @ 60 Hz | Not measured on device |
| Heavy cascade | Document separately | Not profiled |
| 15 min / 20 retries session | No leaks, stable fps | Not run |
| Cold-cache first playable | ≤ 5 s @ 10 Mbps | Not measured |

## Automated smoke (repo)

Run after `npm run build`:

```bash
npm run perf:smoke

Uses production preview (`4173`) and waits for in-game **Pause** (no dev `__game` hook). Headless Chromium often exceeds the 32ms p95 smoke threshold; treat as a regression signal only, not device parity.
```

This loads the production bundle in headless Chromium, samples `requestAnimationFrame` deltas for ~8 s on Training Yard, and prints p50/p95 ms. It does **not** substitute device profiling.

## Manual device checklist (when hardware available)

1. Note phone model + OS + browser.
2. Play Training Yard → Glass Arch → Blast Yard with pointer input.
3. Record heaviest Blast Yard TNT chain; note stutter or audio dropouts.
4. Retry the same level 20×; confirm no rising memory or slowdown.

Record results here with date and commit hash.
