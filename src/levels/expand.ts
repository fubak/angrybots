import type { LevelV2 } from './schema';
import { KIT, type KitId } from './kit';

export type ExpandedBlock = {
  id: string;
  material: 'wood' | 'stone' | 'glass' | 'tnt';
  shape: 'box' | 'circle' | 'triangle';
  w: number;
  h: number;
  r?: number;
  cx: number;
  cy: number;
  rot?: 0 | 90;
  triMirror?: boolean;
};

export type ExpandedPig = {
  id: string;
  size: 'S' | 'M' | 'L';
  helmet?: 'hat' | 'helmet';
  r: number;
  cx: number;
  cy: number;
};

export type ExpandedLevel = Omit<LevelV2, 'blocks' | 'pigs'> & {
  blocks: ExpandedBlock[];
  pigs: ExpandedPig[];
};

function kitSize(
  kit: KitId,
  rot?: 0 | 90
): { w: number; h: number; shape: 'box' | 'circle' | 'triangle'; r?: number; triMirror?: boolean } {
  const def = KIT[kit];
  if (def.kind === 'circle') return { w: def.r * 2, h: def.r * 2, shape: 'circle', r: def.r };
  if (def.kind === 'triangle') {
    return { w: def.w, h: def.h, shape: 'triangle', triMirror: def.mirror };
  }
  let w = def.w;
  let h = def.h;
  if (rot === 90) [w, h] = [h, w];
  return { w, h, shape: 'box' };
}

export function expandLevel(level: LevelV2): ExpandedLevel {
  const blocks: ExpandedBlock[] = level.blocks.map((b, i) => {
    const k = kitSize(b.kit, b.rot);
    const cy = k.shape === 'circle' ? b.y + (k.r ?? 0) : b.y + k.h / 2;
    return {
      id: b.id ?? `b${i}`,
      material: b.material,
      shape: k.shape,
      w: k.w,
      h: k.h,
      r: k.r,
      cx: b.x,
      cy,
      rot: b.rot,
      triMirror: k.triMirror,
    };
  });
  const pigs: ExpandedPig[] = level.pigs.map((p, i) => {
    const r =
      p.size === 'S' ? 0.4 : p.size === 'M' ? 0.55 : 0.75;
    return {
      id: p.id ?? `p${i}`,
      size: p.size,
      helmet: p.helmet,
      r,
      cx: p.x,
      cy: p.y + r,
    };
  });
  return { ...level, blocks, pigs };
}
