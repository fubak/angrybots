import * as THREE from 'three';
import type { BlockMaterial } from '../config';

export type LevelBlock = {
  material: BlockMaterial;
  size: [number, number, number];
  pos: [number, number];
  rot?: number;
};

export type LevelDef = {
  name: string;
  subtitle: string;
  pigs: [number, number][];
  blocks: LevelBlock[];
};

/** Training yard — compact frame that stays stacked when physics wakes. */
export const LEVEL_1: LevelDef = {
  name: 'Training Yard',
  subtitle: 'Clear all rival pigs in 3 launches',
  pigs: [
    [4.85, 1.12],
    [5.85, 1.12],
    [5.35, 2.95],
  ],
  blocks: [
    // Wide stone base (top y ≈ 0.62)
    { material: 'stone', size: [3.4, 0.45, 0.9], pos: [5.35, 0.4] },

    // Main columns (top y ≈ 2.52)
    { material: 'wood', size: [0.48, 1.95, 0.85], pos: [4.05, 1.55] },
    { material: 'wood', size: [0.48, 1.95, 0.85], pos: [6.65, 1.55] },

    // Mid deck for lower pigs (top y ≈ 1.12)
    { material: 'wood', size: [2.85, 0.42, 0.85], pos: [5.35, 0.92] },

    // Upper lintel (top y ≈ 2.52)
    { material: 'wood', size: [3.05, 0.42, 0.85], pos: [5.35, 2.32] },

    // Glass weak points
    { material: 'glass', size: [0.34, 0.62, 0.85], pos: [4.85, 1.72] },
    { material: 'glass', size: [0.34, 0.62, 0.85], pos: [5.85, 1.72] },
    { material: 'explosive', size: [0.52, 0.52, 0.85], pos: [5.35, 1.72] },

    // Roof cap (top y ≈ 3.22)
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
