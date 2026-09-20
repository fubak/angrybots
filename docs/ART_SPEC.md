# Angry Bots — quality slice art specification (E01)

Reference: Angry Birds Classic readability at phone scale. Original Grok identity; no licensed AB assets.

## Silhouette language

- **Grok bot:** Round body, vertical pill eyes, readable at 48px height; expression via eye scale and squash.
- **Targets:** Green pigs with ears/snout; defeat = pop then hide (no floating remnants).
- **Materials:** Wood (warm tan planks), stone (cool gray blocks), glass (cyan translucent), TNT (red/yellow hazard stripes).

## Palette

| Role | Hex | Usage |
|------|-----|--------|
| Sky top | `#2a6dad` → `#9ed8f7` | Gradient background |
| Grass | `#3d8a32` / `#4d8a3f` | Ground rim |
| Earth | `#5c3d22` | Cross-section fill |
| Wood | `#c68a4a` | Beams |
| UI text | `#eef4ff` on `#0a1628` | HUD / panels |

## Line and shading

- Soft cartoon shading; `MeshStandardMaterial` with moderate roughness.
- Contact shadows on ground; no full-scene distance fog on ortho playfield.
- Background parallax: low contrast, soft shapes (no dominant faceted hills).

## Texture scale

- Grass/wood tiles repeat at 4–6× on world units; avoid stretched UVs on blocks.

## Typography

- System UI stack: `Segoe UI`, system-ui; HUD 14px; flow panels 15–28px titles.

## Reference frames (quality slice)

Capture at **1280×720** and **390×844**: title, aim (full pull), impact, collapse settle, victory. Targets and sling must be identifiable without zoom.

## Asset rules

- Original PNG tiles in `/public/assets/`; document source in commit when adding new art.
- Gameplay debris uses physics shards + particles; no instant mesh deletion without break feedback.
