# Production gauntlet loop — AngryBots

This is the canonical execution prompt. Read it as an ongoing build-and-verify assignment, not a request for another plan.

## Mission

Finish AngryBots as an original, production-quality slingshot puzzle game matching the craft of Angry Birds Classic across game feel, physics, visuals, animation, sound, usability, progression, content, stability, and performance. Preserve the Grok bot identity and use original or appropriately licensed assets. Match the quality and clarity of the reference; do not copy proprietary assets or pretend numerical self-ratings establish parity.

Execute the work. Continue through implementation, validation, criticism, and revision until the completion gates below are met or a concrete external blocker prevents further progress. Obey user stop/pause instructions and the session's tool, safety, and resource limits. Do not use an infinite shell loop as a substitute for active model work.

## Read before changing code

1. Applicable AGENTS.md instructions and the current repository state.
2. docs/ANGRYBOTS_PARITY_BACKLOG.md — all 87 tasks remain the scope.
3. docs/FRESH_REVIEW_8f4aebe.md — review findings and reproduction guidance; revalidate against the current commit.
4. docs/ANGRY_BIRDS_TARGET.md and existing tests, scripts, package configuration, and CI.
5. Your current docs/GAUNTLET_STATUS.md if resuming.

This prompt supersedes the older wave-specific gauntlet/critic thresholds and POC completion criteria. The old requirement to keep destructible objects anchored until hit must not override correct support collapse. Static terrain is distinct from destructible structures. A debug-assisted automated PASS is not a release gate.

## Non-negotiable scope

- Complete all applicable backlog IDs A01–K10. Keep their original IDs and acceptance criteria visible.
- Deliver a finished three-level quality slice before multiplying content.
- Then deliver at least 30 deliberately authored levels across three visually distinct chapters, with at least four mechanically distinct bot types and a coherent progression.
- Do not substitute palette swaps, duplicate layouts, nominal abilities, or algorithmically copied levels for authored variety.
- Preserve a coherent original visual/audio identity while reaching the reference's readability, timing, personality, and polish.
- Keep the game functional without accounts, purchases, or external services unless the user separately requests those.
- Do not reduce scope to a POC, declare missing production assets optional, or call build success completion.
- Do not publish/deploy externally without authorization. Repository commits and pushes are authorized by the startup prompt; avoid force pushes, destructive resets, and staging unrelated work.

## Start with evidence

Inspect the working tree and remote; preserve unrelated changes. Record the starting commit, environment, and commands. Install dependencies and supported test browsers as needed. Run the production build, type checks, unit/integration tests, and browser tests. Inspect current screenshots and play with real input. Record actual failures separately from environmental setup failures.

Read failing tests before trusting their meaning. Existing weaknesses to remove first:
- The drag helper can use debugLaunchIntoFort when real dragging fails.
- A failure to win can be reduced to a soft-fail annotation.
- The victory assertion can match both a heading and its overlay.
- Canvas dimensions do not prove mobile playability.
- An anchored flag change does not prove physical displacement.
- Mobile emulation driven by mouse events does not verify touch.

Physics fixture tests may use controlled hooks. User-input end-to-end tests must not silently fall back to hooks. Keep those suites explicitly separate.

Revalidate and fix review findings R01–R10, especially portrait framing, pause/resume, complete level-state reset, non-bot target damage, support collapse, HUD state, initial overlaps, and leftover defeat visuals. Test any additional defect discovered.

## The loop

For each iteration:

1. OBSERVE: Read the status ledger. Run the relevant reproduction or play scenario against the current implementation. Distinguish an observed defect from an untested concern.
2. SELECT: Choose the highest-impact unmet requirement. Prefer a root cause that unlocks several criteria. Correctness and usable input precede polish; polish precedes content expansion.
3. DEFINE: State the backlog/review IDs, expected player behavior, failing condition, and measurable acceptance check. For visual/audio work, identify a concrete reference moment and what quality is missing.
4. IMPLEMENT: Make a cohesive fix or finish one production asset/system. Avoid unbounded unrelated refactoring. Replace workarounds that fight the intended mechanics.
5. VERIFY: Run focused tests, then relevant integration checks. Use actual browser interactions and screenshots for UI/visual changes. Listen to audio when judging sound. Check the production build where development hooks could conceal failures.
6. CRITIQUE: Judge the player-visible result. Look for regressions in adjacent systems and compare the same gameplay moment against the chosen Classic reference. No PASS from a builder summary alone.
7. RECORD: Update the ledger with the commit, changed IDs, commands, actual results, evidence paths, unresolved gaps, and next action.
8. CHECKPOINT: Commit cohesive verified changes. Push when authorized. If a check cannot run, label it unverified rather than implying success.
9. REPEAT: Proceed to the next unmet gate. Do not end merely because one subsystem, one shot, or one level works.

Use short progress updates describing evidence and next steps. Do not ask the user to approve routine implementation choices. Ask only for missing facts or an external action that actually blocks progress; continue independent work.

If repeatedly stuck on the same approach, isolate a minimal reproduction and revise the approach. Do not repeat unchanged tests or build a timed polling loop that accomplishes nothing. A context boundary is a checkpoint, not completion: preserve exact next steps for resumption.

## Gate 1 — trustworthy mechanics and lifecycle

Required:
- Honest continuous aiming, monotonic power under the full input mapping, accurate trajectory prediction, clear max pull and cancel behavior, no unpreviewed boost.
- Precise mouse and touch input; active-pointer handling, capture loss, secondary touch, cancellation, and orientation changes.
- Correct ammunition consumption, no extra launches, reliable win/loss, complete retry and level reset.
- Pause/background/resume preserves flight and resolving states; only an unlaunched aim may be cancelled.
- Real contact handling with tested direction/severity, shared materials, correct impulse coordinates, and no double damage.
- Stable initial structures without permanent pinning. Unsupported pieces fall; collision chains propagate; pigs respond to bot, block, crush/fall, explosion, and out-of-play rules.
- Robust fast-projectile contacts, planar motion, queued removals/explosions, once-only TNT, and finite zero-distance behavior.
- Resolution waits for meaningful scene activity with a bounded safety fallback. No frozen live action or premature result.
- HUD reflects state, score, and shots immediately.

Evidence: deterministic scenario tests for each mechanic; real-input win/loss/retry flows; a 20-point pull sweep and preview/live comparison; all R01–R10 resolved or explicitly disproven with evidence. Verify both 30/60/120 Hz behavior where supported and representative frame stalls.

## Gate 2 — finished three-level quality slice

The three levels must demonstrate precision/support removal, material/ability choice, and chain reactions. Each must be solvable with intended rules and have documented star-score solutions.

Visuals:
- Approved-in-context art specification: silhouette language, palette, shading, typography, texture scale, asset rules, and reference frames.
- Continuous ground cross-section aligned to colliders; no sky below an invisible edge-on ground.
- Composed soft/parallax backgrounds, controlled contrast, readable targets and obstacles.
- Finished bot, targets, sling/pouch/bands, material kit, damage states, environment props, menus, HUD, and result screens.
- No primitive placeholder art or unrelated asset styles in the finished slice.
- Expressive idle/aim/flight/impact/defeat/celebration animation with coordinated timing.
- Material-specific debris and restrained impact emphasis. No hovering defeated characters, opacity coupling, or particles hiding the action.

Audio:
- Audition and improve existing synthesized cues; add authored/sample-based assets where they produce better results.
- Distinct sling tension/cancel/release, bot voices, material impacts/breaks, target reactions/defeat, TNT, UI, scoring/stars, win/loss, music, and ambience.
- Variations, mix buses, voice budgets/priorities, headroom, persistent volume/mute settings, clean unlock/resume, and silent-mode support.
- Listen through headphones and phone speakers. Do not pass audio from source code or an event counter.

Camera/UI:
- Level reveal, stable aim, useful follow, readable impact/destruction, and smooth return.
- Deliberate pan/zoom without accidental launch.
- Usable 390×844, 844×390, 768×1024, 1280×720, and 1920×1080 framing and safe-area layout.
- Menus, results, retry/next/selection, settings, tutorial, keyboard navigation, alternate aim/fire, contrast, and reduced-motion support.
- Validate that the sling and intended targets are actually visible/reachable; a correctly sized canvas is insufficient.

Evidence: comparable ready/aim/impact/collapse/result screenshots and gameplay recordings, listening notes, all three complete playthroughs, mobile interaction evidence, and outstanding perceptual gaps. Finish asset work; do not merely create an asset wish list.

## Gate 3 — complete game content and progression

- At least 30 authored levels, three themes/chapters, four genuinely distinct bot abilities.
- Levels vary range, elevation, structure silhouette, material combinations, target protection, and strategy.
- Tutorials introduce each ability and mechanic before difficult combinations.
- Level queues, geometry, theme, bounds, thresholds, and progression are data-driven.
- One validated winning solution per level; three-star attainability recorded; multiple strategies demonstrated on representative advanced levels.
- No invalid overlaps, arbitrary luck requirements, viewport-specific solutions, or unexplained physics exploits.
- Scoring avoids duplicate awards; results account for actual destruction and unused bots.
- Versioned, validated saves preserve stars, best scores, unlocks, and settings. Corrupt/unavailable storage degrades gracefully.
- Full navigation works, including replaying earlier levels, retrying failure, advancing, returning later, and finishing the final level.

## Gate 4 — production reliability and performance

- Strict type checking, meaningful unit/integration tests, real-input browser tests, and CI.
- Test production assets/routes and deployment base paths; account for missing assets, unavailable audio/storage, and context loss.
- Clean disposal/reset; bounded debris/particles/audio; no accumulating listeners or contact caches.
- Profile the worst cascade and a 15-minute session including at least 20 retries.
- Record the actual desktop and midrange phone used. Target stable 60 fps, with proposed normal-play p95 frame time at or below 20 ms; document heavy-cascade results separately.
- Target first playable within five seconds on a documented 10 Mbps cold-cache profile.
- Adaptive visual quality must not change gameplay outcomes.
- No uncaught errors or game-breaking defects in the required paths.

Do not invent hardware results or claim device parity from desktop emulation. If real hardware is unavailable, finish everything independently verifiable and leave that gate explicitly awaiting device evidence.

## Gate 5 — independent production-quality assessment

Use a consistent Angry Birds Classic reference for comparable play moments; record the reference source and test setup. Evaluate:
1. Aim precision and responsiveness.
2. Predictable impact, support collapse, and chain reactions.
3. Character readability and personality.
4. Art cohesion, composition, and material clarity.
5. Animation timing and effects.
6. Audio identity, synchronization, and mix.
7. Camera storytelling and comfort.
8. UI, tutorial, accessibility, and mobile usability.
9. Puzzle variety, progression, and replay motivation.
10. Stability, loading, and performance.

For each, report concrete evidence, remaining gap, and reviewer confidence. A 1–10 rubric can organize feedback but cannot replace judgment or hard gates. An average must never hide a failing dimension.

Have a separate reviewer or human evaluate the actual build when available. Prefer unfamiliar-player testing: at least four of five should complete the tutorial without verbal assistance; record confusion and accidental launches. If independent human/audio/device review is unavailable, mark the relevant gate awaiting verification. Never fabricate a critic, listening session, preference result, screenshot, or test run.

Do not stop implementation for subjective review until the build and evidence are concrete and reviewable.

## Status ledger and completion contract

Create/update docs/GAUNTLET_STATUS.md with:
- Current commit, environment, milestone, and overall state.
- One row for every original backlog ID: not started / in progress / implemented-unverified / verified / blocked.
- Implementation location, exact verification, evidence path, and remaining gap for each row.
- R01–R10 status and regressions.
- Current commands, test counts/failures, reference comparisons, and device/audio/human evidence.
- Next three actions and exact resume instructions.

Keep full technical QA records out of the production player UI. Prefer repository docs and CI artifacts. Retire stale PASS claims rather than perpetuating them.

Completion is allowed only when all five gates pass and all release requirements have evidence. If external validation is the only remaining blocker, report "implementation ready; verification pending" with the exact missing action. If still building, report "in progress." Never rename either state "complete."

Final delivery: tested commit and branch, run/build instructions, implemented scope, evidence links, test/device/audio results, and an honest list of limitations. Commit and push authorized project changes; do not include generated dependency folders, private data, unrelated files, or bulky transient test captures.
