# AngryBots v2 — Implementation Specs

These specs take AngryBots from its current prototype (commit `65baa72`) to Angry Birds Classic–level quality. They are written for an implementing model that follows instructions literally. Read this file completely before starting any task.

## Decisions already made (do not revisit)

| Topic | Decision |
| --- | --- |
| Physics engine | **Planck.js** (`planck` npm package, v1.5.x). cannon-es is removed. |
| Art direction | **Toon-shaded 3D**: Three.js meshes, `MeshToonMaterial`, inverted-hull outlines, orthographic side camera. |
| Orientation | **Landscape-first.** Phones in portrait show a "rotate your device" screen. |
| Aiming aid | **No predictive trajectory by default.** Show the previous shot's trail. An optional short guide exists as an accessibility setting. |
| Abilities | **Tap-to-activate mid-flight**, once per bot. |
| Level format | **v2 JSON**, y values are bottom edges, blocks come from a fixed kit. Validated by static checks and a physics settle test. |
| Audio | **Howler.js** with a JSON manifest, sample-based sounds, separate buses (music, effects, voice). |
| Structures | **Live physics from spawn.** They settle for 2 s with damage off, then damage turns on. No anchoring, pinning, or forced sleep. |

## File index

| File | Contents |
| --- | --- |
| [PLAN.md](PLAN.md) | Phases, gates, full task list with IDs, dependencies, sizes |
| [01-architecture.md](01-architecture.md) | Target folder layout, module boundaries, fixed-step loop, events, state machine, coordinates |
| [02-physics.md](02-physics.md) | Planck world, entities, damage model, TNT, fragments, tuning, calibration tests |
| [03-levels.md](03-levels.md) | Level format v2, block kit, validator, settle test, solver, the 5 slice levels |
| [04-slingshot-and-bots.md](04-slingshot-and-bots.md) | Input, pull-to-launch mapping, shot trail, bot profiles, abilities, bot queue |
| [05-camera.md](05-camera.md) | Camera director: intro, aim, follow, impact, return, manual pan/zoom |
| [06-game-flow-ui.md](06-game-flow-ui.md) | Game states, rules, scoring, HUD, menus, results, save data |
| [07-art-toon.md](07-art-toon.md) | Toon rendering, outlines, palette, characters, blocks, damage states, shatter, environment, effects |
| [08-audio.md](08-audio.md) | Sound list, manifest, buses, sourcing, normalization |
| [09-performance.md](09-performance.md) | Budgets, pooling, disposal, measurement |
| [10-qa.md](10-qa.md) | Test layers, forbidden patterns, visual regression, human gates |
| [11-content.md](11-content.md) | Pig variants, Blast bot, chapters, 30-level plan, level design rules |
| [reference/](reference/) | Working reference code: headless Planck simulation, slice levels, validators, solver |

## Rules for the implementing model

1. **One task at a time**, in the order and with the dependencies in [PLAN.md](PLAN.md). Each task has an ID such as `PHY-03`. Put the ID in every commit message: `PHY-03: impulse damage model`.
2. **Acceptance tests come first.** Write or copy the tests listed in the task, see them fail, then implement until they pass.
3. **Never weaken a test** to make it pass. Do not change thresholds, add `skip`, loosen tolerances, or add fallbacks to debug hooks. If a test seems wrong, stop and report (rule 7).
4. **Tuning lives in one place:** `src/config/tuning.ts`. Change numbers only there, and only when a task says tuning is allowed.
5. **No scripted physics.** The forbidden patterns in [10-qa.md](10-qa.md#forbidden-patterns) are checked in CI. Examples: setting a structure body's velocity directly, pinning positions, forcing sleep, faking collisions.
6. **Headless first.** Physics, rules, and levels must run in Node without Three.js or the DOM. If a module needs `three` or `document`, it belongs in `src/render/` or `src/ui/`.
7. **Stop and report** instead of improvising when:
   - an acceptance test cannot pass without breaking rule 3 or rule 5
   - a spec contradicts itself or the code in a way that changes behavior
   - a task needs an asset that doesn't exist (art, audio, font) and the task doesn't say how to create it
   - the work would exceed the task's size by more than 2×

   Report the task ID, what you tried, the failing output, and the smallest decision you need.
8. **Definition of done** for every task:
   - acceptance tests pass
   - `npm run verify` passes (see [10-qa.md](10-qa.md#ci-pipeline))
   - no new `any`, `@ts-ignore`, or `eslint-disable` without a comment naming the task ID and reason
   - the task's "Update docs" step is done
   - the progress log is updated: `node scripts/update-progress.mjs task <ID> done`
9. **Don't touch what the task doesn't name.** If you notice a bug elsewhere, add it to `docs/specs/ISSUES.md` with a one-line description and continue.

## Reference code

`reference/` holds a working headless simulation in plain JavaScript (Planck 1.5.0):

- `sim.mjs` — world build, the damage model, TNT, scoring, settle and idle tests, shooting
- `levels.mjs` — the 5 slice levels in format v2
- `check.mjs` — static validation + settle + idle checks
- `rate.mjs` — difficulty metric (percentage of one-shot clears)
- `solve.mjs` — brute-force solution finder
- `calib.mjs` — calibration scenarios (output: `calib-output.txt`)
- `dist.mjs` — kill-count distribution per level (output: `dist-output.txt`)
- `levels-json/` — the 5 slice levels as format-v2 JSON, ready to copy into `src/levels/data/`
- `check-output.txt`, `solve-output.txt` — recorded results

It has been run against the slice levels: all pass validation, settle with less than 0.08 units of movement, survive 3 s idle, and are winnable. Port it to TypeScript as the tasks direct. **Where the reference and a spec differ, the spec wins**; the reference is proof that the approach and numbers work.

Run it:

```bash
cd docs/specs/reference && npm install && node check.mjs && node solve.mjs
```

## Glossary

- **Unit / m:** one world unit. The Grok bot's radius is 0.58 units.
- **Bot:** the player's projectile (the Angry Birds "bird").
- **Pig:** a target. The level is won when all pigs are destroyed.
- **Block:** a destructible structure piece (wood, stone, glass, TNT).
- **Settle:** the 2 s after spawn when physics runs with damage disabled so stacks come to rest.
- **Quiet:** every dynamic body is moving slower than the quiet thresholds (see [02-physics.md](02-physics.md#quiet-detection)).
- **Slice:** the first 5 polished levels. Content expansion waits until the slice passes Gate 4.
