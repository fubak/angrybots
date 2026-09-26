import type { BotKind } from '../levels/schema';

export type BotTip = {
  name: string;
  desc: string;
  /** in-flight tap hint */
  hint: string;
};

export const BOT_ORDER: BotKind[] = ['grok', 'dash', 'split', 'heavy', 'blast'];

/** First-time bot intro cards. */
export const BOT_TIPS: Record<BotKind, BotTip> = {
  grok: {
    name: 'Grok',
    desc: 'The all-rounder. Pull back opposite your aim, then release.',
    hint: 'Pull the sling back and let go!',
  },
  dash: {
    name: 'Dash',
    desc: 'Adds a burst of strike speed — drives through beams and glass.',
    hint: 'Tap during flight to dash.',
  },
  split: {
    name: 'Split',
    desc: 'Bursts into two in mid-air — aim into clusters or weak glass.',
    hint: 'Tap during flight to split.',
  },
  heavy: {
    name: 'Heavy',
    desc: 'Weighs a ton — cracks stone and topples tall forts.',
    hint: 'Tap during flight to drop hard.',
  },
  blast: {
    name: 'Blast',
    desc: 'Packed with powder — detonates for splash damage.',
    hint: 'Tap during flight to explode.',
  },
};

export function botTipFor(kind: BotKind): BotTip {
  return BOT_TIPS[kind];
}

export function firstUnseenBotInQueue(
  queue: readonly BotKind[],
  seen: Partial<Record<BotKind, boolean>>
): BotKind | null {
  for (const kind of BOT_ORDER) {
    if (!queue.includes(kind)) continue;
    if (!seen[kind]) return kind;
  }
  return null;
}
