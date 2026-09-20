# Asset manifest (E09)

Original assets used in the quality slice. Procedural/canvas textures are generated at runtime (see `src/visuals/abTextures.ts`).

| Path | Role | License / source |
|------|------|------------------|
| `/assets/grass-tile.png` | Ground grass UV | Original (repo) |
| `/assets/wood-tile.png` | Wood block UV | Original (repo) |

## Runtime-generated (no file)

| System | Usage |
|--------|--------|
| `explosiveBlockMaterial()` | TNT stripe canvas texture |
| `stoneBlockMaterial()` | Mortar block canvas texture |
| `glassBlockMaterial()` | Pane edge canvas texture |
| `makeSkyGradient()` | Background gradient |
| `buildGroundCrossSection()` | Earth/grass mesh (E02) |

## Mesh conventions

- Side-view gameplay in XY; orthographic camera on +Z.
- Block world units match Cannon box half-extents in `Block.ts`.
- Grok bot radius `0.58`; pig radius `0.55`.

Add new rows when committing PNG/SVG/audio files; keep star slice free of unlisted third-party art.
