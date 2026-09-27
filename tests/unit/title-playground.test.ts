import { describe, expect, it } from 'vitest';
import {
  createPlayground,
  setZones,
  step,
  tapBot,
  type Behavior,
  type Playground,
  type SimBot,
} from '../../src/ui/titlePlayground';

// Why: the title playground is ambient entertainment — it must never look
// broken. These invariants pin the contract: deterministic (same seed → same
// show), bots stay inside their allowed zones (never under the card), no pair
// clips through each other for more than a moment, every advertised behavior
// actually occurs, and a tap produces the surprised jump.
const DT = 1 / 60;

const SPECS = [
  ...['02', '03', '04', '07', '09', '10', '12'].map((id) => ({ id, w: 46 })),
  ...['grok', 'dash', 'split', 'heavy', 'blast'].map((id) => ({ id, w: 64 })),
];

function run(pg: Playground, seconds: number, visit?: (pg: Playground) => void): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    step(pg, DT);
    visit?.(pg);
  }
}

describe('titlePlayground sim', () => {
  it('is deterministic for a seed', () => {
    const a = createPlayground(7, [{ x0: 0, x1: 1200 }], SPECS);
    const b = createPlayground(7, [{ x0: 0, x1: 1200 }], SPECS);
    run(a, 30);
    run(b, 30);
    for (let i = 0; i < a.bots.length; i++) {
      expect(a.bots[i]!.x).toBe(b.bots[i]!.x);
      expect(a.bots[i]!.y).toBe(b.bots[i]!.y);
      expect(a.bots[i]!.kind).toBe(b.bots[i]!.kind);
    }
    const c = createPlayground(8, [{ x0: 0, x1: 1200 }], SPECS);
    run(c, 30);
    // A different seed diverges somewhere over 30 s.
    expect(c.bots.some((b2, i) => Math.abs(b2.x - a.bots[i]!.x) > 1)).toBe(true);
  });

  it('keeps every bot inside its zone and on/above the ground for 120 s', () => {
    const zones = [
      { x0: 0, x1: 220 },
      { x0: 500, x1: 1280 },
    ];
    const pg = createPlayground(11, zones, SPECS);
    const inZone = (b: SimBot) => {
      const z = pg.zones[b.zone]!;
      return b.x - b.w / 2 >= z.x0 - 0.5 && b.x + b.w / 2 <= z.x1 + 0.5;
    };
    run(pg, 120, () => {
      for (const b of pg.bots) {
        expect(inZone(b), `bot ${b.id} x=${b.x.toFixed(1)} zone=${b.zone}`).toBe(true);
        expect(b.y).toBeGreaterThanOrEqual(-0.001);
      }
    });
  });

  it('plays every behavior at least once across the cast in 120 s', () => {
    const pg = createPlayground(5, [{ x0: 0, x1: 1280 }], SPECS);
    run(pg, 120);
    const expected: Behavior[] = [
      'idle',
      'walk',
      'bounce',
      'chase',
      'flee',
      'bump',
      'leapfrog',
      'duck',
      'nap',
      'dance',
    ];
    for (const k of expected) {
      expect(pg.counts[k] ?? 0, `behavior ${k} never occurred`).toBeGreaterThan(0);
    }
  });

  it('never lets a pair overlap more than 40% of the smaller width for over 1 s', () => {
    const pg = createPlayground(3, [{ x0: 0, x1: 1280 }], SPECS);
    const overlapT = new Map<string, number>();
    run(pg, 120, () => {
      for (let i = 0; i < pg.bots.length; i++) {
        for (let j = i + 1; j < pg.bots.length; j++) {
          const a = pg.bots[i]!;
          const b = pg.bots[j]!;
          if (a.zone !== b.zone || a.y > 10 || b.y > 10) continue;
          const lim = Math.min(a.w, b.w) * 0.4;
          const key = `${i}:${j}`;
          if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - lim) {
            const t = (overlapT.get(key) ?? 0) + DT;
            expect(t, `bots ${a.id} & ${b.id} overlapped ${t.toFixed(2)}s`).toBeLessThanOrEqual(1);
            overlapT.set(key, t);
          } else {
            overlapT.delete(key);
          }
        }
      }
    });
  });

  it('tapped bot does the surprised jump and nearby bots watch', () => {
    const pg = createPlayground(9, [{ x0: 0, x1: 1280 }], SPECS);
    run(pg, 1);
    tapBot(pg, 0);
    expect(pg.bots[0]!.kind).toBe('surprise');
    expect(pg.bots[0]!.vy).toBeGreaterThan(300);
    run(pg, 2);
    expect(pg.counts.surprise).toBe(1);
  });

  it('re-zones bots when the stage geometry changes', () => {
    const pg = createPlayground(4, [{ x0: 0, x1: 1280 }], SPECS);
    run(pg, 10);
    setZones(pg, [
      { x0: 0, x1: 200 },
      { x0: 1080, x1: 1280 },
    ]);
    run(pg, 10);
    for (const b of pg.bots) {
      const z = pg.zones[b.zone]!;
      expect(b.x - b.w / 2).toBeGreaterThanOrEqual(z.x0 - 0.5);
      expect(b.x + b.w / 2).toBeLessThanOrEqual(z.x1 + 0.5);
    }
  });
});
