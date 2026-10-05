import type { CellDef, MapDef } from '../core/types';

/**
 * Runtime grid map: cell lookup, door open state, wall collision, raycast.
 * Pure logic — no Three.js here so it stays unit-testable.
 */
export class WorldMap {
  readonly w: number;
  readonly h: number;
  readonly def: MapDef;
  private cells: (CellDef | null)[][];
  /** doorId -> open? */
  private doors = new Map<string, boolean>();

  constructor(def: MapDef) {
    this.def = def;
    this.h = def.grid.length;
    this.w = def.grid[0]?.length ?? 0;
    this.cells = def.grid.map((row) =>
      row.split('').map((ch) => def.legend[ch] ?? null),
    );
    for (const row of this.cells) {
      for (const c of row) {
        if (c?.kind === 'door' && c.doorId) this.doors.set(c.doorId, false);
      }
    }
  }

  cellAt(tx: number, ty: number): CellDef | null {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    return this.cells[ty][tx];
  }

  cellAtF(x: number, y: number): CellDef | null {
    return this.cellAt(Math.floor(x), Math.floor(y));
  }

  isDoorOpen(doorId: string): boolean {
    return this.doors.get(doorId) ?? false;
  }

  openDoor(doorId: string): void {
    this.doors.set(doorId, true);
  }

  /** A cell blocks movement if it's a wall or a closed door. */
  blocked(tx: number, ty: number): boolean {
    const c = this.cellAt(tx, ty);
    if (!c) return true;
    if (c.kind === 'wall') return true;
    if (c.kind === 'door') return !this.isDoorOpen(c.doorId ?? '');
    return false;
  }

  blockedF(x: number, y: number): boolean {
    return this.blocked(Math.floor(x), Math.floor(y));
  }

  /** Light level at a tile (0..1). */
  lightAt(tx: number, ty: number): number {
    const key = `${tx},${ty}`;
    return this.def.lights?.[key] ?? this.def.defaultLight ?? 0.9;
  }

  /**
   * DDA raycast from (x,y) along angle. Returns distance to first blocking cell
   * and the cell hit. maxDist in tiles.
   */
  raycast(
    x: number,
    y: number,
    angle: number,
    maxDist = 20,
  ): { dist: number; cell: CellDef | null; tx: number; ty: number } {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const step = 0.02;
    for (let d = step; d < maxDist; d += step) {
      const px = x + dx * d;
      const py = y + dy * d;
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      if (this.blocked(tx, ty)) {
        return { dist: d, cell: this.cellAt(tx, ty), tx, ty };
      }
    }
    return { dist: maxDist, cell: null, tx: -1, ty: -1 };
  }

  /**
   * Circle-vs-grid collision resolve: pushes (px,py) out of blocked cells and
   * enables wall sliding. Radius r in tiles.
   */
  resolve(x: number, y: number, r: number): { x: number; y: number } {
    let px = x;
    let py = y;
    for (let iter = 0; iter < 3; iter++) {
      const minTx = Math.floor(px - r);
      const maxTx = Math.floor(px + r);
      const minTy = Math.floor(py - r);
      const maxTy = Math.floor(py + r);
      let pushed = false;
      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          if (!this.blocked(tx, ty)) continue;
          // closest point on cell AABB to circle center
          const cx = Math.max(tx, Math.min(px, tx + 1));
          const cy = Math.max(ty, Math.min(py, ty + 1));
          const ddx = px - cx;
          const ddy = py - cy;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 >= r * r) continue;
          const d = Math.sqrt(d2) || 1e-6;
          const push = r - d;
          px += (ddx / d) * push;
          py += (ddy / d) * push;
          pushed = true;
        }
      }
      if (!pushed) break;
    }
    return { x: px, y: py };
  }
}
