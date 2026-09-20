import type { LevelDef } from './types';

/** Training — low wall, single pig. */
export const LEVEL_4: LevelDef = {
  id: 'low-wall',
  name: 'Low Wall',
  subtitle: 'Break through the short fort',
  shots: 2,
  chapter: 'training',
  starScores: [4000, 7000, 11000],
  pigs: [[5.1, 1.55]],
  blocks: [
    { material: 'stone', size: [2.6, 0.4, 0.9], pos: [5.1, 0.38] },
    { material: 'wood', size: [0.42, 1.2, 0.85], pos: [4.35, 0.95] },
    { material: 'wood', size: [0.42, 1.2, 0.85], pos: [5.85, 0.95] },
    { material: 'wood', size: [2.2, 0.38, 0.85], pos: [5.1, 0.78] },
  ],
};
