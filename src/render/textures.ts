import * as THREE from 'three';
import { Registry } from '../core/registry';

/**
 * Procedural pixel-art texture atlas. Every texture is a small canvas
 * (64x64) with chunky pixels and NearestFilter for the Doom look.
 * No binary assets anywhere.
 */

export const textureRegistry = new Registry<THREE.Texture>();

type Painter = (g: CanvasRenderingContext2D, s: number) => void;

function makeTexture(id: string, painter: Painter): THREE.Texture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d')!;
  painter(g, s);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textureRegistry.register(id, t);
  return t;
}

function noise(
  g: CanvasRenderingContext2D,
  s: number,
  base: [number, number, number],
  vary: number,
  cell = 4,
): void {
  for (let y = 0; y < s; y += cell) {
    for (let x = 0; x < s; x += cell) {
      const v = (Math.random() - 0.5) * vary;
      g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`;
      g.fillRect(x, y, cell, cell);
    }
  }
}

export function buildTextures(): void {
  if (textureRegistry.ids().length > 0) return;

  // Grey tech-panel wall
  makeTexture('wall-panel', (g, s) => {
    noise(g, s, [70, 75, 85], 30);
    g.fillStyle = '#2c2f38';
    g.fillRect(0, 0, s, 4);
    g.fillRect(0, s - 4, s, 4);
    g.fillStyle = '#9aa2b5';
    g.fillRect(4, 8, s - 8, 3);
    g.fillStyle = '#3a3f4c';
    for (let y = 16; y < s - 8; y += 16) g.fillRect(6, y, s - 12, 8);
  });

  // Server-rack wall: dark with blinkenlights
  makeTexture('wall-server', (g, s) => {
    noise(g, s, [30, 32, 40], 16);
    for (let y = 4; y < s; y += 10) {
      g.fillStyle = '#14161c';
      g.fillRect(4, y, s - 8, 7);
      for (let x = 8; x < s - 8; x += 8) {
        g.fillStyle = ['#2f6', '#fa3', '#3af'][((x + y) / 8) % 3 | 0];
        g.fillRect(x, y + 2, 3, 3);
      }
    }
  });

  // Brick-ish corridor wall
  makeTexture('wall-brick', (g, s) => {
    noise(g, s, [96, 60, 50], 24);
    g.fillStyle = '#3a241f';
    for (let y = 0; y < s; y += 12) g.fillRect(0, y, s, 2);
    for (let y = 0; y < s; y += 24)
      for (let x = (y % 48 === 0 ? 0 : 16); x < s; x += 32) g.fillRect(x, y, 2, 12);
  });

  // Door texture — cyan-lit security door
  makeTexture('door', (g, s) => {
    noise(g, s, [40, 46, 60], 12);
    g.fillStyle = '#1a2f3f';
    g.fillRect(s / 2 - 2, 0, 4, s);
    g.fillStyle = '#0ef';
    g.fillRect(s / 2 - 10, s / 2 - 6, 8, 12);
    g.fillRect(s / 2 + 2, s / 2 - 6, 8, 12);
    g.fillStyle = '#8ac6ff';
    g.fillRect(4, 4, s - 8, 3);
    g.fillRect(4, s - 7, s - 8, 3);
  });

  // Floor tiles
  makeTexture('floor', (g, s) => {
    noise(g, s, [48, 50, 58], 14);
    g.fillStyle = '#23252c';
    g.fillRect(0, 0, s, 2);
    g.fillRect(0, 0, 2, s);
    g.fillRect(s / 2, 0, 2, s);
    g.fillRect(0, s / 2, s, 2);
  });

  // Ceiling — dark with light strips
  makeTexture('ceil', (g, s) => {
    noise(g, s, [26, 28, 34], 10);
    g.fillStyle = '#cfd6e0';
    g.fillRect(8, s / 2 - 2, s - 16, 4);
  });

  // Exit pad — glowing green
  makeTexture('exit', (g, s) => {
    noise(g, s, [20, 60, 30], 16);
    g.fillStyle = '#0f4';
    g.fillRect(8, 8, s - 16, s - 16);
    g.fillStyle = '#062';
    g.fillRect(14, 14, s - 28, s - 28);
    g.fillStyle = '#0f4';
    g.font = 'bold 14px monospace';
    g.fillText('EXIT', 16, 38);
  });
}
