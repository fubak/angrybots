import type { Material } from '../entities/types';

export const SCORE = {
  pig: 5000,
  kingPig: 10000,
  unusedBot: 10000,
  destroy: { glass: 300, wood: 500, stone: 800, tnt: 500 } as Record<Material, number>,
  damagePerHp: 10,
} as const;

export function starsForScore(
  score: number,
  thresholds: [number, number, number],
  won: boolean
): 0 | 1 | 2 | 3 {
  if (!won) return 0;
  let stars: 1 | 2 | 3 = 1;
  if (score >= thresholds[2]) stars = 3;
  else if (score >= thresholds[1]) stars = 2;
  return stars;
}

export function damagePoints(dealt: number): number {
  return SCORE.damagePerHp * Math.round(dealt);
}
