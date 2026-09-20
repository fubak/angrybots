# Quality slice — documented solutions (Gate 2 / I06)

Recorded against level defs in `src/levels/`. Star thresholds come from each level’s `starScores`.

## Training Yard (`training-yard`)

| Stars | Min score | Approach |
|-------|-----------|----------|
| 1 | 6,000 | Clear 3 pigs with direct hits / glass breaks |
| 2 | 12,000 | Collapse roof onto lower pigs |
| 3 | 20,000 | Chain break deck + roof in ≤3 shots |

**Validated path:** High arc into center deck; second shot finishes roof pig if needed. E2e: `tests/e2e/gauntlet.spec.ts` (three-shot pointer clear).

## Glass Arch (`glass-arch`)

| Stars | Min score | Approach |
|-------|-----------|----------|
| 1 | 8,000 | Break both glass supports |
| 2 | 14,000 | Drop roof stone onto pig |
| 3 | 22,000 | Minimal shots (≤2) with roof collapse |

**Validated path:** Low line into glass posts, then finish falling debris. E2e: `tests/e2e/glass-arch.spec.ts`.

## Blast Yard (`tnt-yard`)

| Stars | Min score | Approach |
|-------|-----------|----------|
| 1 | 10,000 | Detonate center TNT |
| 2 | 18,000 | TNT chain clears 2+ pigs |
| 3 | 28,000 | Single TNT detonation clears deck |

**Validated path:** Direct hit on explosive crate. E2e: `tests/e2e/blast-yard.spec.ts`.

Human replay and three-star score capture on device remain **unverified** (K07).
