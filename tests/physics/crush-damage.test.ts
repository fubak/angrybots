import { describe, expect, it } from 'vitest';
import { Level } from '../../src/game/Level';
import { TUNING } from '../../src/config/tuning';
import type { LevelV2 } from '../../src/levels/schema';
import type { PigEntity } from '../../src/entities/types';

/**
 * Falling-debris crush damage: pig hp is tuned for bot impacts (~20 impulse),
 * so unscaled block hits (2–6 impulse) barely scratched. crushScale on
 * block→pig impacts makes a dropped plank lethal to small pigs.
 */
function dropLevel(over: {
  kit?: string;
  blockY?: number;
  pigSize?: 'S' | 'M' | 'L';
  helmet?: 'hat' | 'helmet';
}): LevelV2 {
  return {
    version: 2,
    id: 'probe',
    name: 'probe',
    chapter: 'training',
    order: 1,
    bots: ['grok'],
    stars: [1, 2, 3],
    camera: { minX: -11, maxX: 17, minY: 0, maxY: 6 },
    sling: { x: -7.5 },
    terrain: [],
    blocks: [
      {
        id: 'b',
        material: 'wood',
        kit: (over.kit ?? 'plankM') as LevelV2['blocks'][number]['kit'],
        x: 5,
        y: over.blockY ?? 3,
      },
    ],
    pigs: [
      {
        id: 'p',
        size: over.pigSize ?? 'M',
        helmet: over.helmet,
        x: 5,
        y: 0,
      },
    ],
  };
}

function drop(over: Parameters<typeof dropLevel>[0], steps = 240): PigEntity {
  const lvl = Level.load(dropLevel(over));
  lvl.damageEnabled = true;
  for (let i = 0; i < steps; i++) lvl.step();
  const pig = lvl.registry
    .all()
    .find((e): e is PigEntity => e.kind === 'pig');
  return pig!;
}

describe('crush damage (block falls on pig)', () => {
  it('plankM dropped 3 m onto an M pig kills it', () => {
    const pig = drop({});
    expect(pig.alive, `hp left: ${pig.hp.toFixed(2)}`).toBe(false);
  });

  it('plankM dropped 3 m onto an L pig takes it below half hp', () => {
    const pig = drop({ pigSize: 'L' });
    const max = TUNING.pig.sizes.L.hp;
    expect(pig.hp, `hp left: ${pig.hp.toFixed(2)}/${max}`).toBeLessThanOrEqual(
      max * 0.5
    );
  });

  it('cubeS dropped 1.5 m onto an S pig leaves it alive', () => {
    const pig = drop({ kit: 'cubeS', blockY: 1.5, pigSize: 'S' });
    expect(pig.alive, `hp left: ${pig.hp.toFixed(2)}`).toBe(true);
  });
});
