/** Task metadata from docs/specs/PLAN.md — titles and phases for progress UI. */
export const PHASES = [
  {
    id: 0,
    name: 'Foundation',
    gate: null,
    tasks: [
      ['APP-01', 'Branch, cleanup, tooling'],
      ['APP-02', 'Core: EventBus, FixedStepLoop, StateMachine, rng'],
      ['QA-01', 'Forbidden-pattern check'],
      ['QA-05', 'Human gate kit'],
      ['LVL-01', 'Schema, kit, loader'],
      ['SLG-01', 'Launch math'],
      ['CAM-01', 'fitRect and clampView'],
    ],
  },
  {
    id: 1,
    name: 'Headless core',
    gate: null,
    tasks: [
      ['PHY-01', 'Planck world and categories'],
      ['LVL-02', 'Static validator'],
      ['PHY-02', 'Entities and bodies'],
      ['PHY-03', 'Contact pipeline and damage'],
      ['PHY-05', 'Support collapse'],
      ['PHY-06', 'Fragments'],
      ['PHY-07', 'Explosions and TNT chains'],
      ['PHY-08', 'Out of bounds and quiet detection'],
      ['PHY-09', 'Determinism'],
      ['LVL-03', 'Physics validator, tools, solutions'],
      ['LVL-04', 'Level registry and chapters'],
      ['GAME-01', 'GameSession rules'],
      ['GAME-03', 'Scoring and stars'],
      ['QA-04', 'CI pipeline'],
    ],
  },
  {
    id: 2,
    name: 'Playable rebuild',
    gate: 'G1',
    tasks: [
      ['REN-01', 'Renderer, toon material, outlines'],
      ['SLG-02', 'SlingModel and SlingInput'],
      ['GAME-02', 'State machine wiring'],
      ['CAM-02', 'CameraDirector modes'],
      ['SLG-04', 'Bot profiles and abilities'],
      ['APP-03', 'App wiring; retire Game.ts'],
      ['PHY-04', 'Remove anchoring and scripted collisions'],
      ['PERF-01', 'Bench and counters'],
    ],
  },
  {
    id: 3,
    name: 'Core loop and UI',
    gate: 'G2',
    tasks: [
      ['SLG-03', 'Shot trail and aim guide'],
      ['SLG-05', 'Bot queue and hop'],
      ['CAM-03', 'Manual look'],
      ['CAM-04', 'Shake, slow motion, reduced motion'],
      ['GAME-04', 'Save v2 and migration'],
      ['UI-01', 'HUD'],
      ['UI-02', 'Pause and settings'],
      ['UI-03', 'Results'],
      ['UI-04', 'Title, level select, loading'],
      ['UI-05', 'Rotate prompt, keyboard, accessibility'],
      ['UI-06', 'Remove the old overlay'],
      ['AUD-01', 'SoundBank and buses'],
      ['AUD-02', 'Settings and lifecycle'],
      ['AUD-03', 'Event mapping'],
      ['QA-02', 'Rewrite the e2e suite'],
    ],
  },
  {
    id: 4,
    name: 'Art and audio',
    gate: 'G3',
    tasks: [
      ['REN-02', 'Blocks and damage stages'],
      ['REN-03', 'Characters'],
      ['REN-04', 'Slingshot view'],
      ['REN-05', 'Environment and blob shadows'],
      ['REN-06', 'Particles and effects'],
      ['REN-07', 'Fragments view'],
      ['REN-08', 'Score popups and trail view'],
      ['REN-09', 'Remove old visuals'],
      ['QA-03', 'Deterministic mode and visual baselines'],
      ['AUD-04', 'Generated SFX pipeline'],
      ['AUD-07', 'Voices (HUMAN)'],
      ['AUD-05', 'Remove the synth fallback'],
      ['AUD-06', 'Music (HUMAN)'],
      ['AUD-08', 'Listening gate (HUMAN)'],
    ],
  },
  {
    id: 5,
    name: 'Hardening',
    gate: 'G4',
    tasks: [
      ['PERF-02', 'Pools and allocation audit'],
      ['PERF-03', 'Disposal and restart soak'],
      ['PERF-05', 'Load budget'],
      ['PERF-04', 'Device session (HUMAN)'],
    ],
  },
  {
    id: 6,
    name: 'Content',
    gate: 'G5',
    tasks: [
      ['CNT-04', 'Ramp and ledge terrain'],
      ['CNT-01', 'Wheel and triangle kit'],
      ['CNT-02', 'Hat and king pigs'],
      ['CNT-03', 'Blast bot'],
      ['CNT-05', 'Chapter theming'],
      ['CNT-06', 'Chapter 1 levels 6–10'],
      ['CNT-07', 'Chapter 2'],
      ['CNT-08', 'Chapter 3'],
      ['CNT-09', 'Balance pass'],
    ],
  },
];

export function allTaskIds() {
  return PHASES.flatMap((p) => p.tasks.map(([id]) => id));
}

export function defaultTasksRecord() {
  /** @type {Record<string, { status: string, note?: string }>} */
  const tasks = {};
  for (const id of allTaskIds()) {
    tasks[id] = { status: 'todo' };
  }
  return tasks;
}
