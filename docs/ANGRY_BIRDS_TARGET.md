# Angry Birds Classic — product target

Full execution backlog: [ANGRYBOTS_PARITY_BACKLOG.md](./ANGRYBOTS_PARITY_BACKLOG.md).

## Gameplay pillars

- Side-on 2D plane (orthographic camera on +Z).
- Slingshot: pull opposite launch; monotonic power; honest trajectory preview.
- Materials: wood, stone, glass, TNT with distinct tuning.
- Pigs defeated by direct hits, crushing, and chain reactions.
- Level data drives shot budget, layout, and star thresholds.
- Explicit game states: title → play → resolve → results; retry and level select.

## Visual pillars

- Cartoon readability at phone scale; Grok bot with expressive eyes.
- Illustrated ground cross-section (ongoing art pass).
- Juice: particles, shake, material break feedback.

## Quality slice (current milestone)

Three benchmark levels in `src/levels/`: Training Yard, Glass Arch, Blast Yard.

## Out of scope until slice passes

- 30-level / three-chapter release content
- Four distinct bot abilities (data hooks reserved)
- Licensed AB art or audio
