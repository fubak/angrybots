#!/usr/bin/env bash
# Playability gauntlet — emits AGENT_LOOP_TICK_gauntlet every GAUNTLET_INTERVAL_SEC (default 300).
set -euo pipefail
cd "$(dirname "$0")/.."
INTERVAL="${GAUNTLET_INTERVAL_SEC:-300}"
PROMPT='Wave-3 playability gauntlet on http://localhost:5173/ — read docs/GAUNTLET_RUBRIC.md, docs/ANGRY_BIRDS_TARGET.md, docs/GAUNTLET_PLAYABLE.md. Priority: blocks and pigs MUST move on Grok bot hit (Playwright: launch into fort, assert block position delta). Then AB mechanics (3 shots, TNT chain, pig kills), side-view visuals, Grok art, mobile 390x844. Update public/progress.json each tick; stop only when gauntlet PASS on all playable criteria.'

while true; do
  sleep "$INTERVAL"
  printf 'AGENT_LOOP_TICK_gauntlet {"prompt":"%s"}\n' "$PROMPT"
done
