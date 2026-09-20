import type { LevelDef } from './types';

/** Training — two pigs on a deck. */
export const LEVEL_5: LevelDef = {
  id: 'twin-posts',
  name: 'Twin Posts',
  subtitle: 'Clear both rivals',
  shots: 3,
  chapter: 'training',
  bots: ['grok', 'split', 'grok'],
  starScores: [5500, 9500, 15000],
  pigs: [
    [4.7, 1.62],
    [5.7, 1.62],
  ],
  blocks: [
    { material: 'stone', size: [3, 0.42, 0.9], pos: [5.2, 0.4] },
    { material: 'wood', size: [0.45, 1.5, 0.85], pos: [4.2, 1.05] },
    { material: 'wood', size: [0.45, 1.5, 0.85], pos: [6.2, 1.05] },
    { material: 'wood', size: [2.6, 0.4, 0.85], pos: [5.2, 0.88] },
    { material: 'glass', size: [0.32, 0.55, 0.85], pos: [4.7, 1.65] },
    { material: 'glass', size: [0.32, 0.55, 0.85], pos: [5.7, 1.65] },
  ],
};
