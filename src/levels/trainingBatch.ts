import { trainingFortLevel } from './authoring/fortDeck';
import type { LevelDef } from './types';

export const TRAINING_BATCH: LevelDef[] = [
  trainingFortLevel({
    id: 'stone-lip',
    name: 'Stone Lip',
    subtitle: 'Punch through the lip',
    shots: 2,
    chapter: 'training',
    starScores: [4500, 8000, 12000],
    pigs: [[5.2, 1.58]],
    extraBlocks: [
      { material: 'stone', size: [1.4, 0.35, 0.9], pos: [5.2, 1.05] },
    ],
  }),
  trainingFortLevel({
    id: 'glass-windows',
    name: 'Glass Windows',
    subtitle: 'Shatter the greenhouses',
    shots: 3,
    chapter: 'training',
    starScores: [6000, 11000, 17000],
    pigs: [
      [4.75, 1.62],
      [5.65, 1.62],
    ],
    extraBlocks: [
      { material: 'glass', size: [0.34, 0.58, 0.85], pos: [4.75, 1.65] },
      { material: 'glass', size: [0.34, 0.58, 0.85], pos: [5.65, 1.65] },
    ],
  }),
  trainingFortLevel({
    id: 'triple-deck',
    name: 'Triple Deck',
    subtitle: 'Clear the stacked deck',
    shots: 4,
    chapter: 'training',
    starScores: [9000, 16000, 24000],
    pigs: [
      [4.35, 1.6],
      [6.05, 1.6],
      [5.2, 2.85],
    ],
    postHeight: 1.35,
    extraBlocks: [
      { material: 'wood', size: [2.4, 0.36, 0.85], pos: [5.2, 2.35] },
      { material: 'stone', size: [1.1, 0.32, 0.9], pos: [5.2, 2.85] },
    ],
  }),
  trainingFortLevel({
    id: 'dash-lane',
    name: 'Dash Lane',
    subtitle: 'Use speed on the center beam',
    shots: 3,
    chapter: 'training',
    bots: ['dash', 'grok', 'dash'],
    starScores: [5500, 10000, 16000],
    pigs: [[5.2, 1.58]],
    extraBlocks: [
      { material: 'stone', size: [0.9, 0.9, 0.9], pos: [5.2, 1.05] },
    ],
  }),
  trainingFortLevel({
    id: 'heavy-gate',
    name: 'Heavy Gate',
    subtitle: 'Send the heavy bot into stone',
    shots: 2,
    chapter: 'training',
    bots: ['heavy', 'grok'],
    starScores: [5000, 9000, 14000],
    pigs: [[5.2, 1.58]],
    extraBlocks: [
      { material: 'stone', size: [1.6, 0.55, 0.9], pos: [5.2, 0.95] },
    ],
  }),
];
