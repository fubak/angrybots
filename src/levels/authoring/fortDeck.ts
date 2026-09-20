import type { BotKind } from '../../bots/types';
import type { LevelBlock, LevelDef } from '../types';

/** Standard side-post fort deck for authoring (B12-friendly layouts). */
export function trainingFortLevel(opts: {
  id: string;
  name: string;
  subtitle: string;
  shots: number;
  chapter: string;
  starScores: [number, number, number];
  pigs: [number, number][];
  bots?: BotKind[];
  deckWidth?: number;
  postHeight?: number;
  extraBlocks?: LevelBlock[];
}): LevelDef {
  const cx = 5.2;
  const deckW = opts.deckWidth ?? 2.8;
  const postH = opts.postHeight ?? 1.45;
  const half = deckW / 2;
  const blocks: LevelBlock[] = [
    { material: 'stone', size: [deckW + 0.5, 0.42, 0.9], pos: [cx, 0.4] },
    { material: 'wood', size: [0.45, postH, 0.85], pos: [cx - half + 0.15, 0.42 + postH / 2] },
    { material: 'wood', size: [0.45, postH, 0.85], pos: [cx + half - 0.15, 0.42 + postH / 2] },
    { material: 'wood', size: [deckW, 0.38, 0.85], pos: [cx, 0.42 + postH - 0.1] },
    ...(opts.extraBlocks ?? []),
  ];
  return {
    id: opts.id,
    name: opts.name,
    subtitle: opts.subtitle,
    shots: opts.shots,
    chapter: opts.chapter,
    starScores: opts.starScores,
    pigs: opts.pigs,
    bots: opts.bots,
    blocks,
  };
}
