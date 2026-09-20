import { describe, expect, it } from 'vitest';
import { LEVEL_1 } from '../src/levels/level1';
import { LEVEL_2 } from '../src/levels/level2';
import { LEVEL_3 } from '../src/levels/level3';

const PIG_R = 0.55;
const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

function centerInsideBlock(
  px: number,
  py: number,
  bx: number,
  by: number,
  hw: number,
  hh: number,
  inset = 0.08
) {
  return (
    Math.abs(px - bx) <= hw - inset && Math.abs(py - by) <= hh - inset
  );
}

/** Flag interior spawns; allow deck/cap seating and glass-window pigs. */
function badPigBlockSpawn(
  px: number,
  py: number,
  bx: number,
  by: number,
  hw: number,
  hh: number,
  material: string
) {
  if (material === 'glass') return false;
  if (hh <= hw * 1.05) return false;
  if (!centerInsideBlock(px, py, bx, by, hw, hh)) return false;
  const blockTop = by + hh;
  const pigBottom = py - PIG_R;
  const seated =
    Math.abs(px - bx) <= hw &&
    pigBottom >= blockTop - PIG_R * 0.7 &&
    pigBottom <= blockTop + 0.2;
  return !seated;
}

describe('level layout', () => {
  it('has no pig centers spawned inside block interiors', () => {
    const overlaps: string[] = [];
    for (const level of LEVELS) {
      for (const [px, py] of level.pigs) {
        for (const b of level.blocks) {
          const [sx, sy] = b.size;
          const [bx, by] = b.pos;
          if (
            badPigBlockSpawn(px, py, bx, by, sx / 2, sy / 2, b.material)
          ) {
            overlaps.push(`${level.id} pig (${px},${py}) vs block at (${bx},${by})`);
          }
        }
      }
    }
    expect(overlaps).toEqual([]);
  });

  it('has no overlapping pig spawns', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < level.pigs.length; i++) {
        for (let j = i + 1; j < level.pigs.length; j++) {
          const [x1, y1] = level.pigs[i];
          const [x2, y2] = level.pigs[j];
          const d = Math.hypot(x1 - x2, y1 - y2);
          expect(d).toBeGreaterThan(PIG_R * 2 - 0.2);
        }
      }
    }
  });
});
