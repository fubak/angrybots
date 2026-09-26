# Lessons

- Long solver/search runs must be time-boxed, run in the background, and write milestone lines to a progress log. Commit WIP before long runs so interrupts lose nothing.
- Rater constraints of the form "≤ prev + k" are trivially satisfied by 0%; curve checks need floors too.
- Star thresholds from winning-score percentiles collapse to near-identical values when most wins score alike; calibrate on a different axis (bots spared / destruction).
- A screenshot captured on a fixed sleep can miss the event; poll for the state/event before snapping.
- `window.__debug.loadLevel(id)` only loads the sim — it never sets `App.levelId`, so the camera uses fallback framing and star thresholds may not apply. For screenshots, navigate the real UI (chapter card → `.lvl-node[data-level-id]`) and verify `snapshot().levelId` before snapping.
- Bot-intro modals pop *after* the state reaches `aim`; after polling for `aim`, also poll-dismiss `.modal-wrap` buttons before capturing.
- The one-shot rating grid (`replayLevel`/`runShot`) never triggers abilities — dash/split/heavy/blast fly as plain balls. Design bot-intro levels so an untapped projectile can still win one shot.
- Running `level:rate`/`rebuild-campaign` while a Vite dev server is up triggers HMR page reloads that kill captures. Capture after writes finish (or serve a static build).
- `pouch-solve FRAG=` fragments seed `found` from the whole existing book — merging whole fragments clobbers earlier ones. Merge only each fragment's own level entry.
- The rater's `best` (star3 axis) only counts `solutions.json` + grid wins — pouch/ability plans don't feed it. Raising star3 for an unchanged level needs a better anchor solution or a layout change that unlocks spare bots.
- Pigs sitting exactly on plank seams or slab edges cause settle drift (>0.08). Place pigs mid-plank with clearance on both sides.
- `solve-robust` budget is `CANDS` env (default 10); `batch-solve` can find higher scores but unrobust shots — always re-check perturbed wins (±0.3°, ±0.2 speed, ≥3/4) after any book change.
- In a service worker, `caches.match(requestObject)` can miss entries stored by `addAll` (Vary check compares the browser request's headers against the synthesized addAll request). Match precached entries by URL string (`caches.match(url.href)`).
- `Array.prototype.slice(0, negative)` counts from the end, not zero — guard `arr.length > K` before `slice(0, len - K)` pruning, or it deletes nearly everything.
- `index.html` is not part of the rolldown `bundle` map in `generateBundle` — a build-plugin precache list must add it (and `public/` files) explicitly.
