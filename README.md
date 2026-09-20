# Angry Bots (Grok Edition)

Browser Angry Birds–style game built with **Three.js** + **cannon-es**.

## Run

```bash
npm install
npm run dev
```

- **Play:** http://localhost:5173/
- **Live progress:** http://localhost:5173/progress.html

## Quality pipeline

Work is split into independent **pieces** (see `public/progress.json`). Each piece has a dedicated builder sub-agent and a **Grok critic** that playtests in the browser (Playwright), compares against Angry Birds Classic, and records the single biggest gap until it passes.

Update progress from agents:

```bash
node scripts/update-progress.mjs log "message"
node scripts/update-progress.mjs piece sling-feel status in_progress
```

Rubrics: `docs/CRITIC_RUBRIC.md` · Ownership: `docs/PIECE_OWNERS.md`

## Controls

Drag the Grok bot backward on the slingshot and release. Three shots per level.
## Production completion gauntlet

- [Execution prompt](docs/PRODUCTION_GAUNTLET_PROMPT.md): the canonical build, verify, and critique loop with five production gates.
- [New-session startup prompt](docs/RUN_GAUNTLET_SESSION.md): copy into the session executing the work.
- [Full 87-task backlog](docs/ANGRYBOTS_PARITY_BACKLOG.md) and [fresh review](docs/FRESH_REVIEW_8f4aebe.md).

The historical scripts/gauntlet-loop.sh only prints tick messages; it does not run a model or establish completion. Use the session prompt to execute the work. Automated checks alone do not establish visual, audio, or real-device quality.
