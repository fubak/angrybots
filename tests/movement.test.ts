import { describe, it, expect } from 'vitest';
import { WorldMap } from '../src/engine/map';
import { Player } from '../src/engine/player';
import type { MapDef } from '../src/core/types';

const def: MapDef = {
  grid: [
    '#####',
    '#...#',
    '#.D.#',
    '#...#',
    '#####',
  ],
  legend: {
    '#': { kind: 'wall', tex: 'wall-panel' },
    '.': { kind: 'floor', tex: 'floor' },
    'D': { kind: 'door', tex: 'door', doorId: 'd1' },
  },
  spawn: { x: 1.5, y: 1.5, angle: 0 },
};

describe('WorldMap', () => {
  it('walls block, floors do not', () => {
    const m = new WorldMap(def);
    expect(m.blocked(0, 0)).toBe(true);
    expect(m.blocked(1, 1)).toBe(false);
    expect(m.blockedF(-1, -1)).toBe(true);
  });
});

describe('doors', () => {
  it('closed door blocks, open door passes', () => {
    const d2: MapDef = { ...def, grid: ['#####', '#...#', '#.D.#', '#...#', '#####'] };
    const m = new WorldMap(d2);
    // cell (2,2) is 'D'
    expect(m.cellAt(2, 2)?.kind).toBe('door');
    expect(m.blocked(2, 2)).toBe(true);
    m.openDoor('d1');
    expect(m.blocked(2, 2)).toBe(false);
  });
});

describe('Player movement', () => {
  it('moves forward along facing', () => {
    const m = new WorldMap(def);
    const p = new Player(2.5, 1.5, 0); // facing +x
    for (let i = 0; i < 30; i++) p.move(m, 1, 0, false, 0, 1 / 60);
    expect(p.x).toBeGreaterThan(2.7);
  });
  it('collides with walls and does not tunnel', () => {
    const m = new WorldMap(def);
    const p = new Player(2.5, 1.5, 0);
    for (let i = 0; i < 300; i++) p.move(m, 1, 0, true, 0, 1 / 60);
    // east wall at x=4; radius keeps player below 4
    expect(p.x).toBeLessThan(4);
    expect(p.x).toBeGreaterThan(3);
  });
  it('slides along the wall when moving diagonally into it', () => {
    const m = new WorldMap(def);
    const p = new Player(3.4, 1.5, 0);
    // push +x (into wall at x=4) and strafe +y
    for (let i = 0; i < 120; i++) p.move(m, 1, -1, false, 0, 1 / 60);
    expect(p.x).toBeLessThan(4);
    expect(p.y).toBeLessThan(1.4); // slid along the wall instead of sticking
  });
  it('friction stops the player when input ceases', () => {
    const m = new WorldMap(def);
    const p = new Player(2.5, 2.8, 0);
    for (let i = 0; i < 30; i++) p.move(m, 1, 0, false, 0, 1 / 60);
    for (let i = 0; i < 60; i++) p.move(m, 0, 0, false, 0, 1 / 60);
    expect(Math.hypot(p.vx, p.vy)).toBeLessThan(0.1);
  });
});

describe('raycast', () => {
  it('hits the east wall', () => {
    const m = new WorldMap(def);
    const r = m.raycast(1.5, 1.5, 0);
    expect(r.dist).toBeGreaterThan(2);
    expect(r.dist).toBeLessThan(3);
    expect(r.cell?.kind).toBe('wall');
  });
});
