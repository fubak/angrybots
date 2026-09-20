import type { BlockMaterial } from '../config';
import type { BotKind } from '../bots/types';

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
  /** Chapter/theme id for progression (Gate 3). */
  chapter?: string;
  /** Per-shot bot types; padded with Grok when shorter than `shots`. */
  bots?: BotKind[];
  camera?: { centerX: number; centerY: number; frustumHeight: number };
};
