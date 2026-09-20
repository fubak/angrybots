import type { BotKind } from '../levels/schema';
import { TUNING } from '../config/tuning';

export type BotProfile = {
  kind: BotKind;
  radius: number;
  density: number;
  mass: number;
  launchSpeedMul: number;
  affinityNote: string;
  ability: string;
};

function mass(r: number, density: number): number {
  return density * Math.PI * r * r;
}

export const BOT_PROFILES: Record<BotKind, BotProfile> = {
  grok: {
    kind: 'grok',
    radius: TUNING.bots.grok.r,
    density: TUNING.bots.grok.density,
    mass: mass(TUNING.bots.grok.r, TUNING.bots.grok.density),
    launchSpeedMul: 1,
    affinityNote: 'none',
    ability: 'none',
  },
  dash: {
    kind: 'dash',
    radius: TUNING.bots.dash.r,
    density: TUNING.bots.dash.density,
    mass: mass(TUNING.bots.dash.r, TUNING.bots.dash.density),
    launchSpeedMul: 1,
    affinityNote: 'wood ×2',
    ability: 'boost',
  },
  split: {
    kind: 'split',
    radius: TUNING.bots.split.r,
    density: TUNING.bots.split.density,
    mass: mass(TUNING.bots.split.r, TUNING.bots.split.density),
    launchSpeedMul: 1,
    affinityNote: 'glass ×2.5',
    ability: 'split',
  },
  heavy: {
    kind: 'heavy',
    radius: TUNING.bots.heavy.r,
    density: TUNING.bots.heavy.density,
    mass: mass(TUNING.bots.heavy.r, TUNING.bots.heavy.density),
    launchSpeedMul: 1,
    affinityNote: 'stone ×2',
    ability: 'slam',
  },
  blast: {
    kind: 'blast',
    radius: TUNING.bots.blast.r,
    density: TUNING.bots.blast.density,
    mass: mass(TUNING.bots.blast.r, TUNING.bots.blast.density),
    launchSpeedMul: 1,
    affinityNote: 'none',
    ability: 'detonate',
  },
};
