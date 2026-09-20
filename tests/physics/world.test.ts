import planck, { Vec2 } from 'planck';
import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/config/tuning';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';

const { Circle } = planck;

describe('PhysicsWorld', () => {
  it('steps exactly 1/60 per step call', () => {
    const pw = new PhysicsWorld();
    expect(pw.steps).toBe(0);
    pw.step();
    expect(pw.steps).toBe(1);
    expect(pw.dt).toBeCloseTo(1 / 60, 9);
  });

  it('circle dropped from y=5 lands near ground', () => {
    const pw = new PhysicsWorld();
    const r = 0.5;
    const body = pw.world.createBody({ type: 'dynamic', position: Vec2(0, 5) });
    body.createFixture({ shape: Circle(r), density: 1 });
    const steps = Math.round(2 / TUNING.dt);
    for (let i = 0; i < steps; i++) pw.step();
    const y = body.getPosition().y;
    expect(Math.abs(y - r)).toBeLessThan(0.01);
  });

  it('queues removal during callback and flushes after step without throwing', () => {
    const pw = new PhysicsWorld();
    const r = 0.2;
    const body = pw.world.createBody({ type: 'dynamic', position: Vec2(0, r + 0.001) });
    body.createFixture({ shape: Circle(r), density: 1 });
    pw.world.on('post-solve', () => {
      pw.queueRemoval(body);
    });
    expect(() => pw.step()).not.toThrow();
    let dynamicCount = 0;
    for (let b = pw.world.getBodyList(); b; b = b.getNext()) {
      if (b.isDynamic()) dynamicCount++;
    }
    expect(dynamicCount).toBe(0);
  });
});
