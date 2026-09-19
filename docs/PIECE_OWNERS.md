# Piece ownership

Repo: `/home/fubak/projects/angrybots`
Game: http://localhost:5173/
Progress: http://localhost:5173/progress.html

Update progress after each meaningful change:

```bash
node scripts/update-progress.mjs log "your message"
node scripts/update-progress.mjs piece sling-feel status in_progress
node scripts/update-progress.mjs piece sling-feel criticVerdict "still losing on band tension"
node scripts/update-progress.mjs piece sling-feel gap "release snap lacks anticipation frame"
node scripts/update-progress.mjs piece sling-feel round 3
```

## Piece IDs

| ID | Focus files |
|----|-------------|
| sling-feel | `src/systems/SlingSystem.ts`, `src/config.ts` |
| grok-character | `src/entities/GrokBot.ts` |
| destruction | `src/entities/Block.ts`, `src/Game.ts` (collisions) |
| camera-juice | `src/systems/CameraRig.ts`, `src/systems/JuiceSystem.ts` |
| level-ui | `src/levels/level1.ts`, `src/Game.ts` (HUD), `src/style.css` |
| audio-polish | `src/systems/AudioSystem.ts`, win/shots flow in `Game.ts` |

Run `npm run typecheck` before finishing a pass.
