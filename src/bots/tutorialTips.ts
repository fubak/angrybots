import type { BotKind } from './types';

/** First-time ability callouts (I05). */
export const BOT_TUTORIAL_TIPS: Record<BotKind, string | null> = {
  grok: 'Pull back opposite your aim, then release to launch Grok at pigs and supports.',
  dash: 'Dash adds extra strike speed—drive through beams and glass for big hits.',
  heavy: 'Heavy weighs more—use it to crack stone and topple tall forts.',
  split: 'Split bursts into two on first impact—aim into clusters or weak glass.',
};

export function tutorialTipFor(kind: BotKind): string | null {
  return BOT_TUTORIAL_TIPS[kind];
}

export function firstUnseenBotInQueue(
  queue: BotKind[],
  seen: Partial<Record<BotKind, boolean>>
): BotKind | null {
  for (const kind of queue) {
    if (kind === 'grok') continue;
    if (!seen[kind]) return kind;
  }
  return null;
}
