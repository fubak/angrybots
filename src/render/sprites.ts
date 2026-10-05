import * as THREE from 'three';
import { Registry } from '../core/registry';

/**
 * Billboard sprite atlas: each sprite is a procedurally drawn canvas.
 * Sprites use NearestFilter + alpha, rendered as THREE.Sprite.
 */

export const spriteRegistry = new Registry<THREE.Texture>();

type Painter = (g: CanvasRenderingContext2D, s: number) => void;

function makeSprite(id: string, painter: Painter): THREE.Texture {
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
  spriteRegistry.register(id, t);
  return t;
}

function blob(g: CanvasRenderingContext2D, s: number, color: string, eye: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = eye;
  g.fillRect(s * 0.32, s * 0.36, 8, 8);
  g.fillRect(s * 0.58, s * 0.36, 8, 8);
}

function person(
  g: CanvasRenderingContext2D,
  s: number,
  shirt: string,
  skin: string,
  hair: string,
  longHair = false,
): void {
  const cx = s / 2;
  // body
  g.fillStyle = shirt;
  g.fillRect(cx - 12, s * 0.5, 24, s * 0.42);
  // head
  g.fillStyle = skin;
  g.fillRect(cx - 9, s * 0.2, 18, 18);
  // hair
  g.fillStyle = hair;
  g.fillRect(cx - 9, s * 0.16, 18, 6);
  if (longHair) {
    g.fillRect(cx - 11, s * 0.2, 4, 20);
    g.fillRect(cx + 7, s * 0.2, 4, 20);
  }
  // eyes
  g.fillStyle = '#111';
  g.fillRect(cx - 5, s * 0.28, 3, 3);
  g.fillRect(cx + 2, s * 0.28, 3, 3);
  // legs
  g.fillStyle = '#222';
  g.fillRect(cx - 10, s * 0.92, 8, s * 0.06);
  g.fillRect(cx + 2, s * 0.92, 8, s * 0.06);
}

export function buildSprites(): void {
  if (spriteRegistry.ids().length > 0) return;

  // Malware blobs
  makeSprite('worm', (g, s) => { blob(g, s, '#c33', '#ff9'); g.fillStyle='#a00'; for(let i=0;i<6;i++) g.fillRect(8+i*8, 8, 4, 8); });
  makeSprite('trojan', (g, s) => { blob(g, s, '#a5c', '#fff'); g.fillStyle='#fff'; g.font='bold 16px monospace'; g.fillText('T', 28, 46); });
  makeSprite('ransomware', (g, s) => { blob(g, s, '#e70', '#f00'); g.fillStyle='#f00'; g.fillRect(20,44,24,6); });

  // Workstation (desktop + monitor)
  makeSprite('workstation', (g, _s) => {
    g.fillStyle = '#222a38';
    g.fillRect(10, 14, 44, 30);
    g.fillStyle = '#0af';
    g.fillRect(14, 18, 36, 20);
    g.fillStyle = '#333';
    g.fillRect(8, 46, 48, 10);
  });
  makeSprite('workstation-infected', (g, _s) => {
    g.fillStyle = '#222a38';
    g.fillRect(10, 14, 44, 30);
    g.fillStyle = '#f33';
    g.fillRect(14, 18, 36, 20);
    g.fillStyle = '#ff0';
    g.font = 'bold 12px monospace';
    g.fillText('!!!', 26, 33);
    g.fillStyle = '#333';
    g.fillRect(8, 46, 48, 10);
  });

  // Console terminal
  makeSprite('console', (g, _s) => {
    g.fillStyle = '#2a3a2a';
    g.fillRect(12, 10, 40, 40);
    g.fillStyle = '#0f0';
    for (let y = 14; y < 44; y += 6) g.fillRect(16, y, 32 - ((y * 7) % 12), 2);
    g.fillStyle = '#1a1a1a';
    g.fillRect(12, 50, 40, 8);
  });

  // NPCs
  makeSprite('npc-m', (g, s) => person(g, s, '#36c', '#e8b98a', '#432'));
  makeSprite('npc-f', (g, s) => person(g, s, '#c60', '#f0c8a0', '#620', true));
  makeSprite('npc-suit', (g, s) => person(g, s, '#333', '#d9a06b', '#111'));

  // Items
  makeSprite('usb', (g, _s) => {
    g.fillStyle = '#888';
    g.fillRect(22, 20, 20, 12);
    g.fillStyle = '#36f';
    g.fillRect(26, 32, 14, 22);
    g.fillStyle = '#0f0';
    g.fillRect(28, 36, 10, 6);
  });
  makeSprite('charge', (g, _s) => {
    g.fillStyle = '#0af';
    g.beginPath();
    g.arc(32, 32, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(28, 28, 8, 8);
  });
  makeSprite('medkit', (g, _s) => {
    g.fillStyle = '#eee';
    g.fillRect(14, 20, 36, 26);
    g.fillStyle = '#e22';
    g.fillRect(28, 24, 8, 18);
    g.fillRect(23, 29, 18, 8);
  });
}
