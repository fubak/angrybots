import * as THREE from 'three';

function canvasTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void
): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([200, 160, 100, 255]), 1, 1);
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const TEX = {
  wood: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#e8a85a';
    ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y++) {
      const wobble = Math.sin(y * 0.11) * 8 + Math.sin(y * 0.37) * 3;
      ctx.fillStyle = `rgba(70, 36, 12, ${0.08 + hash(y) * 0.18})`;
      ctx.fillRect(0, y, n, 1);
      if (y % 14 === 0) {
        ctx.fillStyle = 'rgba(40, 18, 6, 0.35)';
        ctx.fillRect(wobble, y, n, 2);
      }
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(90, 48, 16, 0.22)';
      ctx.beginPath();
      ctx.ellipse(40 + hash(i) * 180, 30 + hash(i + 3) * 190, 18, 7, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }),
  stone: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#8f959d';
    ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const ox = x * 32 + (y % 2) * 16;
        const oy = y * 32;
        ctx.fillStyle = `rgb(${140 + hash(x + y) * 30},${144 + hash(x * 3) * 24},${150 + hash(y * 5) * 20})`;
        ctx.fillRect(ox + 1, oy + 1, 30, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(ox + 2, oy + 2, 12, 4);
        ctx.fillStyle = 'rgba(20,20,24,0.2)';
        ctx.fillRect(ox + 18, oy + 20, 10, 8);
      }
    }
  }),
  grass: canvasTexture(256, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#8fe05a');
    g.addColorStop(1, '#3f8f24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 1400; i++) {
      const x = hash(i) * n;
      const y = hash(i + 9) * n;
      ctx.fillStyle = `rgba(${50 + hash(i + 1) * 40},${140 + hash(i + 2) * 80},${30},0.45)`;
      ctx.fillRect(x, y, 2, 5 + hash(i + 4) * 10);
    }
  }),
  dirt: canvasTexture(256, (ctx, n) => {
    const bands = ['#6b3d22', '#8a522c', '#a86a38', '#c4894c', '#7a4524', '#5c3420'];
    const band = n / bands.length;
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * band, n, band + 1);
    });
    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = `rgba(${40 + hash(i) * 50},${24},${12},0.45)`;
      ctx.beginPath();
      ctx.arc(hash(i + 4) * n, hash(i + 7) * n, 1.5 + hash(i + 8) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }),
  metal: canvasTexture(128, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, n, n);
    g.addColorStop(0, '#d8dde4');
    g.addColorStop(0.5, '#8c939c');
    g.addColorStop(1, '#c5cad1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
  }),
  tnt: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#c42316';
    ctx.fillRect(0, 0, n, n);
    ctx.save();
    ctx.translate(n / 2, n / 2);
    ctx.rotate(-0.55);
    for (let i = -8; i <= 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f2c230' : '#9a140c';
      ctx.fillRect(-n, i * 18 - 9, n * 2, 16);
    }
    ctx.restore();
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(n * 0.32, n * 0.42, n * 0.36, n * 0.16);
  }),
  sky: canvasTexture(512, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#1a4f9c');
    g.addColorStop(0.35, '#4aa4e8');
    g.addColorStop(0.7, '#c4e8ff');
    g.addColorStop(1, '#ffe6b0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
  }),
};

TEX.wood.repeat.set(1, 2);
TEX.stone.repeat.set(2, 2);
TEX.grass.repeat.set(8, 2);
TEX.dirt.repeat.set(6, 2);
TEX.tnt.repeat.set(1, 1);

let crack: THREE.Texture | null = null;

export function crackTexture(): THREE.Texture {
  if (crack) return crack;
  crack = canvasTexture(128, (ctx, n) => {
    ctx.clearRect(0, 0, n, n);
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(n * 0.5, n * 0.08);
    ctx.lineTo(n * 0.42, n * 0.38);
    ctx.lineTo(n * 0.62, n * 0.55);
    ctx.lineTo(n * 0.36, n * 0.92);
    ctx.moveTo(n * 0.42, n * 0.38);
    ctx.lineTo(n * 0.18, n * 0.58);
    ctx.moveTo(n * 0.62, n * 0.55);
    ctx.lineTo(n * 0.84, n * 0.7);
    ctx.stroke();
  });
  crack.wrapS = crack.wrapT = THREE.ClampToEdgeWrapping;
  return crack;
}
