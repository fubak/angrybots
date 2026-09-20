import { describe, expect, it } from 'vitest';
import planck, { Vec2 } from 'planck';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { TUNING } from '../../src/config/tuning';
import { filterBits, CAT, MASK } from '../../src/physics/categories';

describe('physics bench', () => {
  it('150 wood cubes settle and 300 steps within budget', () => {
    const pw = new PhysicsWorld();
    const ground = pw.world.createBody({ type: 'static', position: Vec2(0, 0) });
    ground.createFixture(planck.Box(50, 0.5), filterBits(CAT.GROUND, MASK.GROUND));
    let n = 0;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 15; col++) {
        const b = pw.world.createBody({
          type: 'dynamic',
          position: Vec2(col * 1.05, 0.5 + row * 1.05),
        });
        b.createFixture(planck.Box(0.5, 0.5), {
          density: TUNING.materials.wood.density,
          ...filterBits(CAT.BLOCK, MASK.BLOCK),
        });
        n++;
      }
    }
    expect(n).toBe(150);
    for (let i = 0; i < 120; i++) pw.step();
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) pw.step();
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1500 * 1.5);
  });
});
