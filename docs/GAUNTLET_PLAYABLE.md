> Superseded for production completion: read [PRODUCTION_GAUNTLET_PROMPT.md](./PRODUCTION_GAUNTLET_PROMPT.md). The wave-specific rubric below is historical; its PASS labels and anchoring requirements do not satisfy the production gates.

# Gauntlet — fully playable checklist

Use with `docs/GAUNTLET_RUBRIC.md` and `docs/ANGRY_BIRDS_TARGET.md`. A tick **PASS** requires all items below unless noted.

## Physics (P0)

- [ ] Launch Grok into wood/stone stack: at least one block **translates or rotates** within 1s of contact
- [ ] Castle stays static **until** bot contact (no collapse on load or during aim)
- [ ] Pig wakes and moves / dies on direct bot hit
- [ ] TNT detonates from damage; nearby blocks and pigs receive blast impulse
- [ ] Ground and bot collision feel stable (no tunneling through fort at full pull)

## Mechanics (P1)

- [ ] Three shots per level; HUD shows shots left
- [ ] Win when all pigs cleared; lose or retry when out of shots
- [ ] Side-view ortho camera frames sling + fort; trajectory visible while aiming
- [ ] Pull power reaches fort at max stretch (desktop + mobile)

## Visuals & art (P2)

- [ ] No full-scene fog wash; readable grass, wood, sky
- [ ] Grok bot readable at a glance (eyes, expression on impact)
- [ ] Juice: hit flash, particles, light camera shake on launch/impact

## Mobile (P2)

- [ ] 390×844: aim zone, safe areas, no stuck drag state

## Verification

- Desktop Playwright or manual: one full 3-shot playthrough
- Record FAIL reason in `public/progress.json` → `gauntlet.lastFail`
