import { describe, expect, it } from 'vitest';
import { Level, replayLevel } from '../../src/game/Level';
import { levelById } from '../../src/levels/registry';

describe('physics determinism', () => {
  it('same seed and shots yield same score', () => {
    const def = levelById('first-flight')!;
    const shots: [number, number][] = [[34, 18]];
    const a = replayLevel(def, shots);
    const b = replayLevel(def, shots);
    expect(a.hooks.score).toBe(b.hooks.score);
    expect(a.pigsAlive()).toBe(b.pigsAlive());
  });

  it('Level.load is repeatable', () => {
    const def = levelById('powder-row')!;
    const l1 = Level.load(def);
    const l2 = Level.load(def);
    l1.settle();
    l2.settle();
    expect(l1.registry.all().length).toBe(l2.registry.all().length);
  });
});
