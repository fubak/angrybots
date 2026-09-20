import type { LevelDef } from './types';

/** Support removal — roof rests on glass; side posts stop below the roof line. */
export const LEVEL_2: LevelDef = {
  id: 'glass-arch',
  name: 'Glass Arch',
  subtitle: 'Break the weak glass to drop the roof pig',
  shots: 4,
  chapter: 'glassworks',
  bots: ['grok', 'dash', 'grok', 'dash'],
  starScores: [8000, 14000, 22000],
  pigs: [[5.2, 3.72]],
  blocks: [
    { material: 'stone', size: [2.8, 0.4, 0.9], pos: [5.2, 0.38] },
    { material: 'wood', size: [0.45, 1.35, 0.85], pos: [4.15, 0.95] },
    { material: 'wood', size: [0.45, 1.35, 0.85], pos: [6.25, 0.95] },
    { material: 'wood', size: [2.4, 0.38, 0.85], pos: [5.2, 0.82] },
    { material: 'glass', size: [0.38, 0.75, 0.85], pos: [4.55, 1.85] },
    { material: 'glass', size: [0.38, 0.75, 0.85], pos: [5.85, 1.85] },
    { material: 'wood', size: [2.5, 0.38, 0.85], pos: [5.2, 2.55] },
    { material: 'stone', size: [1.05, 0.35, 0.9], pos: [5.2, 3.05] },
  ],
};
