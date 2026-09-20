export type ScoreBreakdown = {
  pigs: number;
  blocks: number;
  birdsLeft: number;
  total: number;
};

export function computeScore(
  pigsCleared: number,
  blocksBroken: number,
  birdsLeft: number,
  pigValue = 5000,
  blockValue = 120,
  birdBonus = 10000
): ScoreBreakdown {
  const pigs = pigsCleared * pigValue;
  const blocks = blocksBroken * blockValue;
  const birds = birdsLeft * birdBonus;
  return { pigs, blocks, birdsLeft: birds, total: pigs + blocks + birds };
}

export function starsForScore(
  score: number,
  thresholds: [number, number, number]
): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
