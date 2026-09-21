# Start or resume the AngryBots production gauntlet

For Cursor with Grok 4.6, use [CURSOR_GROK_MASTER_GAUNTLET.md](./CURSOR_GROK_MASTER_GAUNTLET.md). It starts with syncing the repository and orchestrates all three implementation loops through all five production gates. The latest reviewed baseline is [FRESH_REVIEW_1dc4a50.md](./FRESH_REVIEW_1dc4a50.md); revalidate findings after pulling.

Copy this into Cursor to start or resume:

```text
First pull the latest updates from https://github.com/fubak/angrybots, preserving existing changes and following repository instructions. On clean main use git pull --ff-only origin main; on this task's existing branch fetch and integrate upstream/main while preserving completed work; otherwise use an isolated branch/worktree from origin/main without discarding existing work. Then read docs/CURSOR_GROK_MASTER_GAUNTLET.md in full and execute it. You are authorized to implement, verify, commit and push cohesive changes. Run all three loops in order, maintain docs/GAUNTLET_STATUS.md, and continue between gates without waiting for another instruction. Do not declare completion until every required production gate has current evidence; record a precise continuation checkpoint if a real blocker or session limit intervenes.
```

## Original general-purpose startup prompt

Copy the prompt below into a coding session with access to https://github.com/fubak/angrybots.

---

Finish AngryBots against the production-quality requirements in this repository.

First inspect the working tree and applicable AGENTS.md instructions, preserve unrelated changes, and sync safely with the current remote. Read docs/PRODUCTION_GAUNTLET_PROMPT.md in full, then execute its observe → implement → verify → critique → record loop. Also read docs/ANGRYBOTS_PARITY_BACKLOG.md, docs/FRESH_REVIEW_8f4aebe.md, and docs/GAUNTLET_STATUS.md if it exists.

This is an implementation request, not a planning request. Complete the original 87-task scope and all five gates: correct mechanics/lifecycle; a fully polished three-level slice; at least 30 authored levels across three chapters and four distinct bot types; production reliability/performance; and evidence-backed quality review against Angry Birds Classic.

Start by repairing misleading tests and reproducing the fresh review findings. Use real player input for interaction tests. Never substitute debug launches, soft-fail annotations, placeholder art, self-assigned scores, or a successful build for acceptance evidence.

You are authorized to modify the game, produce original assets, add meaningful tests, update the status ledger, and commit and push cohesive verified changes to this repository. Respect branch protections; do not force-push or alter unrelated work. Do not deploy publicly or purchase services without separate authorization.

Continue autonomously across iterations and checkpoints until the gates pass or you are blocked by a concrete external dependency. Honor user stop/pause instructions and session limits. Keep status truthful: unavailable human, listening, or real-device checks remain explicitly unverified. Complete all independent work before requesting a necessary external action.

On each checkpoint, record the tested commit, backlog IDs completed, evidence, remaining gaps, and exact next step in docs/GAUNTLET_STATUS.md. Resume from that ledger rather than starting over. At completion, provide the pushed commit, playable/build instructions, all gate results, and any limitations.

---
