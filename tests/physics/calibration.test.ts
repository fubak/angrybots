import planck, { Vec2 } from 'planck';
import { describe, expect, it } from 'vitest';
import { Level } from '../../src/game/Level';
import { TUNING } from '../../src/config/tuning';
import type { LevelV2 } from '../../src/levels/schema';

const { Circle } = planck;

function miniLevel(pigs: LevelV2['pigs'], blocks: LevelV2['blocks']): LevelV2 {
  return {
    version: 2,
    id: 'cal',
    name: 'cal',
    chapter: 'training',
    order: 1,
    bots: ['grok'],
    stars: [0, 0, 0],
    camera: { minX: -20, maxX: 30, minY: 0, maxY: 20 },
    sling: { x: -7.5 },
    terrain: [],
    blocks,
    pigs,
  };
}

function fire(
  sim: Level,
  x: number,
  y: number,
  vx: number,
  vy: number,
  kind: keyof typeof TUNING.bots = 'grok'
) {
  const p = TUNING.bots[kind];
  const bot = sim.launchBot(0, Math.hypot(vx, vy), kind);
  bot.body!.setPosition(Vec2(x, Math.max(y, p.r)));
  bot.body!.setLinearVelocity(Vec2(vx, vy));
  for (let i = 0; i < 240; i++) sim.step();
}

function hpRatio(sim: Level, id: string): number {
  const e = sim.registry.get(id);
  if (!e || e.kind === 'pig') return e && e.kind === 'pig' ? e.hp / e.maxHp : 1;
  if (e.kind === 'block') return e.hp / e.maxHp;
  return 1;
}

describe('calibration', () => {
  it('C1 grok 8 m/s -> M pig hpRatio 0.45', () => {
    const sim = Level.load(miniLevel([{ id: 'p', size: 'M', x: 5, y: 0 }], []));
    sim.settle();
    fire(sim, 3.5, 0.6, 8, 0);
    expect(hpRatio(sim, 'p')).toBeCloseTo(0.45, 1);
  });

  it('C2 grok 16 m/s -> M pig destroyed', () => {
    const sim = Level.load(miniLevel([{ id: 'p', size: 'M', x: 5, y: 0 }], []));
    sim.settle();
    fire(sim, 3.5, 0.6, 16, 0);
    expect(sim.registry.get('p')?.alive).toBe(false);
  });

  it('a target that falls onto the grass is removed, a target already on the grass is not', () => {
    const sim = Level.load(
      miniLevel(
        [
          { id: 'yard', size: 'M', x: 2, y: 0 },
          { id: 'high', size: 'M', x: 8, y: 4 },
        ],
        []
      )
    );
    sim.damageEnabled = true;
    for (let i = 0; i < 180; i++) sim.step();
    expect(sim.registry.get('yard')?.alive).toBe(true);
    expect(sim.registry.get('high')?.alive).toBe(false);
  });

  it('C14 dash 20 wood cube destroyed with affinity', () => {
    const sim = Level.load(
      miniLevel([], [{ id: 'b', material: 'wood', kit: 'cube', x: 5, y: 0 }])
    );
    sim.settle();
    fire(sim, 3.3, 0.5, 20, 0, 'dash');
    expect(sim.registry.get('b')?.alive).toBe(false);
  });
});
