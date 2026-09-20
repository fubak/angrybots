import type { LevelDef } from './types';

export const GLASSWORKS_BATCH: LevelDef[] = [
  {
    id: 'glass-columns',
    name: 'Glass Columns',
    subtitle: 'Snap the side columns',
    shots: 4,
    chapter: 'glassworks',
    bots: ['grok', 'dash', 'grok', 'split'],
    starScores: [7500, 13000, 20000],
    pigs: [[5.2, 2.95]],
    blocks: [
      { material: 'stone', size: [2.6, 0.4, 0.9], pos: [5.2, 0.38] },
      { material: 'wood', size: [0.42, 1.2, 0.85], pos: [4.35, 0.92] },
      { material: 'wood', size: [0.42, 1.2, 0.85], pos: [6.05, 0.92] },
      { material: 'wood', size: [2.2, 0.36, 0.85], pos: [5.2, 0.78] },
      { material: 'glass', size: [0.36, 0.85, 0.85], pos: [4.55, 1.75] },
      { material: 'glass', size: [0.36, 0.85, 0.85], pos: [5.85, 1.75] },
      { material: 'wood', size: [2.3, 0.36, 0.85], pos: [5.2, 2.45] },
      { material: 'stone', size: [1, 0.32, 0.9], pos: [5.2, 2.95] },
    ],
  },
  {
    id: 'glass-bridge',
    name: 'Glass Bridge',
    subtitle: 'Collapse the span',
    shots: 3,
    chapter: 'glassworks',
    starScores: [7000, 12500, 19000],
    pigs: [
      [4.35, 1.62],
      [6.05, 1.62],
    ],
    blocks: [
      { material: 'stone', size: [3, 0.42, 0.9], pos: [5.2, 0.4] },
      { material: 'glass', size: [2.5, 0.32, 0.85], pos: [5.2, 0.88] },
      { material: 'wood', size: [0.4, 1.1, 0.85], pos: [4.3, 1.05] },
      { material: 'wood', size: [0.4, 1.1, 0.85], pos: [6.1, 1.05] },
      { material: 'glass', size: [0.32, 0.55, 0.85], pos: [4.35, 1.65] },
      { material: 'glass', size: [0.32, 0.55, 0.85], pos: [6.05, 1.65] },
    ],
  },
];
