import type { LevelDef } from './types';

/** Support removal — glass weak point under roof pig. */
export const LEVEL_2: LevelDef = {
  id: 'glass-arch',
  name: 'Glass Arch',
  subtitle: 'Break the weak glass to drop the roof pig',
  shots: 3,
  starScores: [8000, 14000, 22000],
  pigs: [[5.2, 3.78]],
  blocks: [
    { material: 'stone', size: [2.8, 0.4, 0.9], pos: [5.2, 0.38] },
    { material: 'wood', size: [0.45, 2.1, 0.85], pos: [4.1, 1.45] },
    { material: 'wood', size: [0.45, 2.1, 0.85], pos: [6.3, 1.45] },
    { material: 'wood', size: [2.4, 0.38, 0.85], pos: [5.2, 0.88] },
    { material: 'glass', size: [0.32, 0.55, 0.85], pos: [4.55, 2.05] },
    { material: 'glass', size: [0.32, 0.55, 0.85], pos: [5.85, 2.05] },
    { material: 'wood', size: [2.5, 0.38, 0.85], pos: [5.2, 2.55] },
    { material: 'stone', size: [1.1, 0.35, 0.9], pos: [5.2, 3.05] },
  ],
};
