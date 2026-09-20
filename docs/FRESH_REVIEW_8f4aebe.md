# AngryBots fresh review — 8f4aebe

Baseline reviewed: https://github.com/fubak/angrybots/commit/8f4aebe
Compared with plan commit: 5e3cca0
Purpose: Review only; no implementation changes.

## Verdict

The implementation makes meaningful progress on the prototype, but does not complete the 87-task plan or reach Angry Birds Classic quality. It has a working desktop success path, three small levels, results and progression, and improved collision plumbing. The quality slice still fails fundamental mobile, lifecycle, physics, visual, and verification criteria.

The repository's public/progress.json explicitly says "full parity backlog not complete" and lists art, audio, content, camera, and human/device QA as remaining. Its "physics-destruction: done/PASS" and overall automated PASS should not be accepted as evidence that those areas meet the plan.

## Verification

- Fresh pull of origin/main at 8f4aebe.
- Production build passed, with a roughly 701 kB minified JavaScript chunk warning (181 kB gzip). This warning alone does not establish poor performance.
- All four unit tests passed. Coverage is limited to two scoring cases, one launch-curve case, and a mocked absolute-value contact calculation.
- Browser suite: four passed, two failed in 2.2 minutes against the fresh server. Desktop and mobile victory checks both failed because the heading/overlay locator matched two elements after victory appeared. This is a test defect, not proof the game failed to win. The initial attempt needed the matching Playwright Chromium installation; the result above is the completed rerun.
- Manual desktop input cleared Training Yard, displayed three stars and a score, and advanced to Glass Arch.
- Manual 390×844 inspection reproduced an empty playable view: both sling and structure were off-screen.
- Manual pause during an active shot returned the projectile to the sling on Resume.
- Visual review confirms the old hills/clouds/ground/character presentation remains substantially unchanged.
- Audio source is unchanged from the prior review; no auditory parity claim is made.
- No real-phone performance, long-session memory, full 3-level solvability, or exhaustive input matrix was completed.

## Findings requiring fixes

### R01 — High: portrait framing fix is overwritten every frame
Game.viewportMetrics uses PORTRAIT_FRUSTUM_HEIGHT and onResize updates the orthographic bounds. CameraRig still captures SIDE_VIEW.frustumHeight in its constructor and rewrites those bounds during every update. The mobile change therefore does not persist. Directly reproduced at 390×844.
Locations: src/Game.ts:424, src/systems/CameraRig.ts:36 and :117.
Fix: one authoritative responsive framing calculation shared by the camera and resize path. Test visible world targets, not just canvas width.
Backlog: D01–D05.

### R02 — High: pause destroys the active shot state
pauseGame calls sling.resetPull, changing phase to ready. resumeGame then checks whether that phase is flying, which it no longer can be, and resumes ready. The next tick makes the projectile kinematic and puts it on the perch. The launchedThisShot flag is not consistently reset by this path, so later launches can also skip initialization. Visibility-triggered pause shares this defect.
Locations: src/Game.ts:444–456, :935–990; src/systems/SlingSystem.ts:470.
Fix: preserve the pre-pause state and projectile state; only cancel unlaunched aiming. Resume the same flight/resolution. Test pausing ready, aiming, coiling, flying, resolving, and app background/resume.
Backlog: A01, A05, A07.

### R03 — High: debris/block contacts still cannot damage pigs
ContactSystem invokes onPigStrike only when botHit is true. It may wake a pig after a block strike, but waking is not damage. There is no pig health model or ground-impact damage path. A pig can survive a heavy collapse; Glass Arch specifically tells players to drop the roof pig, but dropping alone is not a valid defeat mechanism.
Location: src/game/ContactSystem.ts:109.
Fix: apply impact/crush/fall damage independently of whether the bot participates, with tested thresholds and readable health states.
Backlog: B08, I04, I06.

### R04 — High: unsupported pieces remain fixed in space
Block.lockPhysics and Pig.lockPhysics turn objects static; pinIfAnchored restores their transforms. Waking is contact/proximity-driven, not support-driven. Removing a supporting beam does not automatically make an untouched roof or pig fall. New fragments are not recognized as Block/Pig objects by ContactSystem's chain-wake logic either.
Locations: src/entities/Block.ts:82–110; src/entities/Pig.ts:119–147; src/game/ContactSystem.ts:88–106.
Fix: stable dynamic stacks with sleeping, or a tested support-release system. Verify support removal without a direct strike or blast on the supported object.
Backlog: B04, B06, B07.

### R05 — High: test suite can conceal failed gameplay
The input helper falls back to debugLaunchIntoFort when a drag fails to start a flight. The three-shot victory test records a soft-fail and passes a number-type assertion when the level is not cleared. The mobile project uses mouse drags and checks canvas dimensions, not touch accuracy or framing. A block changing from anchored to unanchored is accepted as motion even without displacement.
Locations: tests/e2e/gauntlet.spec.ts:59–62, :81–94, :146–151, :155–170.
Fix: keep physics fixtures separate from user-input tests. Remove debug fallback from real interaction tests, require actual victory where claimed, require actual motion, assert target visibility, and test real touch input. Use hard failures for unmet acceptance criteria.
Backlog: K01–K05.

### R06 — Medium: victory assertion fails when victory appears
The test combines the Victory heading with its parent overlay using locator.or. Both are visible after a successful win, producing a strict-mode violation. This was reproduced in the fresh desktop run; it is a test defect, not evidence the game failed to win.
Location: tests/e2e/gauntlet.spec.ts:141.
Fix: assert one unambiguous victory heading, then assert game state/score separately.

### R07 — High: changing levels does not fully reset shot lifecycle
loadLevel resets level/score/ammunition but does not reset launchedThisShot, flightTimer, settledTimer, resolveTimer, or flight peak history. Opening level select from a paused active shot and selecting a level can retain the old launch flag while resetting the bot. The next launch may skip its impulse/ammunition initialization.
Location: src/Game.ts:369–407, :972.
Fix: a single complete new-level/reset routine with lifecycle invariants and a regression test for level selection during flight.
Backlog: A05.

### R08 — Medium: HUD does not track normal shot transitions
updateHud runs on level load, pig kills, reset, and results, but not ordinary aim, launch, or pause transitions. Manual flight still displayed "Pull the Grok bot" and unchanged pips until a later event. Block-only destruction also does not update the displayed score immediately.
Locations: src/Game.ts:847, :909–919, :972–997.
Fix: event-driven HUD updates for each state, ammo, and score change.
Backlog: A06, H01, H03.

### R09 — Medium: level geometry still intersects targets
Training Yard's lower pig center is 1.32 with radius 0.55, so its bottom is 0.77, below the deck top of 1.13. The upper pig at 2.72 intersects the lintel and roof cap. Glass Arch's pig bottom is 2.80 while the roof top is 3.225. Static pinning hides these invalid placements rather than resolving them.
Locations: src/levels/level1.ts; src/levels/level2.ts; src/entities/Pig.ts (radius).
Fix: author collision-aware layouts and run overlap/stability validation before balancing.
Backlog: B12, I06–I07.

### R10 — Medium: defeated pigs leave permanent floating remnants
The defeat animation ends by setting a small nonzero scale and never hiding/removing the group. This was visible behind the victory panel as tiny suspended pigs. Their bodies have already been removed, so the visual remains unsupported.
Location: src/entities/Pig.ts:213–218.
Fix: complete the pop by hiding/removing the group, or explicitly design a short-lived grounded remnant.
Backlog: F01, F03, F06.

## Quality against the requested benchmark

| Area | Current assessment | Remaining work |
|---|---|---|
| Rules/UI | Partial improvement | Correct pause/reset; accurate live HUD; settings; stronger lifecycle tests |
| Physics | Improved event/material plumbing; incomplete behavior | Support collapse, non-bot pig damage, valid geometry, robust fast contacts, repeatability |
| Slingshot | Simplified scalar speed curve and pointercancel handling | Validate the entire input mapping, preview parity, gesture handling, previous-shot trail |
| Camera/mobile | Fails portrait playability | Shared responsive framing, pan/zoom, level reveal, impact/destruction framing |
| Visuals | Prototype | Ground cross-section, cohesive assets, softer backgrounds, readable characters/materials, lighting/composition |
| Animation/effects | More debris and pig animation | Clean defeat completion, authored material effects, personality, timing, performance budgets |
| Audio | Existing synthesized implementation unchanged | Cue coverage, character voices, music/ambience, mix buses/settings, variations, listening review |
| Content/progression | Three similar small levels and stars | Distinct abilities, tutorial progression, authored challenge variety, proven solutions/star thresholds, planned release content |
| Engineering/QA | Build, four unit tests, CI/browser scaffolding | Reliable assertions, lifecycle/physics tests, visual regressions, production smoke, strict types, real-device/performance/human checks |

Positive changes to retain: real collide subscriptions; shared entity materials; centered impulses; deferred removals; once-only TNT guard and removal of the double explosion call; active-pointer cancellation; scoring/save scaffolding; level registry; title/results/selection screens; per-particle material independence; pig resource disposal.

Do not equate a monotonic helper test with a monotonic user experience. SlingSystem still applies releaseSnapMul while previewLaunchImpulse explicitly forces it to one, so preview-versus-release behavior still needs a real trajectory test. Plane enforcement currently repairs transforms after stepping rather than constraining all motion at solver level.

## Recommended next execution order

1. Repair test validity (R05/R06), then add regressions for the reproduced bugs.
2. Fix camera and lifecycle (R01/R02/R07/R08).
3. Fix physics semantics and geometry (R03/R04/R09), then prove all three levels can be won through intended mechanics.
4. Complete the visual/animation/audio quality slice, including R10 and actual listening.
5. Validate on a real phone, profile the worst collapse, and conduct comparison playtests.
6. Expand abilities and levels only after that slice passes.

Do not mark the previous plan complete. Continue it with evidence per task and retain the distinction between a functional prototype, a polished three-level slice, and the proposed complete release.
