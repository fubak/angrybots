# AngryBots: fresh review and next gauntlets

Reviewed 2026-09-20 at `1dc4a50881624791203a5672034c0e8ced83ba55`, main, https://github.com/fubak/angrybots.

## Verdict

The Planck rewrite is a useful foundation, but the current playable product is still a prototype. The separation of simulation, input, camera, rendering and saves is progress. The latest camera change keeps level structures in the aim view. Those improvements have not yet produced an integrated game with production-quality controls, visuals or sound.

Keep this architecture and finish its connections. Do not launch another engine rewrite or expand the level count before one complete level meets the quality bar. Use Angry Birds as a benchmark for readable characters, responsive slingshot interaction, satisfying destruction and coherent presentation, while keeping AngryBots' own assets and identity. Official visual reference: https://www.angrybirds.com/games/angry-birds-2/.

## Findings

1. **Blocking: normal dragging is reset by the update loop.** `src/app/App.ts:216` calls `syncLoadedBot()` every tick; `src/sling/SlingInput.ts:38` calls `setLoaded()` while aiming; `src/sling/SlingModel.ts:11` unconditionally resets the phase and pull. A held pointer loses its dragging state before release. An ordinary browser drag produced no visible shot. Fix the transition logic, then prove a sustained drag works through the real input path.
2. **Blocking: the aiming interaction has no visible sling or loaded bot.** The running build displayed blocks and green spheres, with an empty left side. `src/render/Renderer.ts:68` builds placeholder views from simulation entities; it does not present the loaded sling state. A player cannot identify what to grab. Add the loaded character, pouch, bands, queue and aiming feedback before evaluating shot feel.
3. **Pause leaks into navigation.** `src/app/App.ts:132` hides the pause menu when entering level selection, but neither that method nor `startLevel()` clears `paused` and `loop.paused`. Pause → Levels → select leaves the next level stopped. This path was exercised in the browser; toggling Pause subsequently allowed the scene to advance.
4. **Portrait recovery can deadlock, from source inspection.** `src/app/App.ts:188` pauses the loop when rotation is required. `src/core/FixedStepLoop.ts:57` then skips updates, including the rotation check needed to recover. Resizing only updates renderer size. Add a regression for entering portrait and returning to landscape on a coarse-pointer device.
5. **Touch cannot trigger abilities.** `src/sling/SlingInput.ts` returns immediately on pointer-down during flight. App exposes activation through Space, with no equivalent flight tap. Verify all bot abilities through each supported player input method.
6. **Audio is absent, not merely unpolished.** `src/audio/SoundBank.ts` is an explicit stub: preload immediately resolves, play is a no-op, and pause/resume do nothing. Volume controls do not establish working audio. Implement real assets, event routing, mixing and playback lifecycle.
7. **Visual systems are placeholders or disconnected.** `src/render/Renderer.ts:72` explicitly skips fragments. Loaded sling visuals, trajectory and shot-trail presentation are absent from the visible build; characters lack faces and animation. Blocks need material identity, correct shape silhouettes and readable damage. The current scene also has body margins, a scrollbar and sky visible beneath the ground slab.
8. **Campaign progression is incorrect.** `src/app/App.ts:141` unlocks a level if that same level is cleared, or its order is at most five. Clearing level five does not make uncleared level six selectable; reaching it through Next is insufficient if the player leaves before clearing it. Use predecessor progression and test reload persistence.
9. **Results are processed every tick.** `src/app/App.ts:198` repeatedly writes the result and shows the result panel while the state remains won/lost. Make result presentation and persistence transition-based and prove exactly-once awards/writes.
10. **Existing green checks overstate coverage.** `tests/e2e/win.spec.ts` launches through `window.__debug!.launch!` and accepts `won|bonus|lost`; a loss can pass. The pause test compares score while already aiming, which does not prove that moving bodies freeze or resume. The forbidden-pattern checker misses the non-null-assertion syntax in that debug mutation.
11. **The status ledger describes a previous implementation.** `docs/GAUNTLET_STATUS.md` points to `5face02`, reports 74 passing browser tests and references files removed by the rewrite. The current suite contains 14 configured browser cases. Re-audit every carried-forward verified claim against the current commit.
12. **Thirty files are not thirty authored levels.** `docs/specs/ISSUES.md` explicitly records that 25 extra layouts are duplicates, that visual baseline CI is absent, and that audio assets remain outstanding. Treat the five initial layouts as the working slice, with production polish still unverified.

## Verification

- Production build passed.
- Layout validation passed for all 30 level files; this establishes schema/layout checks, not unique content or player solvability.
- Unit/physics/performance run: 119 tests passed across 18 suites; the forbidden-checker test suite failed to import its module with `SyntaxError: Invalid or unexpected token`. Reproduced independently on this Windows environment. Direct `node --check` and `npm run lint:forbidden` passed, so investigate the test-module loading path rather than claiming that the script itself cannot parse.
- All 14 current browser tests passed against the confirmed AngryBots server on port 5181 (desktop and emulated phone landscape, 1.8 minutes). Their weak assertions described above remain a major limitation. The default configuration reused port 5173, which belonged to a different game; those initial timeouts are invalid evidence about AngryBots. Test-server identity and port isolation should become part of the harness.
- Current visual inspection covered desktop title, level selection, two levels, pause/navigation and a normal drag. Mobile lifecycle findings above are source findings, not a completed physical-device test. Production audio quality cannot be evaluated while playback is a stub.

## How to run the next loops

Run the following prompts in order. Each loop is an implementation task, not another planning exercise. Each iteration must reproduce a specific failure, make the smallest coherent change, test the real product path, inspect the result and record evidence at the current commit. Keep a durable ledger of remaining failures so another session can resume. Documentation, helper classes and passing isolated unit tests do not satisfy player-facing acceptance criteria.

Do not weaken assertions, add skips, replace missing features with stubs or use debug mutations to demonstrate player success. Read-only debug snapshots are acceptable for measurements. Keep simulation fixtures separate from acceptance tests. If a required device, asset or measurement is unavailable, record the exact missing evidence and do not mark the gate passed. Commit coherent completed changes; push only when authorized by the session's user. Do not deploy as part of these prompts.

## Loop 1 — Make the game reliably playable

### Copyable session prompt

Work on fubak/angrybots at the latest main. Read the repository instructions, existing production gauntlet and current specifications, then reconcile them with the live code. Preserve the Planck architecture. Execute a focused playable-game gauntlet until the acceptance criteria below pass, or report a concrete blocker with reproducible evidence. Do not spend this session expanding levels or redesigning the engine.

Start by reproducing the App/SlingInput/SlingModel drag reset at the current revision. Fix state synchronization so holding a drag across many simulation ticks preserves the pull. Render a clearly grabbable loaded bot, sling pouch and bands, and show the shot queue and usable aim feedback. Check that an ordinary release consumes exactly one bot and launches at the indicated position and velocity; cancel, pointer loss and tiny pulls consume none. Prevent pause/menu interaction from launching or activating abilities.

Fix pause → level selection → start, pause → restart, flight pause/resume, hidden-tab recovery and portrait → landscape recovery. Keep orientation recovery active while simulation is paused. Add flight-tap ability activation for touch, with single-use semantics for all bot roles. Correct next-level unlocking and reload persistence. Award and save a result once per transition.

Repair the forbidden-checker test import and strengthen its enforcement against real debug-mutation syntax. Replace the permissive win test with real pointer input, a definite win assertion and visible results. Add a definite loss test. Start tests against an isolated server with a verified app identity; never silently reuse an unrelated server. Update the old status ledger so historical checks cannot masquerade as current evidence.

Acceptance: desktop mouse and emulated touch can complete First Flight using only UI input. A 0.5–2 second held drag survives update ticks; changing pull visibly changes aim. Cancel/release/ammo/ability behavior is correct. Moving bodies actually freeze during pause and continue after resume. Navigation, retry, visibility and orientation transitions recover without an extra hidden action. Level six becomes selectable after clearing five, including after reload. Strict win/loss tests pass. Build, relevant unit/physics checks, level validation and these browser regressions pass without skips or relaxed assertions. Finish with commit-specific evidence and the remaining production gaps. Passing this loop means playable, not production-complete.

## Loop 2 — Finish one production-quality level

### Copyable session prompt

Work on fubak/angrybots after the playable-game gate passes. Execute a production-presentation gauntlet on First Flight plus one destruction-heavy validation level. Preserve the working physics and controls. Prioritize finished on-screen and audible behavior; do not expand campaign count or create another framework.

Establish a coherent original AngryBots art direction benchmarked against Angry Birds' legibility and finish. Replace live placeholder views with recognizable bot and target characters, expressive faces, idle/aim/flight/impact/defeat animation, clean silhouettes, consistent lighting and color, and attractive layered scenery. Complete sling deformation, queue handoff, trajectory, last-shot trail, impact feedback, readable damage stages and visible debris. Distinguish wood, glass, stone and explosives by appearance, break behavior and sound. Honor actual geometry types. Verify level switching cannot reuse stale shapes/materials merely because entity IDs match. Make camera framing, shot follow and impact response feel intentional. Remove scrolling, exposed page margins and ground-edge artifacts. Polish HUD, pause, win/loss and star/score presentation with a coherent hierarchy and responsive controls.

Replace SoundBank's no-op methods with real, licensed/original sound assets and actual event integration. Cover sling stretch/release, character launches/abilities, material impacts/breakage, explosions, enemy reactions/defeat, UI actions, victory/failure, music and ambience. Use variations, concurrency limits, impact-aware gain and separate music/effects/voice controls. Verify browser gesture unlock, mute persistence, pause/resume and background behavior. Listen to the resulting game; a manifest or a playback mock is not evidence of quality.

Each iteration must play the real launch → impact → destruction → result sequence, inspect screenshots/video, check the sound, and fix the weakest observable part. Validate desktop and phone landscape, reduced motion, missing/slow assets and repeated retries. Save visual baselines only after inspecting their quality. Measure frame timing in the actual gameplay scene and bound debris/particle/audio concurrency without hiding the intended effects.

Acceptance: the complete playable sequence has no visible placeholder primitives standing in for final characters, no silent stub events, no missing sling or destruction feedback, and no obstructed controls. Deliver before/after views of aim, flight, impact and results, a short gameplay capture, an audio coverage/listening report, measured performance with environment details, and passing Loop 1 regressions. Any listening or physical-device check that could not be performed remains explicitly unverified. Finish one convincing level before claiming presentation parity across the game.

## Loop 3 — Author and qualify the campaign

### Copyable session prompt

Work on fubak/angrybots after the playable and production-slice gates pass. Execute a campaign-and-release gauntlet using that finished slice as the minimum quality standard. Preserve its controls, physics, art and sound while replacing the 25 duplicate layouts with distinct authored challenges.

Give each level an intended skill, material/ability interaction, readable target arrangement, calibrated difficulty and achievable star thresholds. Establish a teaching sequence for all four bot roles, then combine them in later challenges. Reject renamed duplicates and cosmetic-only variations. Check idle stability, overlaps, reachable targets and meaningful alternate shots. Use the solver as design assistance, then replay a valid solution through real mouse/touch input; debug launches do not count as player-solvability evidence. Record per-level shot plans, expected outcomes, star ranges and failure conditions. Validate unlocks, retries, next-level flow and save migration throughout the campaign.

Build release checks around the shipping artifact: strict player-input win/loss/lifecycle tests, curated visual baselines, reliable asset loading, audio lifecycle, keyboard/focus behavior and readable accessible controls. Check phone landscape, desktop, portrait guidance/recovery, resize, background/resume and supported browsers. Exercise repeated level changes and retries to find resource leaks, stale renderer caches, duplicated listeners and growing audio/particle pools. Measure frame-time distribution, memory trend and load cost on named environments; do not extrapolate mobile readiness from a desktop synthetic benchmark. Include meaningful browser checks in the release gate and invalidate stale evidence after relevant changes.

Acceptance: 30 distinct authored levels, demonstrated player-input solutions, sensible difficulty/star progression, all bot abilities taught and usable, persistent progression, a consistent finished presentation, and passing integrated release checks. Provide a level coverage matrix and device/browser/performance report with exact commands, revision and evidence paths. Identify remaining physical-device, audio-listening or independent playtest gaps honestly. Do not call the game production-complete while any required gate lacks evidence.
