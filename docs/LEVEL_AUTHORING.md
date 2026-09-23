# Level authoring (Gate 3 / I07)

## Registry

All playable levels are listed in `src/levels/registry.ts` in **progression order**. Chapter metadata lives in `src/levels/chapters.ts`. `SaveStore.isUnlocked` returns true, so the level list does not gate on earlier clears.

Plateau, ramp, and ledge pieces are physics and also drawn by `Renderer.setTerrain`. A new terrain kind needs both a collider and a mesh, or the stack will look like it is floating.

## Validation

Before merging new levels, run:

```bash
npm test -- tests/level-layout.test.ts tests/levels-registry.test.ts
```

`validateLevelLayout()` in `src/levels/validateLayout.ts` rejects pig–pig and pig–interior-block overlaps.

## Templates

- `src/levels/authoring/fortDeck.ts` — `trainingFortLevel()` for standard side-post forts.
- Batch files: `trainingBatch.ts`, `glassworksBatch.ts`, `blastBatch.ts`.

## Benchmark e2e

Pointer clears for the quality slice remain on Training Yard, Glass Arch, and Blast Yard (`tests/e2e/*`). New levels are layout-validated; solvability is recorded in `docs/LEVEL_SOLUTIONS.md` as they are play-tested.
