First, pull the latest updates from https://github.com/fubak/angrybots before analyzing or changing the game. Verify you are in that repository, inspect `git status --short`, the current branch and remotes, and read applicable repository instructions. If the checkout is clean on main, run `git pull --ff-only origin main`. If resuming on this task's existing clean branch, fetch origin, fast-forward from its upstream if configured, and merge origin/main when needed; preserve the task branch and its completed work. Resolve task-related merge conflicts and rerun affected checks. Preserve unrelated changes and branches: if the checkout is dirty or on an unrelated branch, fetch origin and create an isolated `codex/production-gauntlet` worktree from the latest origin/main, using a unique suffix if needed. Never discard, overwrite or silently stash someone else's work. If authentication or synchronization fails, report the exact failure and preserve local work rather than claiming to have pulled. Record the resulting starting commit.

You are executing this assignment in Cursor using Grok 4.6. Act as the engineer, art/audio integrator, playtester and release coordinator for AngryBots. Implement and verify the complete game. This is an execution request, not a request for a new plan or a list of recommendations.

## Mission and authority

Finish AngryBots as an original production-quality slingshot puzzle game matching the craft of Angry Birds Classic in controls, physics, destruction, visual readability, character personality, animation, sound, interface, progression, level design, reliability and performance. Preserve AngryBots' Grok identity and use original or appropriately licensed assets. Reference quality and timing, not proprietary assets or branding.

You are authorized to edit game code, create/integrate assets, add meaningful tests, repair CI, update documentation and commit/push cohesive changes to this repository. Use available local/browser tools and install project dependencies as needed. Do not purchase services, upload secrets, deploy publicly, force-push, bypass branch protections or alter unrelated work. Push the working branch; if main is protected, push a feature branch and open a PR if tooling permits. Do not mark a PR merged unless it actually is.

Continue autonomously through all three loops below. Do not stop for routine approval, between loops, after a green build, after one successful shot or after writing a progress report. Honor user stop instructions and actual session/tool limits. A prompt cannot keep running after Cursor ends a session; maintain a precise resume checkpoint rather than promising unattended work after termination.

## Read, reconcile and establish the baseline

Read applicable AGENTS.md and Cursor project instructions, then:

- `docs/PRODUCTION_GAUNTLET_PROMPT.md` — detailed five-gate acceptance contract.
- `docs/ANGRYBOTS_PARITY_BACKLOG.md` and `docs/GAUNTLET_BACKLOG_MATRIX.md` — all 87 original backlog items, preserving IDs and acceptance criteria.
- `docs/FRESH_REVIEW_1dc4a50.md` — latest reviewed baseline; reproduce findings on the pulled revision before assuming they remain.
- `docs/ANGRY_BIRDS_TARGET.md`, `docs/specs/ISSUES.md`, relevant current specifications, package scripts, CI and tests.
- `docs/GAUNTLET_STATUS.md` — historical evidence must be reconciled with the current implementation.

This file orchestrates the work; the production contract supplies detailed acceptance requirements. Loop 1 satisfies Gate 1, Loop 2 satisfies Gate 2, and Loop 3 satisfies Gates 3–5. Do not shrink the original three-level slice, three-chapter campaign, four bot roles or 30 authored levels. Older POC rubrics, anchoring requirements, soft passes and numeric self-ratings do not override production acceptance. Missing or contradictory documentation is something to reconcile from player behavior and the current code, not permission to declare a feature optional.

Inspect the actual tool capabilities available in this Cursor session. Use a real browser for interaction and visual inspection. Use actual touch events for touch validation. Establish how to capture screenshots/gameplay and how to inspect audio; report unavailable capabilities truthfully. Never assume another environment's browser hooks or asset-generation tools exist here.

Install from the lockfile. Record environment and commands. Run current type checks, build, unit/physics/performance checks, level validation and browser tests; inspect what their assertions establish. Use a dedicated strict-port server and verify its identity before testing: port 5173 previously served another game and the browser suite silently reused it. Test the production build as well as development where behavior can differ. Separate setup failures from product defects.

The `1dc4a50` baseline built successfully, passed 30 layout validations and 14 browser cases, but had 119 passing unit/physics/performance tests plus one test-suite import failure on Windows. These are historical observations, not current certifications. Its win test used a debug launch and accepted losing; passing those tests did not prove gameplay.

## Process controller: repeat until the gates are earned

Maintain `docs/GAUNTLET_STATUS.md` as the durable source of execution state. Keep the backlog matrix synchronized. For every item use `open`, `in_progress`, `verified`, `blocked` or `unverified`; preserve the distinction between implementation and verification. Record:

- Starting/base commit, current working branch, environment, active loop and gate.
- Original backlog IDs, current review IDs, defect reproduction and player-facing acceptance conditions.
- Changes made, commands and outcomes, evidence paths, tested source revision and any uncommitted diff used for testing.
- Open regressions, dependencies, missing external evidence and the exact next action.
- Next session's first reproduction/test command, server configuration and relevant files.

Do not fabricate the hash of a commit that has not been created. Evidence can cite an implementation commit and be committed in a subsequent documentation checkpoint. Re-run affected checks after subsequent implementation changes; do not carry forward obsolete certification.

For every iteration:

1. **Observe:** run a real reproduction or play scenario at the current revision; distinguish observed defects from source-level concerns and unknowns.
2. **Select:** choose the highest-impact unmet criterion. Input/lifecycle correctness precedes polish; finished polish precedes content multiplication. Address regressions before advancing.
3. **Define:** name the requirement IDs, expected behavior and decisive failure/pass checks before changing it.
4. **Implement:** make a coherent change that appears in the running product. Preserve the Planck architecture; avoid another engine rewrite or speculative framework.
5. **Verify:** run focused regression tests and relevant integration checks, then exercise the real player path. Inspect images for visual work and listen when judging sound. Check neighboring behavior.
6. **Critique:** review the visible/audible result against the acceptance criteria. A function's existence, builder summary, screenshot filename or self-assigned score is not evidence of quality.
7. **Record and checkpoint:** update the ledger, inspect the diff for unintended files/secrets, commit coherent work and push the authorized branch. Keep captures bounded and use the repository's artifact conventions for large media.
8. **Continue:** take the next unmet requirement. On a gate pass, proceed directly to the next loop. If a later change regresses an earlier gate, reopen it and repair it.

If the same attempted fix fails repeatedly, reduce it to a minimal reproduction and change the hypothesis. Do not run unchanged commands indefinitely. If an external dependency blocks one item, record it, finish independent work and then request the smallest necessary external action. Never claim complete while a required gate is blocked or unverified.

## Loop 1 — Real player controls, mechanics and lifecycle

Reproduce current versions of these findings; fix those that remain and any newly discovered blockers:

1. `App.tick` called `SlingInput.syncLoadedBot` every update, which called `SlingModel.setLoaded` and reset the drag phase/pull. Preserve a held drag across simulation ticks and make loading a state transition.
2. Render the loaded character, pouch, bands, queued bots and clear aim feedback. A player must see what to grab. Keep the full valid pull region accessible and the preview consistent with the actual launch.
3. Launch exactly once on valid release, consume exactly one bot, and consume none on cancel, tiny pulls, lost capture or a secondary pointer. Prevent actions through menus and overlays. Test varied pull distances, fast/slow gestures and sustained 0.5–2 second holds.
4. Preserve flight/resolving state during pause and backgrounding. Repair Pause → Levels → Start, Pause → Restart, retry/next/reset, hidden-tab return and portrait → landscape recovery. Orientation recovery must still run when simulation is paused. Pausing a stationary aim and comparing score does not verify pause behavior.
5. Expose all four bot abilities through touch as well as supported mouse/keyboard controls, with correct timing and single-use semantics.
6. Unlock levels from predecessor progression, persist it across reload, preserve best scores/stars and perform result awards/persistence once per transition.
7. Validate real contact damage, unsupported collapse, crushing, material behavior, chain explosions, high-speed collisions, settling and fair win/loss. No artificial anchoring or scripted success to conceal simulation failures.
8. Repair test-module import failures. Replace permissive browser tests with strict win/loss and lifecycle assertions driven by actual UI input. Strengthen forbidden-pattern enforcement so alternate syntax cannot evade it. Debug mutations are allowed only in clearly separated simulation fixtures; read-only measurements are allowed in acceptance tests.
9. Reconcile stale ledger claims with the current implementation and retire references to removed tests.

Exit only when the complete First Flight flow works through real mouse and touch input; strict win and loss cases are proven; ammo/cancel/abilities are correct; moving bodies freeze and resume correctly; all lifecycle transitions recover; progression survives reload; and relevant build/unit/physics/layout/browser checks pass without skips, fallback launches or relaxed assertions. Reconcile all Gate 1 requirements from the production contract before advancing. This gate establishes playability, not production parity.

## Loop 2 — Finish the production slice

First finish First Flight end to end. Then apply the same quality to two additional levels, including a destruction-heavy challenge and a materially different ability/terrain challenge. The exit requirement is three finished levels, not one polished screenshot.

Integrate final original art into the actual runtime: recognizable bot and enemy silhouettes, expressive faces, idle/aim/flight/impact/defeat animation, coherent line weight/lighting/color, attractive layered scenery and terrain. Match physical shapes and readable material identity for wood, glass, stone and explosives. Add damage stages, visible debris and bounded particles. Ensure level changes cannot reuse stale views merely because entity IDs repeat; dispose or reuse resources correctly.

Complete sling deformation, pouch/band ordering, queue handoff, honest trajectory, last-shot trail, landing/impact feedback, camera framing/follow/return and reduced-motion behavior. Connect real simulation events to rendering, camera and audio; unused helper classes do not count as implementation. Eliminate page margins, accidental scrolling, exposed ground edges, clipping and controls obscuring gameplay.

Finish title, level selection, HUD, pause/settings, tutorials, victory/failure, scoring and star reveals as one coherent interface. Include keyboard focus, readable text and targets, responsive safe areas and understandable feedback.

Replace no-op audio with real licensed/original assets and actual event routing: stretch/release, character launch/ability, material impact/break, explosion, enemy reaction/defeat, interface, victory/failure, music and ambience. Add sensible variation, impact-aware gain, concurrency limits and separate music/effects/voice controls. Verify gesture unlock, mute persistence, pause/resume and background behavior. Listen to representative gameplay, including noisy destruction, to check balance and repetition. If listening is unavailable, keep that acceptance item unverified and prepare captures for review.

At each iteration, play aim → launch → flight/ability → impact/destruction → result → retry/next. Inspect desktop and phone views, screenshots and gameplay captures. Test slow/missing asset behavior and repeated retries. Measure actual scene frame timing and bounded particle/debris/audio activity before tuning. Never remove essential feedback simply to improve a benchmark.

Exit when all three levels visibly and audibly meet the production contract, no live placeholders or silent stub events remain in the slice, the entire player journey is coherent, and Loop 1 remains green. Supply reviewed before/after views for aim/flight/impact/results, representative gameplay capture, audio coverage/listening evidence and named-environment performance results. Self-ratings or uninspected baselines do not establish parity.

## Loop 3 — Complete the campaign and qualify release

Replace duplicated layouts with at least 30 deliberately authored levels across three visually distinct chapters. Give every level an intended skill, material/ability interaction, readable target layout, calibrated difficulty and attainable star thresholds. Teach all four bot roles, then combine them. Reject renamed duplicates, cosmetic-only variations and procedurally copied layouts masquerading as authored content.

For every level, validate idle stability, layout correctness, reachable targets and intended collapse chains. Use solvers as design assistance; replay a solution through real UI input before counting player solvability. Record shot plans, ability timing, expected outcome and star targets. Test alternate approaches on representative challenges. Check progression, tutorials, retry, next-level flow and save migration through the campaign.

Qualify the shipping build with strict player-input win/loss/lifecycle checks, inspected visual baselines, asset loading and fallback coverage, audio lifecycle, accessibility/usability and debug-hook isolation. Repair CI so the release gate includes meaningful browser tests and fails on failures. Legacy scripts that no longer validate current behavior must be repaired, not trusted by name.

Check supported desktop browsers, phone landscape, portrait guidance/recovery, resize, background/resume and real touch. Run sustained play and repeated level/retry transitions to detect growing memory, renderer caches, listeners and audio/particle pools. Measure frame-time distribution, load cost and memory trend on named hardware/browser environments against the production contract's budgets. Desktop synthetic results do not certify physical mobile performance. Keep missing device evidence explicit.

Perform a final fresh review after implementation: replay the shipping build against every gate, inspect the weakest levels and worst destruction scenes, review visual/audio captures and audit all 87 backlog items. Obtain independent playtest/review evidence when available; do not relabel the builder's self-review as independent. Complete available fixes while external checks are pending.

Exit only with 30 genuinely distinct levels, three finished chapters, four taught and usable bot roles, real-input solutions, coherent progression, complete presentation, passing release checks and evidence for all five production gates. No required unchecked row may silently become optional.

## Completion and continuation protocol

Before declaring completion, rerun the integrated release gate against the final implementation, verify every required acceptance row, inspect the final diff, commit/push all task changes, and confirm the remote branch contains the pushed commit. Report any branch-protection/CI status truthfully. Do not stage another person's unrelated files.

The final report must identify the pushed branch/commit or PR, build/play instructions, all five gate outcomes, per-level coverage, evidence locations, measured performance and any limitations. Only use `complete` when all required gates are verified. If any required listening, device, independent review or other external check remains, label the project `awaiting verification` or `blocked`, identify exactly what is needed, and do not claim Angry Birds parity has been achieved.

If context or session limits interrupt execution, finish a safe checkpoint: record completed work, current failures, exact next action and commands; commit/push coherent task changes; clearly label the checkpoint incomplete. The next session must begin by safely pulling/fetching latest updates again, read this file and the ledger, reproduce the next unmet criterion, and resume without repeating completed work or replacing the plan. Never use an infinite shell loop or a timer as a substitute for active implementation and review.

Begin now: sync the repository, establish the current evidence, and execute Loop 1 through Loop 3 without waiting for another instruction between gates.
