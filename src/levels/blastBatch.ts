import type { LevelDef } from './types';

export const BLAST_BATCH: LevelDef[] = [
  {
    id: 'tnt-pillar',
    name: 'TNT Pillar',
    subtitle: 'Topple the pillar',
    shots: 3,
    chapter: 'blast',
    bots: ['grok', 'heavy', 'grok'],
    starScores: [9000, 16000, 25000],
    pigs: [[5.2, 2.75]],
    blocks: [
      { material: 'stone', size: [2.8, 0.42, 0.9], pos: [5.2, 0.4] },
      { material: 'wood', size: [0.48, 1.7, 0.85], pos: [4.35, 1.15] },
      { material: 'wood', size: [0.48, 1.7, 0.85], pos: [6.05, 1.15] },
      { material: 'explosive', size: [0.5, 0.5, 0.85], pos: [5.2, 1.05] },
      { material: 'wood', size: [2.4, 0.38, 0.85], pos: [5.2, 1.55] },
      { material: 'stone', size: [1, 0.32, 0.9], pos: [5.2, 2.75] },
    ],
  },
  {
    id: 'tnt-duo',
    name: 'TNT Duo',
    subtitle: 'Chain both crates',
    shots: 4,
    chapter: 'blast',
    bots: ['split', 'grok', 'heavy', 'grok'],
    starScores: [11000, 19000, 30000],
    pigs: [
      [4.7, 1.5],
      [5.7, 1.5],
      [5.2, 2.9],
    ],
    blocks: [
      { material: 'stone', size: [3.1, 0.42, 0.9], pos: [5.2, 0.4] },
      { material: 'wood', size: [0.5, 1.75, 0.85], pos: [4.15, 1.2] },
      { material: 'wood', size: [0.5, 1.75, 0.85], pos: [6.25, 1.2] },
      { material: 'explosive', size: [0.52, 0.52, 0.85], pos: [4.7, 1.55] },
      { material: 'explosive', size: [0.52, 0.52, 0.85], pos: [5.7, 1.55] },
      { material: 'wood', size: [2.6, 0.38, 0.85], pos: [5.2, 2.35] },
      { material: 'stone', size: [1.05, 0.34, 0.9], pos: [5.2, 2.9] },
    ],
  },
];
