# Angry Bots — project state

> Rolling SSOT for agents. Last updated **2026-09-23**.
> Persistent notes: `memory/MEMORY.md`
> Gauntlet ledger: `docs/GAUNTLET_STATUS.md`

## Current

**Resume instruction:** `main` is pushed at `1295757`. Game behavior is `e2b8547`. The public site is https://fubak.github.io/angrybots/. All 30 levels are selectable. Targets are chat bubbles, hosts, models, and a flagship, still stored as `pig`. Bots use the Grok Bot disc, blob, and exclamation forms at their real radii. Hills, ramps, and ledges are visible. The camera stays wide. Do not claim Angry Birds parity or a headphone listen.

| Field | Value |
| --- | --- |
| Product | Browser slingshot game, Vite + TypeScript, Three.js, Planck |
| Branch | `main` at `1295757`, pushed. Game behavior is `e2b8547`. Repo `fubak/angrybots` is public. |
| Public URL | https://fubak.github.io/angrybots/ |
| Local | `npm run dev` (`vite --host`). LAN share used `http://192.168.1.170:5175/`. Playwright e2e uses `127.0.0.1:5181`. |
| Tests | `tsc --noEmit` passed after the Pages commit. `save-v2`, calibration (4), and `pouch-all` (31) passed. A full `npm test` was not re-run after `e2b8547`. |
| Campaign | 30 levels, all unlocked. Solver file `solutions.json` unchanged. Pouch plans in `pouch-solutions.json`. |

## Done through e2b8547

- Level list does not lock later levels. `SaveStore.isUnlocked` returns true.
- `Renderer.setTerrain` draws plateaus, ramps, and ledges so Hilltop, Ramp Run, and Ledge Nest are not floating.
- An airborne target pops on a grass hit (approach ≥ 1.2). One that starts on the grass does not.
- Bots match the official Grok Bot language: black disc, soft blob, exclamation. Drawn diameter follows `TUNING.bots`.
- Targets are original industry pieces, not pigs and not other companies' logos.
- Camera holds the wide frame and only nudges toward flight and impact.
- GitHub Pages workflow `.github/workflows/pages.yml` deployed successfully after the repo was made public.

## Open

| Item | Status |
| --- | --- |
| Headphone listen | Open. Mix was rendered and played to hardware once; this session did not hear it. |
| Physical phone soak | Open. |
| Full Playwright suite on `e2b8547` | Not run. |
| Angry Birds art parity | Open. Art is original canvas drawing. |
| `solutions.json` vs pouch | Keep both. |

## Evidence

Hilltop with the plateau drawn: checked in the browser on 2026-09-23, zero level buttons disabled. Playtest screenshots are not kept in the repo.
