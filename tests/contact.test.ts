import { describe, expect, it } from 'vitest';
import { impactFromContact } from '../src/game/ContactSystem';

describe('impactFromContact', () => {
  it('uses absolute relative normal velocity', () => {
    const contact = {
      getImpactVelocityAlongNormal: () => -8.5,
    } as unknown as import('cannon-es').ContactEquation;
    expect(impactFromContact(contact)).toBe(8.5);
  });
});
