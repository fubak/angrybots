import { describe, expect, it } from 'vitest';
import { BOT_PROFILES, normalizeBotQueue } from '../src/bots/registry';

describe('bot registry', () => {
  it('defines four distinct mechanical profiles', () => {
    const kinds = Object.keys(BOT_PROFILES);
    expect(kinds).toHaveLength(4);
    const speeds = new Set(Object.values(BOT_PROFILES).map((p) => p.speedScale));
    const masses = new Set(Object.values(BOT_PROFILES).map((p) => p.massScale));
    expect(speeds.size).toBeGreaterThan(1);
    expect(masses.size).toBeGreaterThan(1);
  });

  it('normalizes bot queue length to shots', () => {
    expect(normalizeBotQueue(3)).toEqual(['grok', 'grok', 'grok']);
    expect(normalizeBotQueue(4, ['dash', 'heavy'])).toEqual([
      'dash',
      'heavy',
      'grok',
      'grok',
    ]);
  });
});
