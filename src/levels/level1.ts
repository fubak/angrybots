import * as THREE from 'three';
import type { LevelBlock, LevelDef } from './types';

export type { LevelBlock, LevelDef };

/** Training yard — intro fort (fixed pig placement on deck). */
export const LEVEL_1: LevelDef = {
  id: 'training-yard',
  name: 'Training Yard',
  subtitle: 'Clear all rival pigs',
  shots: 3,
  chapter: 'training',
  starScores: [6000, 12000, 20000],
  pigs: [
    [4.85, 1.68],
    [5.85, 1.68],
    [5.35, 3.08],
  ],
  blocks: [
    { material: 'stone', size: [3.4, 0.45, 0.9], pos: [5.35, 0.4] },
    { material: 'wood', size: [0.48, 1.95, 0.85], pos: [4.05, 1.55] },
    { material: 'wood', size: [0.48, 1.95, 0.85], pos: [6.65, 1.55] },
    { material: 'wood', size: [2.85, 0.42, 0.85], pos: [5.35, 0.92] },
    { material: 'wood', size: [3.05, 0.42, 0.85], pos: [5.35, 2.32] },
    { material: 'glass', size: [0.34, 0.62, 0.85], pos: [4.85, 1.72] },
    { material: 'glass', size: [0.34, 0.62, 0.85], pos: [5.85, 1.72] },
    { material: 'explosive', size: [0.52, 0.52, 0.85], pos: [5.35, 1.72] },
    { material: 'stone', size: [1.05, 0.4, 0.9], pos: [5.35, 3.02] },
  ],
};

export function blockVector(b: LevelBlock) {
  return {
    size: new THREE.Vector3(...b.size),
    pos: new THREE.Vector3(b.pos[0], b.pos[1], 0),
    rot: b.rot ?? 0,
  };
}
