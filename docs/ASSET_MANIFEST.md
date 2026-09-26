# Asset manifest

All art is generated at runtime or committed to the repo — no third-party art.

## Committed files

| Path | Role | License / source |
|------|------|------------------|
| `public/assets/grass-tile.png` | Legacy ground grass tile | Original (repo) |
| `public/assets/wood-tile.png` | Legacy wood tile | Original (repo) |
| `public/favicon.svg` | Bot-mark favicon | Original (repo) |
| `public/icons/icon-*.png` | PWA icons 192/512 + maskable, rendered from `favicon.svg` by `scripts/gen-icons.mjs` | Original (repo) |
| `public/icons.svg` | UI icon glyph sheet | Original (repo) |
| `public/game-preview.png` | Social/share preview | Original (repo) |
| `public/manifest.webmanifest` | PWA manifest (relative `start_url`/`scope` — works under `/` and `/angrybots/`) | Original (repo) |
| Baloo 2 webfonts (via `@fontsource/baloo-2`) | UI font, bundled at build | Baloo 2, OFL |
| `src/assets/hero.png` | Splash hero image | Original (repo) |
| `src/assets/bots/GrokBot_StickerSet_GrokBot-01..12.svg` | Official bot sticker artwork — playable bots, title lineup, achievement badges | Official GrokBot sticker set supplied by the user |
| `art/bots/png/GrokBot_StickerSet_GrokBot-01..12.png` | 2048px sticker masters (committed, not shipped in dist) | Official GrokBot sticker set supplied by the user |

## Runtime-generated (no file)

| System | File | Usage |
|--------|------|-------|
| `TEX` | `src/render/textures.ts` | Wood/stone/grass/dirt/metal/TNT/sky canvas textures plus `terrainBody`/`terrainCap` for plateaus, ramps, ledges |
| `damagedBlockTexture()` | `src/render/textures.ts` | Shared cracked/broken maps per material (wood, glass, stone), cached — no per-block allocation |
| `ILL` | `src/render/illustrations.ts` | Painted block faces, pig faces, sprite art with `shadeAndOutline` |
| `botArt` | `src/render/botArt.generated.ts` + `src/render/botArt.ts` | Layered sticker rendering extracted from the official SVGs by `tools/extract-bot-art.ts`: composite body texture (backing + silhouette + shines) + separate eyes texture for look/blink/squint/dizzy. Verified pixel-identical by `tools/check-bot-composite.mjs` |
| `blockMaterial()` / `decorateBlock()` | `src/render/characters.ts` | Per-material block look + decorative face overlays |
| `Scenery` | `src/render/Scenery.ts` | Sky gradient, clouds, hills, stars, dust per chapter palette |
| `music` | `src/audio/music.ts` | Deterministic procedural tracks (title + per-chapter) and victory/defeat stings rendered via `OfflineAudioContext` |
| `oneshots` | `src/audio/oneshots.ts` | Synthesized SFX waveforms |

## Mesh conventions

- Side-view gameplay in XY; orthographic camera on +Z. All materials are `MeshBasicMaterial` — lighting is painted.
- Block dimensions come from the kit table in `src/levels/kit.ts` (`LevelV2` JSONs reference kit ids, not explicit sizes).
- Physics bodies are Planck fixtures; kit `depth` is visual only.

Add new rows when committing PNG/SVG/audio files; keep the game free of unlisted third-party art.
