# AngryBots — Angry Birds Classic quality backlog

Repository: https://github.com/fubak/angrybots
Reviewed baseline: 726725abb3d95263780853bdf4c457c7f157707a
Review date: September 19, 2026
Purpose: Execution handoff for another model. This replaces the earlier five-item review with the full product-quality backlog. No gameplay implementation was changed in this review.

## Target and scope

Build an original, polished slingshot physics puzzle game with the clarity, responsiveness, character, sound, destruction, and replay motivation associated with Angry Birds Classic. Preserve the Grok bot identity. Use a cohesive original cartoon presentation and original or appropriately sourced assets. Three.js can remain the renderer; primitive geometry is not the visual quality target.

Use Classic as the reference, not Angry Birds 2's monetization and live-service systems. Reference material:
- Official Classic overview: https://www.angrybirds.com/games/rovio-classics-angry-birds/
- Classic launch and three-star achievements: https://www.rovio.com/articles/a-classic-returns-rovio-classics-angry-birds-launches-today/
- Controls, cancelling pulls, and zoom interactions: https://www.rovio.com/articles/bringing-back-2012-dev-diary-1/

The repository's docs/ANGRY_BIRDS_TARGET.md currently excludes map UI, stars, and a roster. Replace those POC exclusions for this project. Three shots is the current training-level rule, not a universal rule for every future level; shot queues should be level data.

Distinguish two milestones:
1. Quality slice: three representative levels with finished mechanics, art, animation, audio, and results.
2. Complete first release: proposed minimum 30 intentionally authored levels, three visually distinct chapters, and at least four mechanically distinct bot types.

Those content counts and all numerical acceptance targets below are proposed project requirements, not claims about Angry Birds' internal specifications. Passing a three-level slice does not establish full-game content parity.

## Evidence and present assessment

Reviewed source, configuration, level data, effects/audio implementation, and existing QA documents. The production build passed in the preceding analysis. A runtime check of cannon-es confirmed that collisionStart never fires, while beginContact and body collide do.

Direct browser inspection at 1280×720 showed:
- Faceted triangular hills dominate the frame; faceted clouds and dark primitive characters read as prototype art.
- The horizontal ground plane is almost edge-on. Sky remains visible below the playfield, weakening the sense of a continuous physical world.
- Wood, pigs, and TNT exist, but small-scale silhouettes, overlaps, shading, and composition need redesign.
- A large dark information card dominates the upper-left corner.
- One manual drag successfully cleared the three pigs and left a "Cleared" label without a results/retry/next-level screen. This proves a success path exists, not that physics is correct.
- At 390×844 the sling and castle are both off-screen.

Audio was inspected in source, not auditioned. It has synthesized launch, impact, break, explosion, pig-pop, and victory cues. Do not describe these as having passed a listening comparison. No full device-performance or exhaustive playthrough claim is made.

Priority definitions: P0 = foundational correctness/playability; P1 = necessary for the quality slice; P2 = necessary for a complete first release. P2 does not mean optional polish.

## A. Game rules and lifecycle — P0

- [ ] A01: Introduce explicit loading, ready, aiming, flying, resolving, won, lost, and paused states. Input availability must derive from state and ammunition. Avoid scattering state transitions across rendering and collision code.
- [ ] A02: Consume ammunition exactly once at launch. Never allow a fourth shot in a three-shot level. The present last-shot branch resets to ready with zero ammunition; fix both the state transition and input guard.
- [ ] A03: Resolve the whole scene before declaring failure or loading the next projectile. Track meaningful motion, pending damage, explosions, and sleeping bodies. Replace the projectile-only 5.5-second cutoff as the primary completion rule; retain a documented safety timeout.
- [ ] A04: Evaluate win/loss after queued damage is applied. A last-shot chain reaction must be able to win. Emit win, loss, scoring, and cleanup events exactly once.
- [ ] A05: Implement retry, next level, pause/resume, and return to level selection. Retry fully resets physics, score, camera, queue, particles, timers, audio, and input.
- [ ] A06: Update HUD on state changes. Currently phase text remains stale during a shot, and later innerHTML updates can remove the separately appended victory banner. Render persistent results through explicit state.
- [ ] A07: Pause simulation and relevant audio on focus/visibility loss. Cancel an interrupted drag safely. Resume without an unexpected launch, time jump, or explosive backlog.

Acceptance: Complete win, loss, retry, and pause paths by mouse and touch. Attempt extra shots after win and after ammunition exhaustion; none launch. Repeat 20 retries without accumulating entities, listeners, or audio.

Primary files: src/Game.ts, src/main.ts, src/systems/SlingSystem.ts.

## B. Physics, damage, and destruction — P0

- [ ] B01: Replace the nonexistent world collisionStart subscription. Body collide events expose a contact equation; world beginContact alone does not supply the same payload. Normalize real contacts into a tested damage/event system.
- [ ] B02: Correctly measure incoming impact severity, including contact-normal sign. The current handler assumes negative relative velocity means an incoming hit; verify Cannon's actual convention with approaching/receding tests. Do not simply rename the event.
- [ ] B03: Share actual Cannon material instances across entities and the ground. Names do not establish identity. Remove newly created, unassigned grok/pig materials from contact setup and test all material pairs.
- [ ] B04: Replace indefinite transform pinning with stable initial construction, a settling phase, and appropriate sleeping/waking. Unsupported pieces must fall; debris must move other pieces. Keep genuinely fixed terrain separate from destructible structures.
- [ ] B05: Constrain simulation to the gameplay plane: XY translation and Z rotation. Current bodies have no planar factors. Visual depth must not let objects escape contacts or obscure targets.
- [ ] B06: Use fixed-step simulation with appropriate substeps and swept collision or equivalent protection for fast projectiles. Test full-power hits against the thinnest glass and rotated beams. Replace the anchored-only, axis-aligned overlap workaround once real collision coverage is reliable.
- [ ] B07: Use one damage rule per physical interaction; prevent body callbacks, overlap helpers, and explosions from counting a hit twice. Do not inject arbitrary momentum on every repeated contact.
- [ ] B08: Give targets health/damage states. Allow direct hits, falling blocks, crushing/impact contacts, explosions, and leaving the play area to defeat them. Weight classes/armor should be readable when introduced.
- [ ] B09: Differentiate wood, glass, and stone by mass, friction, break thresholds, damage resistance, and debris. Base tuning on repeatable scenarios, not special cases that only pass one scripted shot.
- [ ] B10: Make TNT a controlled, once-only queued chain reaction. Separate blast damage and impulse, use or remove the unused blastDamage setting, handle zero-distance vectors, and avoid recursive contact mutation.
- [ ] B11: Fix impulse application coordinates. Cannon applyImpulse expects a relative point; current blast/chain calls pass world position. Use zero for center-of-mass force or a correctly computed contact offset.
- [ ] B12: Author valid initial structures. Audit overlaps: the lower pig centers currently sit at the deck's top height, embedding their spheres; the upper pig overlaps the roof cap. Fix geometry rather than relying on pinning to conceal it.
- [ ] B13: Separate cosmetic randomness from simulation. Record level ID, input, fixed-step timing, and seed for repeatable investigations. Require stable outcomes within stated tolerance, not impossible guarantees of identical floating-point behavior across every browser.

Acceptance: Automated scenarios cover support removal, block-to-block propagation, falling-block pig kills, material differences, TNT chaining, zero-distance blasts, and maximum-speed contacts. Identical controlled inputs reproduce outcomes on the same runtime. No startup collapse, hovering unsupported pieces, persistent jitter, or explosive interpenetration.

Primary files: src/systems/PhysicsWorld.ts, src/entities/Block.ts, src/entities/Pig.ts, src/Game.ts, src/levels/level1.ts.

## C. Slingshot and aiming — P0/P1

- [ ] C01: Establish one understandable pull-to-launch relationship: pull opposite the desired flight direction, with a smooth monotonic power curve and a clear maximum stretch.
- [ ] C02: Remove unexplained quarter/half/deep-drag tiers and threshold discontinuities. The present SlingSystem/config contain many viewport-dependent caps and boosts. More pull at a fixed angle should not unexpectedly produce less launch speed.
- [ ] C03: Normalize input across aspect ratios and devices. Track the active pointer ID; separate bird grabbing from camera panning and pinch zoom. Handle secondary touches, pointer capture loss, release outside the canvas, pointercancel, and rotation. *(partial: active pointer + secondary ignore + cancel/capture loss e2e; pan/zoom open)*
- [x] C04: Cancel when returned near the perch or interrupted. pointercancel currently invokes the release path; it must not fire the projectile. *(pointercancel + sub-min pull release; e2e `sling-cancel.spec.ts`)*
- [ ] C05: Make trajectory prediction use the same launch position, velocity, damping, gravity, and stepping convention as live motion. Eliminate unpreviewed release boosts or show them honestly. Define whether the preview ends at the first predicted obstruction.
- [ ] C06: Add a clear pouch and readable front/back sling bands, continuous tension feedback, a restrained release recoil, and a visible ready-projectile queue. Use intentional timing rather than a delayed/unresponsive release.
- [ ] C07: Add a fading previous-shot trail to support learning. Provide subtle first-use guidance and an unobstructed aiming area.
- [ ] C08: Measure input feel at 30, 60, and 120 Hz. Do not estimate drag velocity using a constant 1/60 for every pointer event. *(partial: `pointerDeltaSeconds` + `pointer-timing.test.ts`; no device Hz soak)*

Acceptance: A 20-point pull sweep has monotonic speed at fixed direction; small angle changes produce small trajectory changes. Preview and live pre-contact trajectory stay within a proposed quarter-projectile-radius tolerance under controlled stepping. Touch cancellation consumes no shot. Expert and first-time users can make precise adjustments.

## D. Camera, composition, and mobile — P0/P1

- [ ] D01: Fit camera bounds to level geometry, pull envelope, and UI safe areas. In portrait, provide an overview plus a usable aim framing/pan model, or another deliberately designed layout. Tiny all-world scaling alone is insufficient.
- [ ] D02: Implement level reveal, stable aim framing, projectile lead, impact framing, destruction hold, and a smooth return to the sling. Keep meaningful action visible instead of following only the projectile.
- [ ] D03: Clamp camera bounds and avoid background edges, clipped roofs, lost projectiles, excessive shake, or zoom that interferes with aiming.
- [ ] D04: Support deliberate pan/zoom with distinct gestures that never accidentally launch. Restore useful framing after inspection.
- [ ] D05: Reflow controls for phone portrait, phone landscape, tablet, and desktop. Respect safe-area insets and aim for at least 44 CSS-pixel touch targets.

Acceptance: Verify 390×844, 844×390, 768×1024, 1280×720, and 1920×1080. The player can see what to grab, inspect targets, aim, follow the result, and retry without hidden controls. Test live orientation changes during aiming and flight.

Primary files: src/systems/CameraRig.ts, src/Game.ts, src/style.css.

## E. Art direction and asset production — P1

- [ ] E01: Produce a short art specification and representative finished frame before mass-producing assets: palette, silhouette language, line/edge treatment, shading, texture scale, UI typography, and lighting.
- [ ] E02: Replace the edge-on terrain with a continuous illustrated ground cross-section: grass rim, earth body, readable surface contact, and decorative foreground details. Align visible surfaces with colliders.
- [ ] E03: Replace dominant triangular hills and faceted clouds with composed, softer background layers. Reduce background contrast and detail so targets, beams, and the bot remain the focal points.
- [ ] E04: Rework the Grok bot into a recognizable character at actual gameplay size: strong silhouette, readable eyes, expressive face, controlled highlights, and consistent proportions. The current dark sphere loses detail.
- [ ] E05: Improve target faces, silhouettes, damage appearance, and placement. Resolve mesh overlap and strange shading so damage states are understandable at phone scale. *(partial: pig silhouette rim + eye contrast)*
- [ ] E06: Create a coherent material kit: proportioned wooden beams/end grain, stone blocks, glass edges/cracks, and unmistakable explosive crates. Include healthy, damaged, and breaking states. Avoid uniform texture stamps and generic color changes as the whole damage language. *(partial: tiled wood + procedural stone/glass/TNT surfaces)*
- [ ] E07: Build a polished slingshot/pouch, bot queue, terrain props, and chapter themes. Ensure these share the same art style rather than mixing realistic tiles with primitive low-poly props.
- [ ] E08: Tune lighting, color management, contact shadows, and contrast. Keep the cartoon image bright and legible; avoid crushed black faces and shadows that obscure expressions. *(partial: hemi/sun/fill + exposure pass)*
- [ ] E09: Establish an asset manifest, consistent dimensions, naming, source/license records, compression, and caching. Use sprites/atlases or stylized meshes where appropriate; choose by final appearance and performance.

Acceptance: Review idle, aiming, impact, destruction, and results frames at native desktop and phone sizes. Identify every material and character without zooming. No visible prototype assets, accidental seams, clipping, stretched textures, or mismatched styles in the quality slice.

## F. Animation and effects — P1

- [ ] F01: Implement character anticipation, idle blinks, eye tracking, tension, launch, flight, impact, dizziness, defeat, and celebration. Targets should react to incoming danger and neighboring destruction.
- [ ] F02: Coordinate pouch motion, stretch, release sound, projectile acceleration, trail, impact, debris, and scoring on a shared event timeline. Animation must not alter collision size invisibly.
- [ ] F03: Give materials distinct destruction: wood splinters, glass shards, stone chips/dust, and TNT flash/smoke/pressure burst. Direction and strength should reflect the hit.
- [ ] F04: Fix particle opacity coupling: JuiceSystem shares a material per color but mutates its opacity for each particle. Use per-instance attributes or another bounded per-particle strategy.
- [ ] F05: Budget and pool effects. Keep visual debris separate from gameplay debris where appropriate; preserve readable gameplay during cascades.
- [ ] F06: Add restrained impact emphasis, score popups, target-pop punctuation, projectile queue transitions, and a sustained victory sequence. Expose reduced-motion and shake settings.

Acceptance: Effects explain cause and consequence without hiding the next target or stalling the game. Multiple simultaneous bursts fade independently. No full-strength shake for trivial contacts.

## G. Sound and music — P1

- [ ] G01: Define an audio palette and cue list. Audition the existing synthesized effects before deciding which to retain; evaluate character and material identity, not merely whether a cue plays.
- [ ] G02: Add sling grab, tension/creak, cancel, snap, flight, ground bounce, and bot voice cues. Tension should vary smoothly with pull. *(partial: `slingCancel` + bucketed `slingTension`; listen unverified)*
- [ ] G03: Supply distinct light/heavy impact, scrape, crack, and break variations for wood/glass/stone; add TNT ignition/explosion/tail. Use several variations with restrained random pitch and volume.
- [ ] G04: Add target idle/reaction/damage/defeat voices and bot anticipation/impact/celebration. Character sounds should create personality rather than reading as interchangeable beeps.
- [ ] G05: Add appropriate menu/game ambience, optional music, button feedback, scoring ticks, star reveals, victory, and defeat cues.
- [ ] G06: Create master/music/effects/voice buses, persistent controls, headroom, voice limits, prioritization, and selective ducking. Replace the global impact throttle with a policy that preserves important concurrent events.
- [ ] G07: Avoid the current duplicate TNT explosion route: breakBlock(explosive) invokes explosion and detonateExplosive invokes it again. One event should deliberately own the mix.
- [ ] G08: Preload/cache reusable buffers, unlock on a user gesture, handle resume failures and tab suspension, and dispose completed nodes. Gameplay must work with sound disabled.

Acceptance: Audition on phone speakers and headphones. Critical sounds coincide with visuals; a dense collapse does not clip or become an undifferentiated roar. Volume controls persist. Test cold start, mute, background/resume, and repeated replay. Listening review is mandatory; screenshots and code inspection cannot pass this section.

Primary file: src/systems/AudioSystem.ts.

## H. Scoring, progression, and interface — P1/P2

- [ ] H01: Add score rules for targets, destruction, and unused bots; prevent duplicate awards. Delay final accounting until meaningful destruction is complete.
- [ ] H02: Implement authored one/two/three-star thresholds per level, high scores, and a transparent results breakdown. Balance thresholds using recorded solutions.
- [ ] H03: Replace the developer card with a compact game HUD: level, score, bot queue, pause, and retry. Move progress.html and development status out of the production player journey.
- [ ] H04: Add title screen, chapter/level selection, pause/settings, victory, defeat, and credits. Results need clear replay/next/menu actions and satisfying animated feedback.
- [ ] H05: Persist unlocks, best scores, stars, and preferences with versioned saves. Handle unavailable/corrupt storage gracefully and expose reset-progress separately from retry.
- [ ] H06: Teach grabbing, releasing, cancelling, material differences, and abilities through short interactive levels and contextual hints.
- [ ] H07: Add keyboard-operable menus, focus visibility, labels, readable contrast, non-color-only status indicators, and a usable alternative aim/fire control. Respect reduced motion and sound preferences.

Acceptance: A first-time player can start, learn, win/lose, retry, advance, quit, and return with progress intact. No external developer instructions are needed to understand the loop.

## I. Bot abilities and level design — P1/P2

- [ ] I01: Make level geometry, bot queue, target variants, theme, camera bounds, scoring thresholds, and unlock requirements data-driven.
- [ ] I02: Build four distinct bot roles as a proposed release baseline: standard impact, dash/piercing, split/multiple projectiles, and explosive/heavy. Give abilities clear timing, feedback, and limits. *(partial: registry + mass/speed/visual queue on slice; split projectile **open**)*
- [ ] I03: Separate launch, camera, and ability gestures. Ability activation is available only at valid times and exactly once where appropriate. Add trajectory/physics tests for spawned projectiles.
- [ ] I04: Author three benchmark levels first: precise support removal, material/ability choice, and multi-stage chain reaction. Include at least two viable strategies in representative advanced levels.
- [ ] I05: Expand to the proposed 30-level/three-chapter release after slice acceptance. Introduce concepts gradually, combine them deliberately, and vary silhouettes, terrain, range, elevation, and target protection.
- [ ] I06: Validate each level's starting stability, solvability, shot budget, score thresholds, and phone readability. Maintain at least one saved winning input sequence per level and evidence for three-star attainability.
- [ ] I07: Add practical authoring tools: quick reload, collider/center-of-mass view, spawn-overlap checks, damage inspection, and replay capture. These may be developer tools rather than a public level editor.

Acceptance: Success rewards deliberate aim and structural reasoning. Avoid levels that require unexplained collision quirks, a single lucky random bounce, or a specific viewport. New bot types must create distinct decisions, not only cosmetic variation.

## J. Performance and engineering — P1/P2

- [ ] J01: Split Game.ts responsibilities into level lifecycle, rules/state, damage/events, scoring, presentation, and HUD as needed. Keep rendering from deciding game rules. Avoid a broad engine rewrite without a measured need.
- [ ] J02: Centralize material/physics/input configuration and remove stale constants and unused scaffolding/dependencies. Enable TypeScript strict checking and resolve findings.
- [ ] J03: Implement complete disposal of scene objects, materials, textures, listeners, physics bodies, and audio resources. Pig.dispose currently removes objects without disposing its meshes' resources.
- [ ] J04: Reduce transient allocations in hot paths; pool particles and consider instancing/batching. Profile physics contacts, shadow cost, draw calls, and garbage collection during the worst cascade.
- [ ] J05: Define and record a desktop and a representative midrange phone. Proposed target: stable 60 fps with p95 frame time at or below 20 ms during normal play; measure heavy cascades separately. Offer adaptive effects/shadow/resolution quality without changing simulation outcomes.
- [ ] J06: Set a loading budget, preload essentials, defer chapter content, and show actual loading/error states. Proposed first-playable target: within five seconds on a documented 10 Mbps cold-cache profile.
- [ ] J07: Validate production asset paths, subpath hosting, cache updates, WebGL/context-loss handling, and unavailable audio/storage. Do not treat the current bundle-size warning alone as proof of poor runtime performance.

Acceptance: Profile a 15-minute session, repeated retries, and the largest chain reaction on the named devices. No unbounded growth, severe input stalls, blank production pages, missing assets, or uncaught runtime errors.

## K. QA and proof of parity — P0 through release

- [ ] K01: Replace screenshot/measurement-only scripts with assertions and nonzero failure exits. scripts/sling-critic-shot.mjs hardcodes 2.85 while SLING_MAX_PULL is 3.15; import shared parameters and aim from observed world/screen positions.
- [ ] K02: Add unit/integration tests for state transitions, ammunition, scoring, contact damage, materials, TNT, trajectories, persistence, and level validation.
- [ ] K03: Add browser flows for win/loss/retry, all abilities, mouse/touch, interruption, cancellation, orientation, pan/zoom, pause, settings, and restore.
- [ ] K04: Capture stable visual regressions for menu, ready, aim, impact, destruction, victory, defeat, and all target viewports. Keep seeds and timing controlled; review intentional changes.
- [ ] K05: Run build, strict types, tests, production smoke checks, and browser tests in CI. Keep reproducible evidence with the commit and environment used.
- [ ] K06: Update docs/ANGRY_BIRDS_TARGET.md, CRITIC_RUBRIC.md, GAUNTLET_PLAYABLE.md, and progress reporting. Treat historic PASS labels as unverified until rerun against the new gates.
- [ ] K07: Compare real gameplay recordings against a fixed Classic reference: capture aiming, release, collisions, collapse, sound, camera return, and results. Have evaluators explain preference in concrete terms.
- [ ] K08: Conduct first-time-user playtests. A proposed initial gate is four of five unfamiliar testers completing the tutorial without verbal assistance; record accidental launches, confusion, retries, and perceived fairness.
- [ ] K09: Require an audio listening session and real phone touch testing. Desktop emulation cannot establish sound quality or mobile input/performance quality.
- [ ] K10: Record incomplete or blocked items honestly. Passing a build, a single screenshot, or one scripted winning shot is insufficient for completion.

## Execution order and handoff rules

1. Reproduce this baseline on the execution machine. Record current commit and any later changes; revalidate findings that may already be fixed.
2. Complete A/B and automated regression foundations in K. Fix C/D playability blockers. Gate: reliable simulation, enforceable rules, usable desktop/phone controls.
3. Lock the art and audio direction; finish E/F/G/H for the three benchmark levels. Gate: a cohesive quality slice that passes all functional and presentation checks.
4. Expand I and progression only after the slice works. Continue J profiling as content grows; do not postpone performance until all assets are produced.
5. Complete the full K test matrix, human comparison, and device/audio checks. Gate: complete release scope with evidence.

For every item, record status, implementation location, verification method, tested commit, and evidence. Keep the list of remaining gaps visible. Do not silently downgrade the goal to a POC or add arbitrary boosts/pinning to satisfy individual automated shots.

Final completion requires all P0/P1/P2 scope above, no unresolved game-breaking defects, a playable production build, and direct evidence for mechanics, visual quality, audio quality, usability, and performance. An executing model should not claim subjective Angry Birds parity from its own numerical ratings alone; report evaluator findings and any remaining perceptual gap.
