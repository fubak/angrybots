# Gauntlet status ledger

**Last updated:** 2026-09-23
**HEAD:** `e2b8547` on `main` (pushed)
**Repo:** public `fubak/angrybots`
**Site:** https://fubak.github.io/angrybots/
**Environment:** Linux, Node 22, Playwright Chromium

This file is current evidence. Older counts and the dirty-tree note from `a1d521e` are retired.

## Milestone summary

| Gate | State | Notes |
|------|--------|--------|
| **1** Mechanics & lifecycle | **implemented** | Drag, shot count, settle, last-bot `resolve → won`, and ground-pop for airborne targets. |
| **2** Three-level quality slice | **in progress** | First Flight, Powder Row, Hilltop, Hat Row, King Court, and Four Roles have been looked at in a browser. Listening and art parity are not claimed. |
| **3** 30 levels / bots | **selectable, pouch-proven in sim** | All 30 are unlocked. Pouch plans are in `src/levels/pouch-solutions.json`. The anchor solver file is unchanged. |
| **4** Production reliability | **in progress** | Pages deploy of `e2b8547` succeeded. Full Playwright suite not re-run on that commit. |
| **5** Independent QA | **unverified** | No confirmed headphone listen. No phone soak. |

**Overall:** playable and public. Production parity with Angry Birds is not claimed.

## Latest verification

```
HEAD                    e2b8547
npm run typecheck       pass (after the Pages commit)
save-v2 + calibration   pass
pouch-all               31 pass
Pages workflow          run 35856843242 success
full playwright suite   not run on e2b8547
headphones / phone      not confirmed
```

Checked in the browser on 2026-09-23:

- Level list: 0 disabled buttons.
- Hilltop: the right-hand stack sits on a drawn dirt plateau, not in empty sky.
- First Flight targets read as chat bubbles. King Court shows the flagship. Hat Row shows the hosts.
