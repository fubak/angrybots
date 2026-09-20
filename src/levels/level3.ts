import type { LevelDef } from './types';

/** Chain reaction — center TNT under stacked deck. */
export const LEVEL_3: LevelDef = {
  id: 'tnt-yard',
  name: 'Blast Yard',
  subtitle: 'Detonate TNT to clear the deck',
  shots: 3,
  starScores: [10000, 18000, 28000],
  pigs: [
    [4.6, 1.45],
    [5.8, 1.45],
    [5.2, 2.85],
  ],
  blocks: [
    { material: 'stone', size: [3.2, 0.42, 0.9], pos: [5.2, 0.4] },
    { material: 'wood', size: [0.5, 1.85, 0.85], pos: [4.05, 1.35] },
    { material: 'wood', size: [0.5, 1.85, 0.85], pos: [6.35, 1.35] },
    { material: 'wood', size: [2.7, 0.4, 0.85], pos: [5.2, 1.05] },
    { material: 'explosive', size: [0.55, 0.55, 0.85], pos: [5.2, 1.55] },
    { material: 'glass', size: [0.34, 0.55, 0.85], pos: [4.6, 1.65] },
    { material: 'glass', size: [0.34, 0.55, 0.85], pos: [5.8, 1.65] },
    { material: 'wood', size: [2.8, 0.38, 0.85], pos: [5.2, 2.35] },
    { material: 'stone', size: [1.0, 0.38, 0.9], pos: [5.2, 2.95] },
  ],
};
