import { describe, expect, it } from 'vitest';
import { Vec2 } from 'planck';
import { loadLevelFromJson } from '../../src/levels/load';
import { Level } from '../../src/game/Level';
import type { PigEntity } from '../../src/entities/types';

function tiny(pigs: { id: string; x: number; y: number }[]) {
  return loadLevelFromJson({
    version: 2,
    id: 'grounded-test',
    name: 'Grounded',
    chapter: 'training',
    order: 99,
    bots: ['grok'],
    stars: [1, 2, 3],
    camera: { minX: -11, maxX: 16, minY: 0, maxY: 9 },
    sling: { x: -7.5 },
    terrain: [],
    blocks: [],
    pigs: pigs.map((p) => ({ ...p, size: 'M' })),
  });
}

function pig(sim: Level, id: string): PigEntity {
  const e = sim.registry.all().find((x) => x.id === id);
  if (!e || e.kind !== 'pig') throw new Error(`no pig ${id}`);
  return e;
}

describe('grounded targets', () => {
  it('leaves a resting pig alone', () => {
    const sim = Level.load(tiny([{ id: 'p', x: 8, y: 0 }]));
    sim.settle();
    sim.idle(3);
    expect(pig(sim, 'p').alive).toBe(true);
  });

  it('finishes an airborne pig the moment it lands', () => {
    const sim = Level.load(tiny([{ id: 'p', x: 8, y: 0 }]));
    sim.settle();
    const p = pig(sim, 'p');
    p.body!.setPosition(new Vec2(8, 2.5));
    p.body!.setLinearVelocity(new Vec2(0, 0));
    let lastY = 99;
    for (let i = 0; i < 240 && p.alive; i++) {
      if (p.body) lastY = p.body.getPosition().y;
      sim.step();
    }
    expect(p.airborne).toBe(true);
    expect(p.alive).toBe(false);
    // Still falling on the last frame it was alive: it did not die mid-air.
    expect(lastY).toBeLessThan(p.r + 0.6);
  });

  it('finishes a pig shoved into a long roll along the grass', () => {
    const sim = Level.load(tiny([{ id: 'p', x: 4, y: 0 }]));
    sim.settle();
    const p = pig(sim, 'p');
    p.body!.setLinearVelocity(new Vec2(4, 0));
    p.body!.setAngularVelocity(-8);
    for (let i = 0; i < 300 && p.alive; i++) sim.step();
    expect(p.alive).toBe(false);
  });
});
