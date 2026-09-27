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

Thirty levels across three chapters, gated by progression: clearing a level unlocks the next, and later chapters require star thresholds. **Currently all levels are open** via the temporary `UNLOCK_ALL_LEVELS` flag in `src/game/progression.ts` (dev builds can also pass `?unlockAll=1`). The things you knock down are chat bubbles, hosts, models, and a flagship. The five bot kinds are distinct Grok Bot forms with their own abilities. Hills, ramps, and ledges are drawn. This is not an Angry Birds parity claim.

## Deploy

- **angrybots.lol:** `.github/workflows/deploy.yml` runs on every push to `main`: build → `wrangler d1 migrations apply --remote` → `wrangler deploy` (Cloudflare static-assets Worker `angrybots`, config in `wrangler.jsonc`, custom domains `angrybots.lol` + `www.angrybots.lol`). It needs the repo secret `CLOUDFLARE_API_TOKEN` (permissions: Workers Scripts:Edit, D1:Edit, Workers Routes:Edit on the `angrybots.lol` zone — without the zone permission the custom-domain step fails) and, optionally, the repo variable `GA_MEASUREMENT_ID`. Manual fallback: `npm run build && npm run db:migrate && npx wrangler deploy`.
- **GitHub Pages mirror:** deploys automatically from `main` (`GITHUB_PAGES=1` build, base `/angrybots/`).

## Accounts & leaderboard

Sign-in with X, per-level best scores, and global/daily/level leaderboards are served by the Worker's `/api/*` routes (`worker/`) backed by the `angrybots` D1 database. The GitHub Pages mirror has no backend, so the leaderboard button is hidden there (the client probes `api/auth/me` under the deployment base; a 404 means offline).

**X developer app** ([developer.x.com](https://developer.x.com)):

1. User authentication settings → enable **OAuth 2.0**, type **"Web App, Automated App or Bot"** (confidential client).
2. Callback URIs: `https://angrybots.lol/api/auth/x/callback` and `http://127.0.0.1:5173/api/auth/x/callback` (local dev via `npm run dev`). Changing the app type regenerates the Client ID/Secret — re-run the `wrangler secret put` commands below afterwards.
3. Website URL: `https://angrybots.lol`.
4. Scopes requested at login: `users.read tweet.read`.

**Secrets** (never committed):

```sh
npx wrangler secret put X_CLIENT_ID
npx wrangler secret put X_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET   # e.g. openssl rand -base64 32
```

**Abuse controls:** scores are rejected above a per-level theoretical maximum (`worker/level-caps.json`, regenerate with `npm run caps:gen` whenever levels or `SCORE`/`TUNING` change — the unit tests fail if it is stale), and the Worker uses Cloudflare rate-limiting bindings (`RL_SCORES`: 30 writes/min per user, `RL_LOGIN`: 10/min per IP). Players can remove themselves with **Delete account** in the leaderboard (`POST /api/auth/delete`); the public privacy note is `public/privacy.html`.

**Database:** `npm run db:migrate` applies `migrations/` to the remote D1 once (`--local` variant: `npm run db:migrate:local`).

**Local dev:** copy `.dev.vars.example` to `.dev.vars` and fill in the three secrets, then run `npm run worker:dev` (API on :8787) alongside `npm run dev` (Vite proxies `/api` to it).

## Analytics

Gameplay events (`src/analytics/index.ts`) go to Google Analytics 4 when a measurement id is present at build time: `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run build` (or put it in a local `.env.production`, which is git-ignored). Without it — and always in dev builds — nothing is sent. GA is also skipped when the browser sends `DNT: 1`.

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
