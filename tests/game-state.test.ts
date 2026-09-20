import { describe, expect, it } from 'vitest';
import { canAim, canLaunch, isTerminal } from '../src/game/GameState';

describe('GameState guards', () => {
  it('allows aim only with shots and pre-flight states', () => {
    expect(canAim('ready', 3)).toBe(true);
    expect(canAim('flying', 3)).toBe(false);
    expect(canAim('ready', 0)).toBe(false);
    expect(canAim('won', 1)).toBe(false);
  });

  it('marks terminal outcomes', () => {
    expect(isTerminal('won')).toBe(true);
    expect(isTerminal('lost')).toBe(true);
    expect(isTerminal('resolving')).toBe(false);
  });

  it('allows launch from coil or flight phases', () => {
    expect(canLaunch('coiling')).toBe(true);
    expect(canLaunch('flying')).toBe(true);
    expect(canLaunch('ready')).toBe(false);
  });

  it('blocks aim while resolving or paused', () => {
    expect(canAim('resolving', 2)).toBe(false);
    expect(canAim('paused', 2)).toBe(false);
  });
});
