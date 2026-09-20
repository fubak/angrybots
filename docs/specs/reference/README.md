# Reference simulation

Headless Planck.js (1.5.0) implementation of the v2 physics, damage, scoring, and level checks. It exists to prove the specs work and to calibrate numbers. **It is not shipped.** Port it to TypeScript per the tasks in `../02-physics.md` and `../03-levels.md`.

```bash
npm install
node check.mjs    # static + settle + idle checks for the 5 slice levels
node solve.mjs    # greedy solver (no abilities, anchor launch)
node rate.mjs     # one-shot difficulty metrics
node dist.mjs <level-id>
node calib.mjs    # calibration scenarios used by PHY-03
```

What it doesn't include: abilities, material affinity, fragments, out-of-bounds removal, quiet-based resolve (it uses a simpler "quiet for 0.6 s" rule per shot). The specs define those.

Recorded outputs (`*-output.txt`) were produced on 2026-09-20 with Node 22 and planck 1.5.0.
