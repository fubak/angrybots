import { trainingFortLevel } from './authoring/fortDeck';
import type { LevelDef } from './types';

export const TRAINING_EXTENDED: LevelDef[] = [
  trainingFortLevel({
    id: 'split-salvo',
    name: 'Split Salvo',
    subtitle: 'Burst both guards',
    shots: 3,
    chapter: 'training',
    bots: ['split', 'grok', 'grok'],
    starScores: [6500, 11500, 17500],
    pigs: [
      [4.65, 1.6],
      [5.75, 1.6],
    ],
    extraBlocks: [
      { material: 'wood', size: [0.55, 0.55, 0.85], pos: [4.65, 1.05] },
      { material: 'wood', size: [0.55, 0.55, 0.85], pos: [5.75, 1.05] },
    ],
  }),
  trainingFortLevel({
    id: 'wood-stack',
    name: 'Wood Stack',
    subtitle: 'Splinter the stack',
    shots: 3,
    chapter: 'training',
    starScores: [5000, 9000, 14000],
    pigs: [[5.2, 1.58]],
    extraBlocks: [
      { material: 'wood', size: [1.2, 0.45, 0.85], pos: [5.2, 0.95] },
      { material: 'wood', size: [0.9, 0.4, 0.85], pos: [5.2, 1.35] },
    ],
  }),
  trainingFortLevel({
    id: 'stone-shelf',
    name: 'Stone Shelf',
    subtitle: 'Drop the shelf',
    shots: 2,
    chapter: 'training',
    bots: ['heavy', 'grok'],
    starScores: [4800, 8500, 13000],
    pigs: [[5.2, 2.05]],
    postHeight: 1.25,
    extraBlocks: [
      { material: 'stone', size: [1.8, 0.38, 0.9], pos: [5.2, 1.55] },
    ],
  }),
  trainingFortLevel({
    id: 'narrow-peak',
    name: 'Narrow Peak',
    subtitle: 'Topple the peak pig',
    shots: 3,
    chapter: 'training',
    starScores: [7200, 12800, 19500],
    pigs: [[5.2, 2.75]],
    postHeight: 1.55,
    deckWidth: 2.2,
    extraBlocks: [
      { material: 'wood', size: [1.4, 0.36, 0.85], pos: [5.2, 2.25] },
      { material: 'stone', size: [0.85, 0.32, 0.9], pos: [5.2, 2.75] },
    ],
  }),
  trainingFortLevel({
    id: 'balanced-trio',
    name: 'Balanced Trio',
    subtitle: 'Three pigs, one plan',
    shots: 4,
    chapter: 'training',
    bots: ['grok', 'dash', 'split', 'grok'],
    starScores: [9500, 17000, 26000],
    pigs: [
      [4.35, 1.6],
      [6.05, 1.6],
      [5.2, 2.55],
    ],
    extraBlocks: [
      { material: 'wood', size: [2.5, 0.36, 0.85], pos: [5.2, 2.05] },
      { material: 'stone', size: [0.95, 0.32, 0.9], pos: [5.2, 2.55] },
    ],
  }),
];
