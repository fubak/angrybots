import { describe, expect, it } from 'vitest';
import { canAim } from '../src/game/GameState';

/** A02 guard: no aim/input when ammunition is spent. */
describe('ammunition guards', () => {
  it('disallows aim when shotsLeft is zero', () => {
    expect(canAim('ready', 0)).toBe(false);
    expect(canAim('aiming', 0)).toBe(false);
  });

  it('allows aim while shots remain in pre-flight states', () => {
    expect(canAim('ready', 1)).toBe(true);
    expect(canAim('coiling', 1)).toBe(true);
  });
});
