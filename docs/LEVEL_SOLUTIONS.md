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

## Dash Lane (`dash-lane`)

| Stars | Min score | Approach |
|-------|-----------|----------|
| 1 | 5,500 | Break center stone with Dash bot |
| 2 | 10,000 | Single-shot stone lip collapse |
| 3 | 16,000 | Chain deck break in ≤2 shots |

**Path:** First bot is Dash — line drive into center stone beam. Tutorial: `tests/e2e/bot-tutorial.spec.ts`.

## Glass Columns (`glass-columns`)

| Stars | Min score | Approach |
|-------|-----------|----------|
| 1 | 7,500 | Snap side glass columns |
| 2 | 13,000 | Drop roof pig via column failure |
| 3 | 20,000 | Split bot on column cluster (optional) |

## TNT Duo (`tnt-duo`)

| Stars | Min score | Approach |
|-------|-----------|----------|
| 1 | 11,000 | Detonate one crate; finish pig with second shot |
| 2 | 19,000 | Chain both explosives |
| 3 | 30,000 | Single chain clears all three pigs |

Human replay and three-star score capture on device remain **unverified** (K07).

## Full catalog (30 levels)

See `docs/LEVEL_CATALOG.md` for chapter-grouped shot counts and one-line focus per level id (generated from `src/levels/registry.ts`; enforced by `tests/level-catalog.test.ts`).
