# Angry Bots (Grok Edition)

Browser Angry Birds–style game built with **Three.js** + **Planck**.

Agent resume notes: `tasks/state.md` and `memory/MEMORY.md`.

## Run

```bash
npm install
npm run dev
```

- **Public:** https://angrybots.lol/ (primary, served at the domain root)
- **Mirror:** https://fubak.github.io/angrybots/ (GitHub Pages, base `/angrybots/`)
- **Local:** Vite prints the URL. `npm run dev` is `vite --host` (default port 5173). A LAN share has used port 5175.
- **Live progress:** same host, path `/progress.html`

Thirty levels across three chapters, gated by progression: clearing a level unlocks the next, and later chapters require star thresholds (dev builds can pass `?unlockAll=1` to bypass). The things you knock down are chat bubbles, hosts, models, and a flagship. The five bot kinds are distinct Grok Bot forms with their own abilities. Hills, ramps, and ledges are drawn. This is not an Angry Birds parity claim.

## Daily challenge

The title screen's **Daily** button picks one campaign level per local day — the FNV-1a hash of the `YYYY-MM-DD` date, independent of campaign progress. Daily runs never touch campaign stars, unlocks, or skip counts; the results card shows your best daily score and your consecutive-day win streak (stored in save v4, kept to the last 30 days).

## Offline / PWA

Production builds ship a hand-written service worker (`sw.js`, emitted by the Vite plugin in `vite.config.ts`) that precaches every built asset plus `public/` files: hashed assets are cache-first and `index.html` is network-first. Once the game has loaded once it plays fully offline. Icons and `manifest.webmanifest` are under `public/`; all paths are relative to the deployment base so the same artifact works at `angrybots.lol/` and `/angrybots/`.

## Quality pipeline

Work is split into independent **pieces** (see `public/progress.json`). Each piece has a dedicated builder sub-agent and a **Grok critic** that playtests in the browser (Playwright), compares against Angry Birds Classic, and records the single biggest gap until it passes.

Update progress from agents:

```bash
node scripts/update-progress.mjs log "message"
node scripts/update-progress.mjs piece sling-feel status in_progress
```

Rubrics: `docs/CRITIC_RUBRIC.md` · Ownership: `docs/PIECE_OWNERS.md`

## Controls

Drag the bot backward on the slingshot and release; tap in flight to trigger its ability. The bot queue varies per level.
## Production completion gauntlet

- [Execution prompt](docs/PRODUCTION_GAUNTLET_PROMPT.md): the canonical build, verify, and critique loop with five production gates.
- [New-session startup prompt](docs/RUN_GAUNTLET_SESSION.md): copy into the session executing the work.
- [Full 87-task backlog](docs/ANGRYBOTS_PARITY_BACKLOG.md) and [fresh review](docs/FRESH_REVIEW_8f4aebe.md).

The historical scripts/gauntlet-loop.sh only prints tick messages; it does not run a model or establish completion. Use the session prompt to execute the work. Automated checks alone do not establish visual, audio, or real-device quality.
