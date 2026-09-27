import { describe, expect, it } from 'vitest';
import { shotReaction } from '../../src/render/celestialMood';

// The sun/moon verdict on a finished shot drives a one-shot face animation —
// wrong boundaries would make it cheer a whiff or shrug at a castle-winner.
describe('shotReaction', () => {
  it('winning the level is always great', () => {
    expect(shotReaction({ kills: 0, shotScore: 0, won: true })).toBe('great');
  });

  it('two or more kills is great even without winning', () => {
    expect(shotReaction({ kills: 2, shotScore: 0, won: false })).toBe('great');
    expect(shotReaction({ kills: 5, shotScore: 1200, won: false })).toBe('great');
  });

  it('one kill or a 3000+ shot is good', () => {
    expect(shotReaction({ kills: 1, shotScore: 0, won: false })).toBe('good');
    expect(shotReaction({ kills: 0, shotScore: 3000, won: false })).toBe('good');
    expect(shotReaction({ kills: 0, shotScore: 9999, won: false })).toBe('good');
  });

  it('a scoreless whiff below 500 is a miss', () => {
    expect(shotReaction({ kills: 0, shotScore: 0, won: false })).toBe('miss');
    expect(shotReaction({ kills: 0, shotScore: 499, won: false })).toBe('miss');
  });

  it('unremarkable shots get no reaction', () => {
    // A kill-free shot with decent chip damage: neither funny nor sad.
    expect(shotReaction({ kills: 0, shotScore: 500, won: false })).toBeNull();
    expect(shotReaction({ kills: 0, shotScore: 2999, won: false })).toBeNull();
  });
});
