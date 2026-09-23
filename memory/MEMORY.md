# Angry Bots — agent memory

**Project:** angrybots
**Last sync:** 2026-09-23
**SSOT:** `tasks/state.md`
**Ledger:** `docs/GAUNTLET_STATUS.md`

## Product fact

Vite + TypeScript slingshot game. Rendering is Three.js ortho. Physics is Planck (`planck`). Identity is Grok. Public site: https://fubak.github.io/angrybots/ (repo `fubak/angrybots` is public). Do not claim Angry Birds parity.

## What the player sees

- Bots are SpaceXAI Grok Bot forms, drawn at `TUNING.bots[kind].r`. Grok, Dash, and Split are black discs. Heavy is the soft blob with a green streak. Blast is the exclamation mark. Queue spacing uses those radii.
- Targets are still `kind: 'pig'` in the sim. On screen they are a chat bubble (plain), a host with antennae (`hat`), a visor robot (`helmet`), or a flagship with a gold antenna (`king`). Not other companies' logos.
- A target with `airborne` set (center above `r + 0.18`) is destroyed on a grass contact whose approach speed is at least 1.2. A target that starts on the grass is not. Terrain is not that contact.
- Plateaus, ramps, and ledges are drawn by `Renderer.setTerrain`. They exist in Hilltop, Ramp Run, and Ledge Nest. Without that mesh the stacks look like they float.
- The camera stays on the wide sling frame. Flight and impact only nudge the center (`nudge` in `CameraDirector`). Do not bring back the close follow zoom.
- Every level is unlocked. `SaveStore.isUnlocked` returns true.

## Architecture

- Session states: `intro → aim → flight → resolve → nextBot | bonus → won | lost`. `GameSession` owns the machine. `resolve → won` is allowed when the last bot clears the level. Leftover bots still go through `bonus`.
- Player launches from the pulled pouch (`GameSession.launchFromPull`). Solver shots in `src/levels/solutions.json` launch from the sling anchor. Do not overwrite `solutions.json`. Pouch plans live in `src/levels/pouch-solutions.json`.
- First Flight wins from the pouch at 34° / speed 20. `window.__debug.launch(angleDeg, speed)` is that order, and only exists when `import.meta.env.DEV`.
- `window.__debug.loadLevel` updates the sim only. It does not change `App.levelId`.
- `import.meta.glob` in `src/levels/registry.ts` only works under Vite. Do not pouch-search with `npx tsx` against the registry.
- Fragments spawn only when `Level.fragmentsEnabled` is true. `App` turns that on for a played level.
- Sling posts are visual, not physics bodies.
- Pages build sets `GITHUB_PAGES=1`, so Vite `base` is `/angrybots/`. Local `npm run dev` keeps base `/`.

## Audio

`src/audio/oneshots.ts` feeds `SoundBank`: launch, materials, pig, yell, creak, victory, defeat, cancel, ability, UI, and a chapter music loop. Impacts duck the music. A rendered First Flight mix peaked near 0.4 with nothing clipping. This machine's login could not open the headphone jack (user was not in `audio` until a later `usermod`; the session still needed a full desktop login). Do not claim a headphone listen.

## Inspection

Playwright here stalls around a few frames per second. That is not a player measurement. Isolated play has used port **5195** and, for the LAN share, **5175** (`npm run dev -- --host 0.0.0.0 --port 5175`). Playwright `webServer` is **5181** with `reuseExistingServer: false`. `npm run dev` is `vite --host` and otherwise uses Vite's default port.

## Commands

```bash
npm run typecheck
npm test
GITHUB_PAGES=1 npm run build
```

## Do not

- Overwrite `src/levels/solutions.json` with pouch angles.
- Put OpenAI, Anthropic, DeepSeek, or other labs' logos on the targets.
- Treat `docs/FRESH_REVIEW_*.md` or pre-2026-09-23 gauntlet counts as this tree.
- Claim headphone listening, phone soak, or Angry Birds art parity.
- Launch pouch probes with `npx tsx` against `registry.ts`.
