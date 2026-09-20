import type { BotKind, BotProfile } from './types';

export const BOT_PROFILES: Record<BotKind, BotProfile> = {
  grok: {
    kind: 'grok',
    displayName: 'Grok',
    speedScale: 1,
    massScale: 1,
    visualScale: 1,
    shellColor: 0x353545,
    emissive: 0x1a0c06,
    pipClass: 'grok',
  },
  dash: {
    kind: 'dash',
    displayName: 'Dash',
    speedScale: 1.14,
    massScale: 0.92,
    visualScale: 0.96,
    shellColor: 0x4a4038,
    emissive: 0xff6622,
    pipClass: 'dash',
  },
  heavy: {
    kind: 'heavy',
    displayName: 'Heavy',
    speedScale: 0.88,
    massScale: 1.65,
    visualScale: 1.12,
    shellColor: 0x2a2a32,
    emissive: 0x0a0a12,
    pipClass: 'heavy',
  },
  split: {
    kind: 'split',
    displayName: 'Split',
    speedScale: 0.98,
    massScale: 0.78,
    visualScale: 0.92,
    shellColor: 0x3a4530,
    emissive: 0x44aa22,
    pipClass: 'split',
  },
};

export function botProfile(kind: BotKind): BotProfile {
  return BOT_PROFILES[kind];
}

/** Pad or trim queue to match shot count; default filler is Grok. */
export function normalizeBotQueue(
  shots: number,
  queue?: BotKind[]
): BotKind[] {
  const out: BotKind[] = [];
  for (let i = 0; i < shots; i++) {
    out.push(queue?.[i] ?? 'grok');
  }
  return out;
}
