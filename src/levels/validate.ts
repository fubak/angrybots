import type { LevelV2 } from './schema';
import { isLevelV2 } from './schema';
import { Level, replayLevel } from '../game/Level';
import solutions from './solutions.json';
import { expandLevel, type ExpandedBlock, type ExpandedPig } from './expand';

type SolutionEntry = {
  shots: { angleDeg: number; speed: number; abilityAt?: number }[];
  score: number;
};

const EPS = 0.002;
const SUPPORT_Y = 0.003;
const SUPPORT_X = 0.05;
const CAMERA_MARGIN = 0.5;

type Vec = { x: number; y: number };

export function blockAabb(b: ExpandedBlock): [number, number, number, number] {
  if (b.shape === 'circle') {
    return [b.cx - b.r!, b.cy - b.r!, b.cx + b.r!, b.cy + b.r!];
  }
  return [b.cx - b.w / 2, b.cy - b.h / 2, b.cx + b.w / 2, b.cy + b.h / 2];
}

function blockVerts(b: ExpandedBlock): Vec[] {
  if (b.shape === 'circle') {
    const n = 12;
    const out: Vec[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ x: b.cx + Math.cos(a) * b.r!, y: b.cy + Math.sin(a) * b.r! });
    }
    return out;
  }
  if (b.shape === 'triangle') {
    const w = b.w;
    const h = b.h;
    const apexX = b.triMirror ? w / 2 : -w / 2;
    const local = [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: apexX, y: h / 2 },
    ];
    return local.map((p) => ({ x: b.cx + p.x, y: b.cy + p.y }));
  }
  const hw = b.w / 2;
  const hh = b.h / 2;
  return [
    { x: b.cx - hw, y: b.cy - hh },
    { x: b.cx + hw, y: b.cy - hh },
    { x: b.cx + hw, y: b.cy + hh },
    { x: b.cx - hw, y: b.cy + hh },
  ];
}

function project(verts: Vec[], axis: Vec): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of verts) {
    const p = v.x * axis.x + v.y * axis.y;
    min = Math.min(min, p);
    max = Math.max(max, p);
  }
  return [min, max];
}

function overlapSAT(a: Vec[], b: Vec[]): number {
  const axes: Vec[] = [];
  const addAxes = (verts: Vec[]) => {
    for (let i = 0; i < verts.length; i++) {
      const p1 = verts[i]!;
      const p2 = verts[(i + 1) % verts.length]!;
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const len = Math.hypot(edge.x, edge.y) || 1;
      axes.push({ x: -edge.y / len, y: edge.x / len });
    }
  };
  addAxes(a);
  addAxes(b);
  let minOverlap = Infinity;
  for (const axis of axes) {
    const [a0, a1] = project(a, axis);
    const [b0, b1] = project(b, axis);
    const overlap = Math.min(a1, b1) - Math.max(a0, b0);
    if (overlap <= 0) return 0;
    minOverlap = Math.min(minOverlap, overlap);
  }
  return minOverlap;
}

function shapesOverlap(a: ExpandedBlock, b: ExpandedBlock): number {
  if (a.shape === 'box' && b.shape === 'box') {
    const A = blockAabb(a);
    const B = blockAabb(b);
    const ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]);
    const oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
    if (ox <= 0 || oy <= 0) return 0;
    return Math.min(ox, oy);
  }
  return overlapSAT(blockVerts(a), blockVerts(b));
}

function pigBlockOverlap(p: ExpandedPig, b: ExpandedBlock): boolean {
  if (b.shape === 'box') {
    const [x0, y0, x1, y1] = blockAabb(b);
    const qx = Math.max(x0 - p.cx, 0, p.cx - x1);
    const qy = Math.max(y0 - p.cy, 0, p.cy - y1);
    return Math.hypot(qx, qy) < p.r - EPS;
  }
  const verts = blockVerts(b);
  for (const v of verts) {
    if (Math.hypot(v.x - p.cx, v.y - p.cy) < p.r - EPS) return true;
  }
  return false;
}

function supportTops(level: ReturnType<typeof expandLevel>) {
  const tops: { id: string; y: number; x0: number; x1: number }[] = [];
  for (const b of level.blocks) {
    const [x0, , x1, y1] = blockAabb(b);
    tops.push({ id: b.id, y: y1, x0, x1 });
  }
  for (const t of level.terrain) {
    if (t.kind === 'plateau' || t.kind === 'ledge') {
      tops.push({ id: 'terrain', y: t.top, x0: t.x0, x1: t.x1 });
    } else {
      tops.push({ id: 'terrain', y: Math.max(t.y0, t.y1), x0: t.x0, x1: t.x1 });
    }
  }
  return tops;
}

function isSupported(bottom: number, x0: number, x1: number, selfId: string, tops: ReturnType<typeof supportTops>) {
  if (bottom < 0.003) return true;
  return tops.some(
    (t) =>
      t.id !== selfId &&
      Math.abs(t.y - bottom) < SUPPORT_Y &&
      Math.min(x1, t.x1) - Math.max(x0, t.x0) > SUPPORT_X
  );
}

export function validateStatic(levelRaw: LevelV2): string[] {
  const errs: string[] = [];
  if (!isLevelV2(levelRaw)) {
    errs.push('S7: schema invalid');
    return errs;
  }
  const L = expandLevel(levelRaw);
  const blocks = L.blocks;

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const ov = shapesOverlap(blocks[i]!, blocks[j]!);
      if (ov > EPS) errs.push(`S1: overlap ${blocks[i]!.id} x ${blocks[j]!.id}`);
    }
  }

  for (const p of L.pigs) {
    for (const b of blocks) {
      if (pigBlockOverlap(p, b)) errs.push(`S2: pig ${p.id} inside ${b.id}`);
    }
    for (const t of L.terrain) {
      const top = t.kind === 'ramp' ? Math.max(t.y0, t.y1) : t.top;
      if (p.cy - p.r < top - EPS && p.cx >= t.x0 && p.cx <= t.x1) {
        errs.push(`S2: pig ${p.id} inside terrain`);
      }
    }
  }

  for (let i = 0; i < L.pigs.length; i++) {
    for (let j = i + 1; j < L.pigs.length; j++) {
      const a = L.pigs[i]!;
      const b = L.pigs[j]!;
      if (Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r - EPS) {
        errs.push(`S2: pig ${a.id} x ${b.id}`);
      }
    }
  }

  const tops = supportTops(L);
  for (const b of blocks) {
    const [x0, y0, x1] = blockAabb(b);
    if (!isSupported(y0, x0, x1, b.id, tops)) errs.push(`S3: unsupported ${b.id}`);
  }
  for (const p of L.pigs) {
    const bottom = p.cy - p.r;
    if (!isSupported(bottom, p.cx - 0.05, p.cx + 0.05, p.id, tops)) {
      errs.push(`S4: unsupported ${p.id}`);
    }
  }

  const cam = L.camera;
  const allX = [...blocks.map((b) => b.cx), ...L.pigs.map((p) => p.cx), L.sling.x];
  const allY = [
    ...blocks.map((b) => blockAabb(b)[1]),
    ...L.pigs.map((p) => p.cy - p.r),
  ];
  if (allX.some((x) => x < cam.minX || x > cam.maxX) || allY.some((y) => y < cam.minY || y > cam.maxY)) {
    errs.push('S5: out of camera bounds');
  }
  for (const b of blocks) {
    const [x0, y0, x1, y1] = blockAabb(b);
    if (x0 < cam.minX || x1 > cam.maxX || y0 < cam.minY || y1 > cam.maxY) {
      errs.push(`S5: block ${b.id} outside camera`);
    }
    if (x1 > cam.maxX - CAMERA_MARGIN || y1 > cam.maxY - CAMERA_MARGIN) {
      errs.push(`S5: block ${b.id} camera margin`);
    }
  }
  for (const p of L.pigs) {
    if (
      p.cx - p.r < cam.minX ||
      p.cx + p.r > cam.maxX ||
      p.cy - p.r < cam.minY ||
      p.cy + p.r > cam.maxY
    ) {
      errs.push(`S5: pig ${p.id} outside camera`);
    }
    if (p.cx + p.r > cam.maxX - CAMERA_MARGIN || p.cy + p.r > cam.maxY - CAMERA_MARGIN) {
      errs.push(`S5: pig ${p.id} camera margin`);
    }
  }
  let nearestBlockX = Infinity;
  for (const b of blocks) nearestBlockX = Math.min(nearestBlockX, b.cx);
  if (blocks.length && L.sling.x > nearestBlockX - 12) {
    errs.push('S5: sling too close to structures');
  }

  const ids = new Set<string>();
  for (const b of L.blocks) {
    if (ids.has(b.id)) errs.push(`S6: duplicate id ${b.id}`);
    ids.add(b.id);
  }
  for (const p of L.pigs) {
    if (ids.has(p.id)) errs.push(`S6: duplicate id ${p.id}`);
    ids.add(p.id);
  }
  if (L.stars[0] >= L.stars[1] || L.stars[1] >= L.stars[2]) errs.push('S6: stars not ascending');
  if (L.bots.length < 1 || L.bots.length > 6) errs.push('S6: bots length');
  if (L.name.length > 18) errs.push('S6: name too long');

  return errs;
}

export function validatePhysics(level: LevelV2): string[] {
  const errs: string[] = [];
  const sim = Level.load(level);
  const st = sim.settle();
  if (st.maxMove > 0.08) errs.push(`P1: settle move ${st.maxMove.toFixed(3)}`);
  if (st.maxRotDeg > 1) errs.push(`P2: settle rot ${st.maxRotDeg.toFixed(2)}`);
  const rest = sim.registry
    .all()
    .filter((e) => e.alive && e.body)
    .map((e) => ({ e, p: e.body!.getPosition().clone() }));
  const deaths = sim.idle(5);
  if (deaths.length) errs.push(`P3: idle deaths ${deaths.join(',')}`);
  let drift = 0;
  for (const s of rest) {
    if (!s.e.alive || !s.e.body) continue;
    drift = Math.max(drift, Math.hypot(s.p.x - s.e.body.getPosition().x, s.p.y - s.e.body.getPosition().y));
  }
  if (drift > 0.02) errs.push(`P1: idle drift ${drift.toFixed(3)}`);
  const sol = (solutions as Record<string, SolutionEntry>)[level.id];
  if (!sol) {
    errs.push('P4: no committed solution');
    return errs;
  }
  const shots = sol.shots.map(
    (s, i) => [s.angleDeg, s.speed, level.bots[i] ?? level.bots[0]!] as const
  );
  const replay = replayLevel(level, shots.map((s) => [s[0], s[1], s[2]] as [number, number, typeof level.bots[0]]));
  if (replay.pigsAlive() > 0) errs.push(`P4: solution leaves ${replay.pigsAlive()} pigs`);
  let used = sol.shots.length;
  for (let k = 1; k <= shots.length; k++) {
    if (replayLevel(level, shots.slice(0, k).map((s) => [s[0], s[1], s[2]] as [number, number, typeof level.bots[0]])).pigsAlive() === 0) {
      used = k;
      break;
    }
  }
  const unused = level.bots.length - used;
  const total = replay.hooks.score + (replay.pigsAlive() === 0 ? unused * 10000 : 0);
  if (total < level.stars[0]) errs.push(`P5: score ${total} below star1 ${level.stars[0]}`);
  return errs;
}
