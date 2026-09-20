import { describe, expect, it } from 'vitest';
import * as CANNON from 'cannon-es';
import { MaterialRegistry } from '../src/physics/materials';

/** B03: block materials are shared instances wired into ContactMaterial pairs. */
describe('MaterialRegistry', () => {
  it('returns the same Cannon material for each block type', () => {
    const reg = new MaterialRegistry();
    const a = reg.forBlock('wood');
    const b = reg.forBlock('wood');
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CANNON.Material);
  });

  it('registers contact materials on the world', () => {
    const world = new CANNON.World();
    const reg = new MaterialRegistry();
    reg.wireContactMaterials(world);
    expect(world.contactmaterials.length).toBeGreaterThan(8);
  });
});
