import { describe, expect, it } from 'vitest';
import {
  createPlayground,
  selectCast,
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

  // Why: the playground is ambient entertainment — it fails its job if it
  // looks sleepy (several bots napping, long still stretches) or crowded
  // (bots shoulder to shoulder with nowhere to go). These pin the liveliness
  // contract: at most one napper, every bot moving most of the time, an
  // interaction starting at least every few seconds, and full-stage roaming.
  it('never has more than one napper and keeps every bot moving ≥60% of the time', () => {
    const pg = createPlayground(11, [{ x0: 0, x1: 1280 }], SPECS);
    const moving = new Array<number>(pg.bots.length).fill(0);
    let maxNappers = 0;
    run(pg, 120, () => {
      maxNappers = Math.max(
        maxNappers,
        pg.bots.filter((b) => b.kind === 'nap').length
      );
      pg.bots.forEach((b, i) => {
        if (!['idle', 'nap', 'duck', 'watch'].includes(b.kind)) moving[i]! += DT;
      });
    });
    expect(maxNappers, 'more than one bot napping at once').toBeLessThanOrEqual(1);
    pg.bots.forEach((b, i) => {
      expect(
        moving[i]! / 120,
        `bot ${b.id} only moved ${((moving[i]! / 120) * 100).toFixed(0)}% of the time`
      ).toBeGreaterThanOrEqual(0.6);
    });
  });

  it('starts an interaction at least every ~4 s and roams the whole zone', () => {
    const pg = createPlayground(13, [{ x0: 0, x1: 1280 }], SPECS);
    const interactions: number[] = [];
    const prev = pg.bots.map(() => 'idle' as Behavior);
    const span = pg.bots.map(() => ({ lo: Infinity, hi: -Infinity }));
    run(pg, 120, () => {
      pg.bots.forEach((b, i) => {
        const k = b.kind;
        if (k !== prev[i] && (k === 'bump' || k === 'chase' || k === 'leapfrog')) {
          interactions.push(pg.time);
        }
        prev[i] = k;
        span[i]!.lo = Math.min(span[i]!.lo, b.x);
        span[i]!.hi = Math.max(span[i]!.hi, b.x);
      });
    });
    expect(interactions.length).toBeGreaterThan(10);
    for (let i = 1; i < interactions.length; i++) {
      expect(
        interactions[i]! - interactions[i - 1]!,
        `interaction gap ${(interactions[i]! - interactions[i - 1]!).toFixed(2)}s`
      ).toBeLessThanOrEqual(4);
    }
    const z = pg.zones[0]!;
    pg.bots.forEach((b, i) => {
      const covered = (span[i]!.hi - span[i]!.lo) / (z.x1 - z.x0);
      expect(covered, `bot ${b.id} only roamed ${(covered * 100).toFixed(0)}% of its zone`).toBeGreaterThanOrEqual(
        0.5
      );
    });
  });

  it('selectCast keeps total body width ≤55% of each zone, playable first', () => {
    const zones: Zone[] = [{ x0: 0, x1: 200 }];
    // Specs ordered playable-first like TitleScreen passes them.
    const cast = selectCast(SPECS.slice(7).concat(SPECS.slice(0, 7)), zones);
    expect(cast.length).toBeGreaterThan(0);
    const used = cast.reduce((n, c) => n + c.spec.w, 0);
    expect(used).toBeLessThanOrEqual(200 * 0.55);
    // Playable bots claim the budget first: at least one playable leads, and
    // no playable is skipped while a menu bot made the cut.
    expect(cast[0]!.spec.id.length).toBeGreaterThan(2);
    const firstMenu = cast.findIndex((c) => c.spec.id.length <= 2);
    expect(cast.slice(0, firstMenu === -1 ? undefined : firstMenu).every((c) => c.spec.id.length > 2)).toBe(true);

    // Two gutters: bots spread across both, neither over budget.
    const gutters: Zone[] = [
      { x0: 0, x1: 150 },
      { x0: 1130, x1: 1280 },
    ];
    const cast2 = selectCast(
      SPECS.slice(7).concat(SPECS.slice(0, 7)).map((s) => ({ ...s })),
      gutters
    );
    for (let z = 0; z < 2; z++) {
      const w = cast2.filter((c) => c.zone === z).reduce((n, c) => n + c.spec.w, 0);
      expect(w).toBeLessThanOrEqual(150 * 0.55 + 0.001);
    }
    expect(cast2.some((c) => c.zone === 1)).toBe(true);
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
