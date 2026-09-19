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
