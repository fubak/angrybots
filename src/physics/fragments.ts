type Point = { x: number; y: number };
import type { Material } from '../entities/types';

export function splitRect(w: number, h: number, pieces: number, rng: () => number): Point[][] {
  const hw = w / 2;
  const hh = h / 2;
  let polys: Point[][] = [
    [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ],
  ];

  const longAxis = w >= h;
  while (polys.length < pieces) {
    let bestIdx = 0;
    let bestArea = 0;
    for (let i = 0; i < polys.length; i++) {
      const a = polyArea(polys[i]!);
      if (a > bestArea) {
        bestArea = a;
        bestIdx = i;
      }
    }
    const poly = polys[bestIdx]!;
    const c = polyCentroid(poly);
    let cutOk = false;
    for (let attempt = 0; attempt < 10 && !cutOk; attempt++) {
      const baseAngle = longAxis ? 0 : Math.PI / 2;
      const jitter = (rng() * 2 - 1) * (20 * (Math.PI / 180));
      const angle = baseAngle + jitter;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const ox = (rng() * 2 - 1) * 0.2 * (longAxis ? w : h);
      const oy = (rng() * 2 - 1) * 0.2 * (longAxis ? h : w);
      const px = c.x + ox;
      const py = c.y + oy;
      const left: Point[] = [];
      const right: Point[] = [];
      for (const p of poly) {
        const d = (p.x - px) * nx + (p.y - py) * ny;
        if (d >= -1e-9) left.push(p);
        if (d <= 1e-9) right.push(p);
      }
      const a1 = left.length >= 3 ? polyArea(left) : 0;
      const a2 = right.length >= 3 ? polyArea(right) : 0;
      if (
        left.length >= 3 &&
        right.length >= 3 &&
        a1 >= 0.01 &&
        a2 >= 0.01 &&
        left.length <= 8 &&
        right.length <= 8 &&
        isConvex(left) &&
        isConvex(right)
      ) {
        polys.splice(bestIdx, 1, left, right);
        cutOk = true;
      }
    }
    if (!cutOk) break;
  }
  return polys.filter((p) => polyArea(p) >= 0.01 && p.length <= 8 && isConvex(p));
}

export function fragmentCountForMaterial(material: Material): number {
  switch (material) {
    case 'glass':
      return 7;
    case 'wood':
      return 5;
    case 'stone':
      return 5;
    default:
      return 0;
  }
}

function polyArea(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function polyCentroid(pts: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  const n = pts.length || 1;
  return { x: cx / n, y: cy / n };
}

function isConvex(pts: Point[]): boolean {
  if (pts.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const c = pts[(i + 2) % pts.length]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export function totalPolyArea(polys: Point[][]): number {
  return polys.reduce((s, p) => s + polyArea(p), 0);
}
