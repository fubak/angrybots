import type { BlockMaterial } from '../config';

export type LevelBlock = {
  material: BlockMaterial;
  size: [number, number, number];
  pos: [number, number];
  rot?: number;
};

export type LevelDef = {
  id: string;
  name: string;
  subtitle: string;
  shots: number;
  pigs: [number, number][];
  blocks: LevelBlock[];
  /** [1-star, 2-star, 3-star] score thresholds */
  starScores: [number, number, number];
  camera?: { centerX: number; centerY: number; frustumHeight: number };
};
