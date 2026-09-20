import { describe, expect, it } from 'vitest';
import { MATERIAL } from '../src/config';

/** B09: material break thresholds differ by design. */
describe('material damage tuning', () => {
  it('glass breaks more easily than stone', () => {
    expect(MATERIAL.glass.minImpulse).toBeLessThan(MATERIAL.stone.minImpulse);
    expect(MATERIAL.glass.hp).toBeLessThan(MATERIAL.wood.hp);
  });

  it('stone resists more than wood per impulse', () => {
    expect(MATERIAL.stone.damageScale).toBeLessThan(MATERIAL.wood.damageScale);
    expect(MATERIAL.stone.minDamage).toBeGreaterThan(MATERIAL.glass.minDamage);
  });

  it('explosive has blast radius configured', () => {
    expect(MATERIAL.explosive.blastRadius).toBeGreaterThan(0);
    expect(MATERIAL.explosive.blastImpulse).toBeGreaterThan(0);
  });
});
