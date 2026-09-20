# Audio listening checklist (Gate 2 / G01 / K09)

**Status:** cue inventory verified in code; **human listen not recorded** for current commit.

**Synth implementation:** `src/systems/AudioSystem.ts` (Web Audio API oscillators + gain staging).

Use headphones and phone speakers on the three benchmark levels (Training Yard, Glass Arch, Blast Yard).

## Implemented cues (automated existence only)

| ID | Method | Moment |
|----|--------|--------|
| G02 | `slingTension(t)` | Pull stretch, bucketed 0–1 |
| G02 | `slingCancel()` | Aim cancelled / weak release |
| G02 | `launch(power)` | Release whoosh |
| G03 | `impact(i, material?)` | Wood / stone / glass / default thwack |
| G03 | `breakBlock(material)` | Material break layer |
| G03 | `explosion(i)` | TNT detonation |
| G04 | `pigPop()` | Pig defeat pop |
| G04 | `splitPop()` | Split bot burst |
| G05 | `win()` | Victory fanfare |
| G07 | Settings | Master volume via `ProgressStore` + title/pause sliders |

## Listening matrix (fill after human session)

| Moment | Expected cue | Pass? | Notes |
|--------|----------------|-------|-------|
| Draw sling | Rising tension ticks | | |
| Cancel aim | Soft drop vs release | | |
| Release | Snap + whoosh | | |
| Wood hit | Knock + thwack | | |
| Glass hit | Tinkle + break | | |
| Stone hit | Dull thwack | | |
| Pig pop | Pop voice | | |
| Split burst | `splitPop` chirp | | |
| Victory | Fanfare | | |
| Explosion | Blast Yard TNT | | |

Record date, device, output (headphones / speaker), and volume %. Automated tests do **not** substitute for this table.
