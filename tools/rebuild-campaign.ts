/**
 * Rebuilds the 30-level campaign (Phase 4B). Emits src/levels/data/NN-id.json.
 * Keeps ids and chapter membership; rewrites order/name/hint/bots/blocks/pigs/
 * terrain/camera/stars. Deterministic — no randomness.
 *
 * Units: y is the BOTTOM edge for blocks and pigs (see expand.ts), ground = 0.
 * Blocks must rest on the ground, a block top or a terrain top (S3) and must
 * not interpenetrate (S1, EPS 0.002). Pigs likewise (S2/S4).
 *
 * Run: npx tsx tools/rebuild-campaign.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BlockV2, LevelV2, PigV2, TerrainV2, BotKind } from '../src/levels/schema';

type Mat = BlockV2['material'];
let seq = 1;
let pseq = 1;
const B = (material: Mat, kit: BlockV2['kit'], x: number, y: number): BlockV2 => ({
  id: `b${seq++}`, material, kit, x, y,
});
const P = (size: PigV2['size'], x: number, y: number, opts?: Partial<PigV2>): PigV2 => ({
  id: `p${pseq++}`, size, x, y, ...opts,
});

const H: Record<BlockV2['kit'], number> = {
  plankL: 0.4, plankM: 0.4, plankS: 0.4,
  postL: 2.0, postM: 1.2, postS: 0.8,
  cube: 0.8, cubeS: 0.4, slab: 0.8,
  wheel: 0.8, wheelS: 0.4, triR: 0.8, triL: 0.8,
};

/** Two posts + plank roof. gap = post offset; interior half-width = gap - 0.2. Returns roof top y. */
function cell(out: BlockV2[], cx: number, floorY: number, o: {
  h?: 'postL' | 'postM' | 'postS'; gap?: number; wall?: Mat; roof?: Mat;
}): number {
  const h = o.h ?? 'postL';
  const gap = o.gap ?? 0.9;
  out.push(B(o.wall ?? 'wood', h, cx - gap, floorY));
  out.push(B(o.wall ?? 'wood', h, cx + gap, floorY));
  const roofKit = gap >= 1.4 ? 'plankL' : 'plankM';
  out.push(B(o.roof ?? 'wood', roofKit, cx, floorY + H[h]));
  return floorY + H[h] + 0.4;
}

function stack(out: BlockV2[], x: number, y: number, n: number, m: Mat | Mat[], kit: 'cube' | 'cubeS' | 'slab' = 'cube'): number {
  const ms = Array.isArray(m) ? m : [m];
  let yy = y;
  for (let i = 0; i < n; i++) {
    out.push(B(ms[i % ms.length]!, kit, x, yy));
    yy += H[kit];
  }
  return yy;
}

/** Stepped columns on the ground. heights[i] cubes at x0 + i*0.8. Returns col x positions. */
function bleachers(out: BlockV2[], x0: number, heights: number[], m: Mat | Mat[]): number[] {
  const xs: number[] = [];
  for (let i = 0; i < heights.length; i++) {
    const x = x0 + i * 0.8;
    xs.push(x);
    stack(out, x, 0, heights[i]!, m);
  }
  return xs;
}

/** Paired-cube piers + plankL spans. pierH in whole cubes. */
function bridge(out: BlockV2[], x0: number, spans: number, o: { pier?: Mat; span?: Mat; pierH?: number }): { piers: number[]; deckY: number } {
  const pierH = o.pierH ?? 2;
  const piers: number[] = [];
  for (let i = 0; i <= spans; i++) {
    const x = x0 + i * 4.0;
    piers.push(x);
    stack(out, x - 0.45, 0, pierH, o.pier ?? 'stone');
    stack(out, x + 0.45, 0, pierH, o.pier ?? 'stone');
    if (i < spans) out.push(B(o.span ?? 'wood', 'plankL', x + 2.0, pierH * 0.8));
  }
  return { piers, deckY: pierH * 0.8 + 0.4 };
}

/** Stacked cells. Returns roof top y. */
function tower(out: BlockV2[], cx: number, floorY: number, tiers: number, o: {
  h?: 'postL' | 'postM' | 'postS'; gap?: number; wall?: Mat; roof?: Mat; glassTier?: number;
}): number {
  let y = floorY;
  for (let t = 0; t < tiers; t++) {
    y = cell(out, cx, y, {
      h: o.h ?? 'postL', gap: o.gap,
      wall: o.glassTier === t ? 'glass' : (o.wall ?? 'wood'),
      roof: o.roof ?? 'wood',
    });
  }
  return y;
}

type Built = { blocks: BlockV2[]; pigs: PigV2[]; terrain: TerrainV2[] };
type Spec = {
  file: string; id: string; name: string; chapter: 'training' | 'workshop' | 'citadel';
  order: number; archetype: string; bots: BotKind[]; hint?: string;
  build: () => Built;
};

const specs: Spec[] = [
  // ==================== TRAINING (12-30 blocks; finale = 30) ====================
  {
    file: '01-first-flight', id: 'first-flight', name: 'First Flight', chapter: 'training', order: 1,
    archetype: 'tower', bots: ['grok', 'grok', 'grok'],
    hint: 'Pull back and release. Drag to the perch to cancel.',
    build: () => {
      const b: BlockV2[] = [];
      const r = cell(b, 11.4, 0, { wall: 'glass', roof: 'glass' }); // 3 — fragile tutorial porch
      b.push(B('glass', 'slab', 11.4, r));                       // 1 shared perch slab -> 2.8
      stack(b, 9.6, 0, 2, 'glass');                              // 2
      stack(b, 13.2, 0, 2, 'glass');                             // 2
      b.push(B('wood', 'plankS', 9.6, 1.6));                     // 1
      b.push(B('wood', 'plankS', 13.2, 1.6));                    // 1
      stack(b, 9.6, 2.0, 1, 'glass', 'cubeS');                   // 1 caps on the foot stacks
      stack(b, 13.2, 2.0, 1, 'glass', 'cubeS');                  // 1 => 12
      const pigs = [P('M', 10.8, r + 0.8), P('S', 12.0, r + 0.8)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '02-powder-row', id: 'powder-row', name: 'Powder Row', chapter: 'training', order: 2,
    archetype: 'bunker', bots: ['grok', 'grok', 'grok'],
    hint: 'Break the glass face to drop the roof.',
    build: () => {
      const b: BlockV2[] = [];
      const r = cell(b, 11.4, 0, { wall: 'glass', roof: 'stone' }); // 3
      stack(b, 11.4, r, 2, 'stone');                              // 2
      b.push(B('stone', 'plankM', 11.4, r + 1.6));                // 1
      stack(b, 13.8, 0, 3, 'wood');                               // 3
      b.push(B('wood', 'plankS', 13.8, 2.4));                     // 1
      stack(b, 9.2, 0, 2, 'wood');                                // 2
      b.push(B('wood', 'slab', 9.2, 1.6));                        // 1
      b.push(B('wood', 'cubeS', 9.9, 0));                         // 1 => 14
      const pigs = [P('M', 11.4, 0), P('S', 13.8, 2.8), P('S', 9.2, 2.4)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '03-glass-house', id: 'glass-house', name: 'Glass House', chapter: 'training', order: 3,
    archetype: 'bridge', bots: ['grok', 'grok', 'grok'],
    hint: 'The glass piers are weak. One hit drops the span.',
    build: () => {
      const b: BlockV2[] = [];
      for (const x of [10.3, 14.5]) b.push(B('stone', 'postL', x, 0)); // 2 armored piers
      for (const x of [11.1, 13.7]) b.push(B('glass', 'postL', x, 0)); // 2 glass piers
      b.push(B('stone', 'plankL', 12.4, 2.0));                          // 1
      b.push(B('wood', 'slab', 12.4, 2.4));                             // 1
      stack(b, 12.4, 3.2, 1, 'stone');                                  // 1
      stack(b, 12.4, 4.0, 1, 'glass');                                  // 1 crown on the perch cube
      stack(b, 10.9, 2.4, 3, 'wood');                                   // 3 (on the stone span ends)
      stack(b, 13.9, 2.4, 3, 'wood');                                   // 3 => 14
      const pigs = [P('S', 12.4, 0), P('S', 12.4, 4.8), P('S', 10.9, 4.8), P('S', 13.9, 4.8)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '04-stone-keep', id: 'stone-keep', name: 'Triple Tap', chapter: 'training', order: 4,
    archetype: 'tower', bots: ['split', 'grok', 'grok'],
    hint: 'Split hits three places at once. Tap in mid-air.',
    build: () => {
      const b: BlockV2[] = [];
      for (const x of [9.6, 12.6, 15.6, 18.2]) {
        stack(b, x - 0.4, 0, 2, ['wood', 'glass']);                   // 2
        stack(b, x + 0.4, 0, 2, ['wood', 'glass']);                   // 2
        b.push(B('stone', 'plankM', x, 1.6));                         // 1
      }
      const pigs = [P('S', 9.6, 2.0), P('S', 12.6, 2.0), P('S', 15.6, 2.0), P('S', 18.2, 2.0)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '05-hilltop', id: 'hilltop', name: 'Hilltop', chapter: 'training', order: 5,
    archetype: 'stilted', bots: ['grok', 'grok', 'grok'],
    hint: 'The fort sits up on the plateau.',
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'plateau', x0: 10.5, x1: 16.2, top: 1.6 }];
      const b: BlockV2[] = [];
      const r1 = cell(b, 11.9, 1.6, { h: 'postM', wall: 'wood', roof: 'wood' });   // 3 -> roofY 3.2
      const r2 = cell(b, 15.0, 1.6, { h: 'postM', wall: 'glass', roof: 'stone' }); // 3 -> roofY 3.2
      stack(b, 13.4, 1.6, 3, 'wood');                                  // 3 (between cell posts at 12.8/14.1)
      stack(b, 13.4, 4.0, 1, 'wood', 'slab');                          // 1 wide perch for p3
      stack(b, 11.9, r1, 1, 'wood');                                   // 1
      stack(b, 15.0, r2, 1, 'stone');                                  // 1
      stack(b, 11.9, r1 + 0.8, 1, 'wood', 'cubeS');                    // 1
      stack(b, 15.0, r2 + 0.8, 1, 'stone', 'cubeS');                   // 1
      b.push(B('wood', 'cubeS', 15.0, r2 + 1.2));                      // 1 => 15
      const pigs = [P('M', 11.9, 1.6), P('M', 15.0, 1.6), P('S', 13.4, 4.8)];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '06-lone-guard', id: 'lone-guard', name: 'Lone Guard', chapter: 'training', order: 6,
    archetype: 'tower', bots: ['grok', 'grok', 'grok'],
    hint: 'Aim for the glass band under the stone cap.',
    build: () => {
      const b: BlockV2[] = [];
      const r1 = cell(b, 12.4, 0, { h: 'postL', wall: 'wood', roof: 'wood' }); // 3 -> 2.4
      b.push(B('glass', 'postM', 11.6, r1));                           // 1
      b.push(B('glass', 'postM', 13.2, r1));                           // 1
      b.push(B('stone', 'plankL', 12.4, r1 + 1.2));                    // 1 wide cap on the glass band
      stack(b, 12.4, r1 + 1.6, 2, 'stone');                            // 2 shorter column crown
      cell(b, 9.8, 0, { h: 'postM', wall: 'stone', roof: 'stone' });   // 3 armored side bunkers
      cell(b, 15.0, 0, { h: 'postM', wall: 'stone', roof: 'stone' });  // 3 => 15
      const pigs = [P('S', 12.4, r1 + 3.2), P('M', 12.4, 0), P('S', 9.8, 0), P('S', 15.0, 0)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '07-twin-posts', id: 'twin-posts', name: 'Dash Lane', chapter: 'training', order: 7,
    archetype: 'bridge', bots: ['dash', 'grok', 'grok'],
    hint: 'Tap during flight to dash through the beam.',
    build: () => {
      const b: BlockV2[] = [];
      const br = bridge(b, 9.6, 2, { pier: 'stone', span: 'wood', pierH: 2 }); // 8
      b.push(B('wood', 'slab', 11.6, br.deckY));                       // 1
      b.push(B('wood', 'slab', 15.6, br.deckY));                       // 1
      stack(b, 11.6, br.deckY + 0.8, 1, 'glass');                      // 1 => 13
      stack(b, 15.6, br.deckY + 0.8, 1, 'glass');                      // 1 => 14
      const pigs = [P('S', 11.6, br.deckY + 1.6), P('M', 13.2, br.deckY), P('S', 14.2, br.deckY), P('S', 15.6, br.deckY + 1.6)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '08-glass-alley', id: 'glass-alley', name: 'Glass Alley', chapter: 'training', order: 8,
    archetype: 'bunker', bots: ['grok', 'grok', 'grok'],
    hint: 'Everything here is glass and stone.',
    build: () => {
      const b: BlockV2[] = [];
      for (const cx of [10.6, 13.8]) {
        const r1 = cell(b, cx, 0, { wall: 'stone', roof: 'stone' });   // 3 -> 2.4 armored bunkers
        b.push(B('stone', 'postS', cx - 0.9, r1));                     // 1 alcove posts
        b.push(B('stone', 'postS', cx + 0.9, r1));                     // 1
        b.push(B('wood', 'plankM', cx, r1 + 0.8));                     // 1 alcove roof
        b.push(B('wood', 'slab', cx, r1 + 1.2));                       // 1 (rests on both postS tops; slab is 0.8 tall) => 7 per fort = 14
      }
      const pigs = [P('M', 10.6, 0), P('M', 13.8, 0), P('S', 10.6, 2.4), P('S', 13.8, 2.4), P('S', 10.6, 4.4)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '09-tnt-porch', id: 'tnt-porch', name: 'TNT Porch', chapter: 'training', order: 9,
    archetype: 'castle', bots: ['grok', 'grok', 'grok'],
    hint: 'Hit the red crate. The blast does the rest.',
    build: () => {
      const b: BlockV2[] = [];
      const t = tower(b, 9.8, 0, 2, { h: 'postM', wall: 'wood', roof: 'wood' }); // 6 -> 3.2
      // porch: wide cell with TNT + pig inside
      b.push(B('wood', 'postL', 12.0, 0));                             // 1
      b.push(B('wood', 'postL', 14.2, 0));                             // 1
      b.push(B('stone', 'plankL', 13.1, 2.0));                         // 1 porch roof
      b.push(B('tnt', 'cube', 12.6, 0));                               // 1 FIRST TNT
      stack(b, 13.1, 2.4, 2, 'wood');                                  // 2
      b.push(B('stone', 'plankS', 13.1, 4.0));                         // 1
      stack(b, 15.6, 0, 3, 'stone');                                   // 3
      b.push(B('stone', 'plankS', 15.6, 2.4));                         // 1
      stack(b, 13.1, 4.4, 1, 'wood');                                  // 1 => 18
      const pigs = [P('M', 9.8, 0), P('S', 9.8, t), P('S', 13.55, 0), P('M', 15.6, 2.8)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '10-split-lesson', id: 'split-lesson', name: 'Grand Stand', chapter: 'training', order: 10,
    archetype: 'pyramid', bots: ['split', 'grok', 'grok', 'grok'],
    hint: 'Chapter finale: bring the whole stand down.',
    build: () => {
      const b: BlockV2[] = [];
      // three bunkers spread wide apart; stepped wall columns between them
      cell(b, 8.8, 0, { h: 'postL', gap: 1.0, wall: 'stone', roof: 'stone' });  // 3
      cell(b, 13.6, 0, { h: 'postL', gap: 1.0, wall: 'stone', roof: 'stone' }); // 3
      cell(b, 18.4, 0, { h: 'postL', gap: 1.0, wall: 'stone', roof: 'stone' }); // 3
      stack(b, 6.3, 0, 3, 'stone');                                  // 3 stepped left wall
      stack(b, 7.2, 0, 4, 'stone');                                  // 4
      stack(b, 10.9, 0, 4, 'stone');                                 // 4 mid walls between the cells
      stack(b, 11.8, 0, 3, 'wood');                                  // 3
      stack(b, 15.7, 0, 4, 'stone');                                 // 4
      stack(b, 16.5, 0, 3, 'glass');                                 // 3 weak column => 30
      const pigs = [
        P('M', 8.8, 0), P('M', 13.6, 0), P('S', 18.4, 0),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  // ==================== WORKSHOP (20-45 blocks; finale = 45) ====================
  {
    file: '11-heavy-gate', id: 'heavy-gate', name: 'Heavy Gate', chapter: 'workshop', order: 1,
    archetype: 'bunker', bots: ['heavy', 'grok', 'grok'],
    hint: 'Heavy smashes stone. Tap to drop like a rock.',
    build: () => {
      const b: BlockV2[] = [];
      const r = cell(b, 12.4, 0, { h: 'postL', gap: 1.0, wall: 'stone', roof: 'stone' }); // 3
      stack(b, 12.4, r, 3, 'stone');                                 // 3 -> top 4.8
      stack(b, 12.4, r + 2.4, 1, 'stone');                           // 1 column crown
      const l = cell(b, 9.4, 0, { h: 'postM', wall: 'wood', roof: 'wood' });   // 3 -> 1.6
      const rr = cell(b, 15.4, 0, { h: 'postM', wall: 'wood', roof: 'wood' }); // 3 -> 1.6
      stack(b, 9.4, l, 3, 'wood');                                   // 3
      stack(b, 15.4, rr, 3, 'wood');                                 // 3
      stack(b, 9.4, l + 2.4, 1, 'wood', 'cubeS');                    // 1
      stack(b, 15.4, rr + 2.4, 1, 'wood', 'cubeS');                  // 1 => 21
      const pigs = [P('M', 12.4, 0), P('M', 9.4, 0), P('M', 15.4, 0), P('S', 12.4, r + 3.2)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '12-wheel-yard', id: 'wheel-yard', name: 'Wheel Yard', chapter: 'workshop', order: 2,
    archetype: 'tower', bots: ['heavy', 'grok', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      const t1 = tower(b, 10.4, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' }); // 6 -> 3.2
      const t2 = tower(b, 14.4, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' }); // 6 -> 3.2
      stack(b, 12.4, 0, 4, 'stone');                                 // 4 -> 3.2
      b.push(B('wood', 'plankL', 12.4, 3.2));                        // 1 links roofs
      stack(b, 8.8, 0, 3, 'wood');                                   // 3
      stack(b, 16.0, 0, 3, 'wood');                                  // 3 => 22
      const pigs = [P('M', 10.4, 0), P('M', 14.4, 0), P('S', 9.9, t1), P('S', 14.9, t2), P('S', 12.4, 3.6)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '13-ramp-run', id: 'ramp-run', name: 'Ramp Run', chapter: 'workshop', order: 3,
    archetype: 'stilted', bots: ['grok', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [
        { kind: 'ramp', x0: 8.5, x1: 14.0, y0: 0, y1: 1.8 },
        { kind: 'plateau', x0: 14.0, x1: 18.6, top: 1.8 },
      ];
      const b: BlockV2[] = [];
      const r1 = cell(b, 14.8, 1.8, { h: 'postM', wall: 'wood', roof: 'wood' });   // 3 -> 3.4
      const r2 = cell(b, 17.6, 1.8, { h: 'postM', wall: 'glass', roof: 'stone' }); // 3 -> 3.4
      stack(b, 14.8, r1, 1, 'wood');                                 // 1
      stack(b, 17.6, r2, 1, 'stone');                                // 1
      b.push(B('wood', 'plankS', 14.8, r1 + 0.8));                   // 1
      b.push(B('wood', 'plankS', 17.6, r2 + 0.8));                   // 1
      stack(b, 14.8, r1 + 1.2, 1, 'wood', 'cubeS');                  // 1
      stack(b, 17.6, r2 + 1.2, 1, 'stone', 'cubeS');                 // 1
      stack(b, 7.4, 0, 3, 'wood');                                   // 3 (left of ramp)
      b.push(B('wood', 'slab', 7.4, 2.4));                           // 1
      stack(b, 16.2, 1.8, 2, 'wood', 'cubeS');                       // 2
      b.push(B('glass', 'cubeS', 16.2, 2.6));                        // 1
      stack(b, 16.2, 3.0, 1, 'wood', 'cubeS');                       // 1 => 20
      const pigs = [P('M', 14.8, 1.8), P('M', 17.6, 1.8), P('S', 14.8, 5.0), P('S', 17.6, 5.0)];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '14-ledge-nest', id: 'ledge-nest', name: 'Ledge Nest', chapter: 'workshop', order: 4,
    archetype: 'castle', bots: ['grok', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'ledge', x0: 13.5, x1: 17.0, top: 3.0, thickness: 0.6 }];
      const b: BlockV2[] = [];
      // ground castle: two towers + keep
      const t1 = tower(b, 9.2, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' });   // 6 -> 3.2
      const t2 = tower(b, 12.0, 0, 2, { h: 'postM', wall: 'glass', roof: 'stone' }); // 6 -> 3.2
      stack(b, 10.6, 0, 2, 'stone', 'cubeS');                        // 2 gap cubes between towers
      // ledge keep
      const k = cell(b, 15.2, 3.0, { h: 'postM', wall: 'wood', roof: 'stone' });   // 3 -> 4.6
      stack(b, 15.2, k, 2, 'wood');                                  // 2
      b.push(B('stone', 'plankM', 15.2, k + 1.6));                   // 1
      stack(b, 16.7, 3.0, 2, 'stone');                               // 2
      b.push(B('wood', 'plankS', 16.7, 4.6));                        // 1
      stack(b, 15.2, k + 2.0, 1, 'wood', 'cubeS');                   // 1 => 24
      const pigs = [P('M', 9.2, 0), P('M', 12.0, 0), P('S', 9.2, t1), P('M', 15.2, 3.0), P('S', 16.7, 5.0)];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '15-powder-stack', id: 'powder-stack', name: 'Powder Stack', chapter: 'workshop', order: 5,
    archetype: 'pyramid', bots: ['grok', 'grok', 'grok'],
    hint: 'The keg under the face clears the base.',
    build: () => {
      const b: BlockV2[] = [];
      // stepped mound 8 cols + kegs at both feet
      const heights = [5, 4, 4, 5, 4, 4]; // 26 cubes, spaced columns
      const mats: Mat[] = ['stone', 'wood', 'wood', 'stone', 'wood', 'wood'];
      for (let i = 0; i < heights.length; i++) {
        stack(b, 10.4 + i * 0.95, 0, heights[i]!, mats[i]!);         // gaps kill squeeze wobble
      }
      b.push(B('stone', 'slab', 11.825, 3.2));                       // slabs bridge the h4 pairs
      b.push(B('stone', 'slab', 14.675, 3.2));                       // 2
      b.push(B('tnt', 'cube', 9.3, 0));                              // keg at the foot
      b.push(B('tnt', 'cube', 16.9, 0));                             // rear keg => 30
      const pigs = [
        P('S', 9.3, 0.8), P('S', 10.4, 4.0), P('M', 11.825, 4.0), P('S', 13.25, 4.0), P('S', 16.9, 0.8),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '16-glass-stack', id: 'glass-stack', name: 'Glass Stack', chapter: 'workshop', order: 6,
    archetype: 'bridge', bots: ['split', 'grok', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      // two-tier glass-span bridge: stone piers at 10/14/18 carry full-width spans, glass uppers
      for (const x of [10.0, 14.0, 18.0]) {
        b.push(B('stone', 'postL', x, 0));                             // 3 piers
        b.push(B('glass', 'postM', x, 2.4));                           // 3 upper posts on lower spans
      }
      b.push(B('stone', 'plankL', 12.0, 2.0));                         // 2 lower spans
      b.push(B('stone', 'plankL', 16.0, 2.0));
      b.push(B('stone', 'plankL', 12.0, 3.6));                         // 2 upper spans
      b.push(B('stone', 'plankL', 16.0, 3.6));
      b.push(B('glass', 'postM', 12.0, 2.4));                          // mid-span supports for upper spans
      b.push(B('glass', 'postM', 16.0, 2.4));                          // 2
      stack(b, 12.0, 4.0, 1, 'stone');                                 // single crowns over the mid posts
      stack(b, 16.0, 4.0, 1, 'stone');
      stack(b, 8.0, 0, 3, 'wood');                                     // ground fillers beside the bridge
      stack(b, 20.0, 0, 3, 'wood');                                    // => 20
      const pigs = [P('M', 12.0, 0), P('M', 16.0, 0), P('S', 12.0, 4.8), P('S', 16.0, 4.8), P('S', 14.0, 4.0)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '17-hat-row', id: 'hat-row', name: 'Hat Row', chapter: 'workshop', order: 7,
    archetype: 'bunker', bots: ['grok', 'grok', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'plateau', x0: 14.5, x1: 18.5, top: 2.0 }];
      const b: BlockV2[] = [];
      // armored ground bunker — roof plank on two cubes so it can't teeter
      const r = cell(b, 11.0, 0, { h: 'postL', gap: 1.0, wall: 'stone', roof: 'stone' }); // 3
      b.push(B('stone', 'cube', 10.6, r));                           // 1
      b.push(B('stone', 'cube', 11.4, r));                           // 1
      b.push(B('wood', 'plankM', 11.0, r + 0.8));                    // 1
      // plateau fort
      const c = cell(b, 16.0, 2.0, { h: 'postM', wall: 'wood', roof: 'stone' });   // 3 -> 3.6
      stack(b, 16.0, c, 2, 'wood');                                  // 2
      stack(b, 17.8, 2.0, 3, 'wood');                                // 3
      stack(b, 14.6, 2.0, 2, 'stone', 'cubeS');                      // 2 plateau front stack

      stack(b, 8.8, 0, 2, 'wood');                                   // 2 outrigger
      stack(b, 12.6, 0, 3, 'wood');                                  // 3 => 20
      const pigs = [
        P('M', 11.0, 0, { helmet: 'helmet' }), P('S', 11.0, r + 1.2, { helmet: 'hat' }),
        P('M', 16.0, 2.0, { helmet: 'helmet' }), P('S', 16.0, c + 1.6), P('S', 17.8, 4.4), P('S', 12.6, 2.4),
      ];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '18-blast-shed', id: 'blast-shed', name: 'Blast Shed', chapter: 'workshop', order: 8,
    archetype: 'tower', bots: ['blast', 'grok', 'grok'],
    hint: 'Blast detonates where you tap. Drop it in the shed.',
    build: () => {
      const b: BlockV2[] = [];
      // open shed with TNT inside + flanking towers
      b.push(B('wood', 'postL', 11.4, 0));                             // shed posts
      b.push(B('wood', 'postL', 14.0, 0));
      b.push(B('stone', 'plankL', 12.6, 2.0));                         // shed roof
      b.push(B('tnt', 'cube', 12.2, 0));                               // the keg
      stack(b, 12.6, 2.4, 2, 'stone');                                 // 2
      b.push(B('wood', 'plankL', 12.6, 4.0));                          // 1 cap
      const t1 = tower(b, 9.4, 0, 2, { h: 'postM', wall: 'wood', roof: 'wood' });   // 6 -> 3.2
      const t2 = tower(b, 15.8, 0, 2, { h: 'postM', wall: 'wood', roof: 'wood' });  // 6 -> 3.2
      stack(b, 12.6, 4.4, 1, 'wood');                                  // 1
      stack(b, 9.4, t1, 1, 'wood', 'slab');                            // 1 cap slabs: flat seats
      stack(b, 15.8, t2, 1, 'wood', 'slab');                           // 1 => 22
      const pigs = [P('M', 13.25, 0), P('S', 12.6, 5.2), P('M', 9.4, 0), P('M', 15.8, 0), P('S', 15.8, t2 + 0.8)];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '19-cross-beam', id: 'cross-beam', name: 'Cross Beam', chapter: 'workshop', order: 9,
    archetype: 'bridge', bots: ['grok', 'grok', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      // wide cube piers (not paired posts) so the deck can't rock
      for (const px of [9.0, 13.0, 17.0, 21.0]) stack(b, px, 0, 3, 'stone'); // 12
      b.push(B('wood', 'plankL', 11.0, 2.4));                          // 3 deck planks
      b.push(B('wood', 'plankL', 15.0, 2.4));
      b.push(B('wood', 'plankL', 19.0, 2.4));
      stack(b, 7.5, 0, 3, 'wood');                                     // 3 ground guards beside the bridge
      stack(b, 22.5, 0, 3, 'wood');                                    // 3 => 21
      const pigs = [
        P('S', 10.5, 2.8), P('M', 12.0, 2.8), P('S', 15.0, 2.8),
        P('S', 19.0, 2.8), P('S', 20.5, 2.8), P('S', 16.5, 2.8),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '20-mixed-yard', id: 'mixed-yard', name: 'Mixed Yard', chapter: 'workshop', order: 10,
    archetype: 'castle', bots: ['heavy', 'grok', 'grok', 'grok'],
    hint: 'Chapter finale: crack the stone shell.',
    build: () => {
      const b: BlockV2[] = [];
      // big castle: 3-tier towers, keep with glass front, curtain walls. 45 blocks.
      stack(b, 9.6, 0, 4, 'stone');                                    // 4 solid towers (cells sway)
      stack(b, 15.6, 0, 4, 'stone');                                   // 4
      // keep: glass front + stone back posts, stone roof
      b.push(B('glass', 'postL', 11.8, 0));
      b.push(B('stone', 'postL', 13.4, 0));
      b.push(B('stone', 'plankM', 12.6, 2.0));                         // keep roof
      stack(b, 11.9, 2.4, 1, 'stone');                                 // crown cubes directly over the posts
      stack(b, 13.3, 2.4, 1, 'stone');                                 // 2
      // full-cube curtain columns moved clear of the keep/tower posts
      stack(b, 7.0, 0, 3, 'wood');                                     // 3
      stack(b, 18.2, 0, 3, 'wood');                                    // 3
      stack(b, 8.1, 0, 4, 'stone');                                    // 4 flank columns outside the towers
      stack(b, 17.1, 0, 5, 'stone');                                   // 5
      stack(b, 5.9, 0, 4, 'wood');                                     // 4 outriggers clear of the towers
      stack(b, 19.2, 0, 5, 'wood');                                    // 5
      stack(b, 4.9, 0, 4, 'wood');                                     // 4
      stack(b, 20.2, 0, 4, 'wood');                                    // 4 => 45
      const pigs = [
        P('M', 12.6, 0, { helmet: 'helmet' }), P('S', 13.3, 3.2), P('S', 9.6, 3.2),
        P('S', 15.6, 3.2), P('S', 7.0, 2.4), P('S', 18.2, 2.4),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  // ==================== CITADEL (30-60 blocks; finale = 60) ====================
  {
    file: '21-king-court', id: 'king-court', name: 'King Court', chapter: 'citadel', order: 1,
    archetype: 'bunker', bots: ['grok', 'grok', 'grok', 'grok', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      // wide royal vault: posts at ±1.8, plankL roof, king inside
      const r = cell(b, 12.6, 0, { h: 'postL', gap: 1.8, wall: 'stone', roof: 'stone' }); // 3 -> 2.4
      stack(b, 12.6, r, 5, 'stone');                                 // 5 column crown
      // flanking guard cells (wider, clear of vault posts at 10.8/14.4)
      const g1 = cell(b, 8.8, 0, { h: 'postM', wall: 'wood', roof: 'wood' });   // 3
      const g2 = cell(b, 16.4, 0, { h: 'postM', wall: 'wood', roof: 'wood' });  // 3
      stack(b, 8.8, g1, 3, 'wood');                                  // 3
      stack(b, 16.4, g2, 3, 'wood');                                 // 3
      // narrow gate columns in the gaps
      stack(b, 10.25, 0, 4, 'stone', 'cubeS');                       // 4
      stack(b, 14.95, 0, 4, 'stone', 'cubeS');                       // 4
      stack(b, 7.2, 0, 3, 'wood');                                   // 3 outriggers
      stack(b, 18.0, 0, 3, 'wood');                                  // 3 => 30
      const pigs = [
        P('L', 12.6, 0, { king: true }), P('M', 8.8, 0), P('M', 16.4, 0),
        P('S', 8.8, g1 + 2.4), P('S', 16.4, g2 + 2.4),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '22-triple-keep', id: 'triple-keep', name: 'Triple Keep', chapter: 'citadel', order: 2,
    archetype: 'castle', bots: ['grok', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'ledge', x0: 16.0, x1: 19.5, top: 2.6, thickness: 0.6 }];
      const b: BlockV2[] = [];
      // ground castle: 2 towers + a low keep squeezed between their roof planes
      const t1 = tower(b, 8.8, 0, 2, { h: 'postM', wall: 'stone', roof: 'stone' });  // 6 -> 3.2
      const t2 = tower(b, 13.0, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' });  // 6 -> 3.2
      const k = cell(b, 10.9, 0, { h: 'postL', gap: 0.7, wall: 'glass', roof: 'stone' }); // 3 -> 2.4
      stack(b, 10.9, k, 1, 'stone');                                 // 1
      stack(b, 14.6, 0, 3, 'stone');                                 // 3
      // ledge keep
      const lk = cell(b, 17.4, 2.6, { h: 'postM', wall: 'stone', roof: 'stone' });  // 3 -> 4.2
      stack(b, 17.4, lk, 3, 'stone');                                // 3
      stack(b, 19.0, 2.6, 3, 'wood');                                // 3
      stack(b, 14.6, 2.4, 2, 'stone');                                 // 2 => 32
      const pigs = [
        P('S', 10.9, 0), P('S', 8.8, t1), P('S', 13.0, t2),
        P('M', 17.4, 2.6), P('S', 17.4, lk + 2.4),
      ];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '23-high-perch', id: 'high-perch', name: 'High Perch', chapter: 'citadel', order: 3,
    archetype: 'stilted', bots: ['split', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'plateau', x0: 11.0, x1: 15.0, top: 2.8 }];
      const b: BlockV2[] = [];
      // two stilted cabins on the plateau + a bridge between
      for (const cx of [11.9, 14.1]) {
        stack(b, cx - 0.7, 2.8, 2, 'wood');                          // 2 wide stilts so the deck can't teeter
        stack(b, cx + 0.7, 2.8, 2, 'wood');                          // 2
        b.push(B('wood', 'plankM', cx, 4.4));                        // deck
        b.push(B('glass', 'postM', cx - 0.9, 4.8));
        b.push(B('glass', 'postM', cx + 0.9, 4.8));
        b.push(B('stone', 'plankM', cx, 6.0));
        stack(b, cx, 6.4, 1, 'wood');                                // => 8 each = 16
      }
      // plateau surface fillers + ground guards
      stack(b, 10.0, 0, 4, 'wood');                                  // 4
      stack(b, 16.0, 0, 4, 'wood');                                  // 4
      stack(b, 9.0, 0, 3, 'wood');                                   // 3 ground guards
      stack(b, 17.0, 0, 3, 'wood');                                  // 3 => 32
      const pigs = [P('S', 11.9, 4.8), P('M', 14.1, 4.8), P('S', 11.9, 7.2), P('S', 10.0, 3.2), P('S', 16.0, 3.2)];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '24-fuse-line', id: 'fuse-line', name: 'Fuse Line', chapter: 'citadel', order: 4,
    archetype: 'pyramid', bots: ['blast', 'grok', 'grok'],
    hint: 'Three kegs, one fuse. Start the chain.',
    build: () => {
      const b: BlockV2[] = [];
      // stepped mound (plateau pairs so perches sit flat) + a TNT fuse line along its foot
      const heights = [3, 3, 3, 3, 3, 3, 3, 3, 3]; // 27, capped at 3 for stability
      const mats: Mat[] = ['stone', 'wood', 'stone', 'wood', 'stone', 'wood', 'stone', 'wood', 'stone'];
      for (let i = 0; i < heights.length; i++) {
        stack(b, 10.0 + i * 0.9, 0, heights[i]!, mats[i]!);          // 0.1 gaps kill squeeze
      }
      for (const x of [18.4, 19.4]) b.push(B('tnt', 'cube', x, 0));    // 2 rear kegs
      b.push(B('tnt', 'cube', 9.0, 0));                                // 1 lead keg
      b.push(B('glass', 'cube', 16.3, heights[7]! * 0.8));             // glass cap weak point
      stack(b, 11.8, heights[2]! * 0.8, 1, 'wood');                  // stepped cubes
      stack(b, 15.4, heights[6]! * 0.8, 1, 'wood');                  // => 33
      const pigs = [
        P('S', 10.9, 2.4), P('M', 13.6, 2.4), P('S', 16.3, 3.2),
        P('S', 17.2, 2.4), P('S', 19.4, 0.8), P('S', 9.0, 0.8),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '25-split-keep', id: 'split-keep', name: 'Split Keep', chapter: 'citadel', order: 5,
    archetype: 'castle', bots: ['heavy', 'heavy', 'split', 'grok', 'grok', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      // wide castle, both ends matter — split covers the spread
      const t1 = tower(b, 9.4, 0, 2, { h: 'postM', wall: 'stone', roof: 'stone' });   // 6 -> 3.2
      const t2 = tower(b, 12.6, 0, 2, { h: 'postM', wall: 'glass', roof: 'stone' });  // 6 -> 3.2
      const t3 = tower(b, 16.6, 0, 2, { h: 'postM', wall: 'stone', roof: 'stone', glassTier: 0 }); // 6 -> 3.2
      const t4 = tower(b, 19.6, 0, 2, { h: 'postM', wall: 'wood', roof: 'wood' });    // 6 -> 3.2
      stack(b, 11.0, 0, 2, 'stone');                                 // 2
      stack(b, 14.4, 0, 2, 'wood');                                  // 2
      stack(b, 18.1, 0, 2, 'stone');                                 // 2
      stack(b, 9.4, t1, 1, 'stone');                               // 1 cubes on tower roofs
      stack(b, 16.6, t3, 1, 'stone');                              // 1
      stack(b, 12.6, t2, 2, 'stone');                                // 2 crown column
      stack(b, 9.4, t1 + 0.8, 1, 'stone');                           // 1
      stack(b, 16.6, t3 + 0.8, 1, 'stone');                          // 1 => 34
      const pigs = [
        P('M', 12.6, 0), P('M', 16.6, 0), P('M', 19.6, 0),
        P('S', 9.4, t1 + 1.6), P('S', 16.6, t3 + 1.6),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '26-dash-bridge', id: 'dash-bridge', name: 'Dash Bridge', chapter: 'citadel', order: 6,
    archetype: 'bridge', bots: ['dash', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'ramp', x0: 4.5, x1: 8.5, y0: 0, y1: 1.6 }];
      const b: BlockV2[] = [];
      const br = bridge(b, 10.0, 3, { pier: 'stone', span: 'wood', pierH: 3 }); // 15 -> deckY 2.8
      stack(b, 8.8, 0, 3, 'wood', 'cubeS');                            // 3 guards tucked beside the piers
      stack(b, 23.3, 0, 3, 'wood');                                    // 3 => 21
      const pigs = [
        P('M', 13.0, br.deckY), P('M', 17.0, br.deckY), P('S', 16.0, br.deckY),
        P('M', 10.5, br.deckY), P('S', 19.0, br.deckY),
      ];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '27-blast-vault', id: 'blast-vault', name: 'Blast Vault', chapter: 'citadel', order: 7,
    archetype: 'bunker', bots: ['blast', 'heavy', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      // stone vault (king + keg inside) + flank towers holding kegs + gate columns
      const v = cell(b, 12.4, 0, { h: 'postL', gap: 1.8, wall: 'stone', roof: 'stone' }); // 3 -> 2.4
      b.push(B('tnt', 'cube', 13.35, 0));                              // keg inside vault
      const t1 = tower(b, 8.0, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' });   // 6 -> 3.2
      const t2 = tower(b, 16.6, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' });  // 6 -> 3.2
      b.push(B('tnt', 'cube', 8.0, 0));                                // kegs inside towers
      b.push(B('tnt', 'cube', 16.6, 0));                               // 2
      stack(b, 9.65, 0, 4, ['stone', 'glass', 'stone']);               // 4 gate column
      stack(b, 14.9, 0, 4, ['stone', 'glass', 'stone']);               // 4
      stack(b, 6.3, 0, 2, 'wood');                                     // 2 outriggers
      stack(b, 18.4, 0, 2, 'wood');                                    // 2 => 30
      const pigs = [
        P('L', 11.9, 0, { king: true }), P('S', 12.4, v),
        P('M', 9.65, 3.2), P('M', 14.9, 3.2), P('S', 8.2, t1), P('S', 16.6, t2),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '28-helmet-keep', id: 'helmet-keep', name: 'Helmet Keep', chapter: 'citadel', order: 8,
    archetype: 'tower', bots: ['heavy', 'grok', 'grok'],
    build: () => {
      const terrain: TerrainV2[] = [{ kind: 'ledge', x0: 14.5, x1: 18.0, top: 3.0, thickness: 0.6 }];
      const b: BlockV2[] = [];
      // tall armored tower with glass band + ledge outpost
      const r1 = cell(b, 10.8, 0, { h: 'postL', wall: 'stone', roof: 'stone' });   // 3 -> 2.4
      b.push(B('glass', 'postM', 9.9, r1));                          // glass band
      b.push(B('glass', 'postM', 11.7, r1));                         // 2
      b.push(B('stone', 'plankM', 10.8, r1 + 1.2));                  // 1
      stack(b, 10.8, r1 + 1.6, 1, 'stone');                          // 1 crown cube
      // ledge outpost
      const lk = cell(b, 16.0, 3.0, { h: 'postM', wall: 'stone', roof: 'stone' });  // 3 -> 4.6
      stack(b, 16.0, lk, 4, 'stone');                                // 4
      stack(b, 17.6, 3.0, 5, 'wood');                                // 5
      b.push(B('wood', 'plankS', 17.6, 7.0));                        // 1
      // extra garrison walls on the ground
      stack(b, 12.6, 0, 3, 'wood');                                  // 3
      b.push(B('wood', 'plankS', 12.6, 2.4));                        // 1
      stack(b, 12.6, 2.8, 1, 'wood');                                // 1
      stack(b, 13.6, 0, 5, 'stone');                                 // 5 => 30
      const pigs = [
        P('M', 10.8, 0, { helmet: 'helmet' }), P('S', 10.8, r1 + 2.4),
        P('M', 16.0, 3.0), P('S', 17.6, 7.4, { helmet: 'hat' }), P('S', 12.6, 3.6),
        P('S', 13.6, 4.0),
      ];
      return { blocks: b, pigs, terrain };
    },
  },
  {
    file: '29-four-roles', id: 'four-roles', name: 'Four Roles', chapter: 'citadel', order: 9,
    archetype: 'castle', bots: ['grok', 'dash', 'split', 'heavy', 'blast', 'grok'],
    build: () => {
      const b: BlockV2[] = [];
      // sprawling castle — every bot has a job
      const t1 = tower(b, 9.2, 0, 2, { h: 'postM', wall: 'stone', roof: 'stone' });   // 6 -> 3.2
      const t2 = tower(b, 15.4, 0, 3, { h: 'postM', wall: 'stone', roof: 'stone' });  // 9 -> 4.8
      const k = cell(b, 12.3, 0, { h: 'postL', gap: 1.4, wall: 'glass', roof: 'stone' }); // 3 -> 2.4 keep
      const t3 = tower(b, 19.0, 0, 2, { h: 'postM', wall: 'wood', roof: 'wood' });    // 6 -> 3.2
      b.push(B('tnt', 'cube', 20.6, 0));                             // 1 keg out back
      stack(b, 17.4, 0, 2, 'stone');                                 // 2
      stack(b, 21.8, 0, 4, 'stone');                                 // 4 outrigger => 30
      const pigs = [
        P('M', 9.2, 0), P('M', 12.3, 0), P('M', 15.4, 0), P('M', 19.0, 0),
        P('S', 9.2, t1), P('S', 17.4, 1.6),
      ];
      return { blocks: b, pigs, terrain: [] };
    },
  },
  {
    file: '30-last-stand', id: 'last-stand', name: 'Last Stand', chapter: 'citadel', order: 10,
    archetype: 'pyramid', bots: ['grok', 'dash', 'split', 'heavy', 'blast'],
    hint: 'The final fortress. Everything must fall.',
    build: () => {
      const b: BlockV2[] = [];
      // Mega citadel: royal vault + keg towers + side walls + plateau annex.
      const v = cell(b, 12.2, 0, { h: 'postL', gap: 1.6, wall: 'stone', roof: 'stone' }); // 3 -> 2.4
      stack(b, 12.2, v, 2, 'glass');                                   // 2 glass crown on the roof
      stack(b, 11.3, v, 1, 'glass');                                   // glass flank on the roof (5th glass)
      stack(b, 13.1, v, 2, 'stone');                                   // 2
      // keg towers flanking (each holds 2 TNT inside its cells)
      const t1 = tower(b, 8.6, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' });   // 6 -> 3.2
      const t2 = tower(b, 15.6, 0, 2, { h: 'postM', wall: 'wood', roof: 'stone' });  // 6 -> 3.2
      b.push(B('tnt', 'cube', 8.6, 0));                                // 4 tnt in towers
      b.push(B('tnt', 'cube', 8.6, 1.6));
      b.push(B('tnt', 'cube', 15.6, 0));
      b.push(B('tnt', 'cube', 15.6, 1.6));
      // stepped side walls, spaced clear of the tower posts
      stack(b, 5.3, 0, 4, 'stone');                                    // 4 stepped left wall
      stack(b, 6.2, 0, 4, 'stone');                                    // 4
      stack(b, 7.0, 0, 4, 'glass');                                    // 4 glass weak column
      stack(b, 17.4, 0, 4, 'glass');                                   // 4 glass weak column
      stack(b, 23.0, 0, 4, 'stone');                                   // 4 past the plateau
      stack(b, 23.9, 0, 4, 'stone');                                   // 4 far outrigger
      stack(b, 24.8, 0, 4, 'stone');                                   // 4 farther
      // plateau annex: hut + column planted on the plateau itself
      const a = cell(b, 20.4, 1.4, { h: 'postM', wall: 'stone', roof: 'stone' });      // 3 -> 3.0
      stack(b, 22.2, 1.4, 4, 'stone');                                 // 4 annex column on the plateau
      b.push(B('tnt', 'cube', 19.0, 0));                               // 1 => 5th tnt
      const pigs = [
        P('L', 12.2, 0, { king: true }), P('S', 17.4, 3.2),
        P('S', 8.6, t1), P('S', 15.6, t2),
        P('M', 20.4, 1.4), P('S', 22.2, 4.6),
      ];
      const terrain: TerrainV2[] = [{ kind: 'plateau', x0: 19.4, x1: 22.6, top: 1.4 }];
      return { blocks: b, pigs, terrain };
    },
  },
];

// ---------- emit + audit ----------
import { blockAabb, validateStatic } from '../src/levels/validate';
import { expandLevel } from '../src/levels/expand';
import { Level } from '../src/game/Level';
import { Vec2 as PVec2 } from 'planck';

const outDir = join(import.meta.dirname, '../src/levels/data');
mkdirSync(outDir, { recursive: true });

const RANGE = { training: [12, 30], workshop: [20, 45], citadel: [30, 60] } as const;
const INTRO: Partial<Record<BotKind, number>> = { split: 4, dash: 7, heavy: 11, blast: 18 };
let fail = false;
const err = (m: string) => { fail = true; console.error('VIOLATION', m); };

const only = process.argv[2];
let big = 0;
let terrainCount = 0;
for (let i = 0; i < specs.length; i++) {
  const s = specs[i]!;
  if (only && s.id !== only) continue;
  seq = 1;
  pseq = 1;
  const built = s.build();
  const nb = built.blocks.length;
  const np = built.pigs.length;
  const globalOrder = i + 1;

  // constraint audits
  const [lo, hi] = RANGE[s.chapter];
  if (nb < lo || nb > hi) err(`${s.id}: ${nb} blocks outside [${lo},${hi}]`);
  if (s.order === 10 && nb !== hi) err(`${s.id}: finale blocks ${nb} != ${hi}`);
  if (s.order === 1 && s.chapter === 'training') {
    if (nb > 12 || np > 2) err(`${s.id}: level1 must be <=12 blocks, <=2 targets (${nb}/${np})`);
  } else {
    if (nb < 14 || np < 3) err(`${s.id}: >=14 blocks, >=3 targets required (${nb}/${np})`);
  }
  if (np < 2 || (s.id !== 'last-stand' && np > 6)) err(`${s.id}: targets ${np} outside [2,6]`);
  if (nb >= 20 && np >= 4) big++;
  if (built.terrain.length) terrainCount++;
  if (i > 0 && specs[i - 1]!.archetype === s.archetype) err(`${s.id}: consecutive archetype ${s.archetype}`);
  for (const k of s.bots) {
    const intro = INTRO[k];
    if (intro && globalOrder < intro) err(`${s.id}: bot ${k} before intro level ${intro}`);
  }
  if (globalOrder < 9 && built.blocks.some((b) => b.material === 'tnt')) {
    err(`${s.id}: TNT before level 9`);
  }
  if (globalOrder === 29 || globalOrder === 30) {
    const kinds = new Set(s.bots);
    if (kinds.size < 5) err(`${s.id}: needs all five bot kinds`);
    if (nb < 24 || np < 4) err(`${s.id}: >=24 blocks, >=4 targets required`);
  }
  if (s.id === 'last-stand') {
    if (nb < 30 || np < 5 || np > 8 || s.bots.length < 4) err(`${s.id}: last-stand counts`);
    for (const m of ['wood', 'stone', 'glass', 'tnt'] as Mat[]) {
      const n = built.blocks.filter((b) => b.material === m).length;
      if (n < 5) err(`${s.id}: only ${n} ${m} blocks`);
    }
    if (!built.pigs.some((p) => p.king)) err(`${s.id}: no king`);
  }

  const level: LevelV2 = {
    version: 2,
    id: s.id,
    name: s.name,
    chapter: s.chapter,
    order: s.order,
    bots: s.bots,
    stars: [1, 2, 3],
    camera: { minX: -11, maxX: 0, minY: 0, maxY: 0 },
    sling: { x: -7.5 },
    terrain: built.terrain,
    blocks: built.blocks,
    pigs: built.pigs,
  };
  if (s.hint) level.hint = s.hint;

  // camera bounds = real block/pig extents + 0.5 margin, rounded up
  const expanded = expandLevel(level);
  let extentX = -Infinity;
  let extentY = -Infinity;
  for (const eb of expanded.blocks) {
    const [, , x1, y1] = blockAabb(eb);
    extentX = Math.max(extentX, x1);
    extentY = Math.max(extentY, y1);
  }
  for (const ep of expanded.pigs) {
    extentX = Math.max(extentX, ep.cx + ep.r);
    extentY = Math.max(extentY, ep.cy + ep.r);
  }
  level.camera.maxX = Math.ceil(extentX + 0.5);
  level.camera.maxY = Math.ceil(extentY + 0.5);

  for (const e of validateStatic(level)) err(`${s.id}: STATIC ${e}`);

  // settle (spawn-jitter budget matches validatePhysics) + 5s idle drift <=0.02
  const sim = Level.load(level);
  const pre = sim.registry.all().filter((e) => e.kind === 'block' && e.alive && e.body).map((e) => ({
    e, p: e.body!.getPosition().clone(),
  }));
  const st = sim.settle();
  if (st.maxMove > 0.08 || st.maxRotDeg > 1) {
    const movers = pre
      .filter((s0) => s0.e.alive && s0.e.body)
      .map((s0) => ({ id: s0.e.id, d: PVec2.distance(s0.p, s0.e.body!.getPosition()) }))
      .sort((a, z) => z.d - a.d)
      .slice(0, 4);
    err(`${s.id}: settle move ${st.maxMove.toFixed(3)} rot ${st.maxRotDeg.toFixed(2)} worst: ${movers.map((m) => `${m.id}=${m.d.toFixed(2)}`).join(',')}`);
  }
  const before = sim.registry.all().filter((e) => e.kind === 'block' && e.alive && e.body).map((e) => ({
    e, p: e.body!.getPosition().clone(),
  }));
  const deaths = sim.idle(5);
  if (deaths.length) err(`${s.id}: idle deaths ${deaths.join(',')}`);
  let drift = 0;
  for (const s0 of before) {
    if (!s0.e.alive || !s0.e.body) continue;
    drift = Math.max(drift, PVec2.distance(s0.p, s0.e.body.getPosition()));
  }
  if (drift > 0.02) err(`${s.id}: idle drift ${drift.toFixed(3)}`);

  writeFileSync(join(outDir, `${s.file}.json`), JSON.stringify(level, null, 2) + '\n');
  console.log(`${s.file} ${s.id}: ${s.archetype} blocks=${nb} pigs=${np} bots=${s.bots.join('/')} drift=${drift.toFixed(3)}`);
}
if (!only) {
  if (big < 10) err(`only ${big} levels with >=20 blocks & >=4 targets (need 10)`);
  if (terrainCount < 6) err(`only ${terrainCount} terrain levels (need 6)`);
}
console.log(`big=${big} terrain=${terrainCount}`);
process.exit(fail ? 1 : 0);
