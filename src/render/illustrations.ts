import * as THREE from 'three';

export type FaceSet = {
  idle: THREE.Texture;
  blink: THREE.Texture;
  hurt: THREE.Texture;
};

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function paintTex(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat = false
): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

type Expression = 'idle' | 'blink' | 'hurt';

function paintFace(
  ctx: CanvasRenderingContext2D,
  s: number,
  expression: Expression,
  draw: (ctx: CanvasRenderingContext2D, s: number, expression: Expression) => void
): void {
  ctx.clearRect(0, 0, s, s);
  draw(ctx, s, expression);
}

function outlineStroke(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = '#23180f';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

type BotPose = 'look' | 'dash' | 'dots' | 'wide' | 'alert';

function grokEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

type BotBody = 'disc' | 'blob' | 'bang';

/** Official SpaceXAI Grok Bot forms: disc, soft blob, and exclamation, with white marks. */
function paintGrokBot(
  ctx: CanvasRenderingContext2D,
  s: number,
  expression: Expression,
  pose: BotPose,
  body: BotBody = 'disc'
): void {
  const cx = s * 0.5;
  const cy = s * 0.5;
  const r = s * 0.4;
  ctx.fillStyle = '#111111';
  if (body === 'bang') {
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.28, cy - r * 0.95, r * 0.56, r * 1.35, r * 0.28);
    ctx.fill();
    if (expression !== 'blink') {
      circle(ctx, cx, cy + r * 0.72, r * 0.2);
      ctx.fill();
    }
    return;
  }
  if (body === 'blob') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.95);
    ctx.quadraticCurveTo(cx + r * 1.05, cy - r * 0.2, cx + r * 0.72, cy + r * 0.78);
    ctx.quadraticCurveTo(cx, cy + r * 1.05, cx - r * 0.72, cy + r * 0.78);
    ctx.quadraticCurveTo(cx - r * 1.05, cy - r * 0.15, cx, cy - r * 0.95);
    ctx.fill();
    ctx.strokeStyle = '#3ddc97';
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy + r * 0.15);
    ctx.quadraticCurveTo(cx - r * 0.05, cy - r * 0.15, cx + r * 0.08, cy - r * 0.45);
    ctx.stroke();
  } else {
    circle(ctx, cx, cy, r);
    ctx.fill();
  }
  const blink = expression === 'blink';
  const hurt = expression === 'hurt';
  if (pose === 'dots' || hurt) {
    const rad = hurt ? r * 0.16 : r * 0.22;
    circle(ctx, cx - r * 0.16, cy - r * 0.16, rad);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    circle(ctx, cx + r * 0.22, cy - r * 0.22, rad * 0.9);
    ctx.fill();
    if (pose === 'dots' && !hurt) {
      circle(ctx, cx + r * 0.52, cy - r * 0.52, r * 0.11);
      ctx.fillStyle = '#4aa3ff';
      ctx.fill();
    }
    return;
  }
  if (blink) {
    grokEye(ctx, cx - r * 0.02, cy - r * 0.16, r * 0.4, r * 0.12, -0.3);
    grokEye(ctx, cx + r * 0.32, cy - r * 0.28, r * 0.28, r * 0.1, 0.4);
    return;
  }
  if (pose === 'dash') {
    grokEye(ctx, cx - r * 0.06, cy - r * 0.1, r * 0.55, r * 0.2, -0.12);
    grokEye(ctx, cx + r * 0.34, cy - r * 0.22, r * 0.38, r * 0.16, 0.5);
    circle(ctx, cx + r * 0.5, cy - r * 0.5, r * 0.1);
    ctx.fillStyle = '#4aa3ff';
    ctx.fill();
    return;
  }
  if (pose === 'wide') {
    grokEye(ctx, cx - r * 0.12, cy - r * 0.08, r * 0.28, r * 0.55, -0.08);
    grokEye(ctx, cx + r * 0.26, cy - r * 0.12, r * 0.24, r * 0.48, 0.16);
    return;
  }
  if (pose === 'alert') {
    grokEye(ctx, cx - r * 0.06, cy - r * 0.12, r * 0.22, r * 0.52, -0.18);
    grokEye(ctx, cx + r * 0.28, cy - r * 0.22, r * 0.18, r * 0.44, 0.32);
    return;
  }
  grokEye(ctx, cx - r * 0.04, cy - r * 0.12, r * 0.24, r * 0.5, -0.25);
  grokEye(ctx, cx + r * 0.28, cy - r * 0.24, r * 0.18, r * 0.42, 0.38);
}

function faceDots(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  blink: boolean,
  fill: string
): void {
  ctx.fillStyle = fill;
  if (blink) {
    ctx.fillRect(cx - r * 0.42, cy - r * 0.05, r * 0.28, r * 0.08);
    ctx.fillRect(cx + r * 0.12, cy - r * 0.05, r * 0.28, r * 0.08);
    return;
  }
  circle(ctx, cx - r * 0.28, cy - r * 0.08, r * 0.16);
  ctx.fill();
  circle(ctx, cx + r * 0.28, cy - r * 0.08, r * 0.16);
  ctx.fill();
}

/** Yard targets: readable chat and robot forms. Not another company's logo. */
function paintPig(ctx: CanvasRenderingContext2D, s: number, expression: Expression, king: boolean, helmet: 'none' | 'hat' | 'helmet'): void {
  const cx = s * 0.5;
  const cy = s * 0.52;
  const r = s * 0.34;
  const hurt = expression === 'hurt';
  const blink = expression === 'blink';
  if (king) {
    circle(ctx, cx, cy, r);
    ctx.fillStyle = hurt ? '#3a3a3a' : '#161616';
    ctx.fill();
    faceDots(ctx, cx, cy + r * 0.05, r, blink, '#f4efe4');
    ctx.strokeStyle = '#e7c27a';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.85);
    ctx.lineTo(cx, cy - r * 1.2);
    ctx.stroke();
    circle(ctx, cx, cy - r * 1.28, r * 0.12);
    ctx.fillStyle = '#e7c27a';
    ctx.fill();
  } else if (helmet === 'helmet') {
    circle(ctx, cx, cy, r);
    ctx.fillStyle = hurt ? '#4a5c86' : '#243352';
    ctx.fill();
    ctx.fillStyle = blink ? '#9bb0dd' : '#d7e4ff';
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.55, cy - r * 0.22, r * 1.1, blink ? r * 0.12 : r * 0.38, r * 0.12);
    ctx.fill();
    ctx.strokeStyle = '#d7e4ff';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy - r * 1.28);
    ctx.stroke();
  } else if (helmet === 'hat') {
    ctx.fillStyle = hurt ? '#b9b3aa' : '#e7e2da';
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.85, cy - r * 0.7, r * 1.7, r * 1.45, r * 0.2);
    ctx.fill();
    faceDots(ctx, cx, cy + r * 0.05, r * 0.85, blink, '#243352');
    ctx.fillStyle = '#243352';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - r * 0.42 + i * r * 0.34, cy - r * 0.95, r * 0.12, r * 0.28);
    }
  } else {
    ctx.fillStyle = hurt ? '#e7cbb8' : '#fffdf8';
    ctx.beginPath();
    ctx.roundRect(cx - r * 1.05, cy - r * 0.85, r * 2.1, r * 1.55, r * 0.42);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.15, cy + r * 0.55);
    ctx.lineTo(cx - r * 0.55, cy + r * 1.05);
    ctx.lineTo(cx + r * 0.15, cy + r * 0.62);
    ctx.fill();
    faceDots(ctx, cx, cy - r * 0.05, r, blink, '#161616');
  }
  if (hurt) {
    ctx.strokeStyle = '#e23b2b';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.35);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.3);
    ctx.stroke();
  }
}

function paintDash(ctx: CanvasRenderingContext2D, s: number, expression: Expression): void {
  paintGrokBot(ctx, s, expression, 'dash');
}

function paintSplit(ctx: CanvasRenderingContext2D, s: number, expression: Expression): void {
  paintGrokBot(ctx, s, expression, 'dots');
}

function paintHeavy(ctx: CanvasRenderingContext2D, s: number, expression: Expression): void {
  paintGrokBot(ctx, s, expression, 'wide', 'blob');
}

function paintBlast(ctx: CanvasRenderingContext2D, s: number, expression: Expression): void {
  paintGrokBot(ctx, s, expression, 'alert', 'bang');
}

const faceCache = new Map<string, FaceSet>();

export function faceSet(key: string, draw: (ctx: CanvasRenderingContext2D, s: number, expression: Expression) => void): FaceSet {
  const hit = faceCache.get(key);
  if (hit) return hit;
  const s = 512;
  const set: FaceSet = {
    idle: paintTex(s, s, (ctx) => paintFace(ctx, s, 'idle', draw)),
    blink: paintTex(s, s, (ctx) => paintFace(ctx, s, 'blink', draw)),
    hurt: paintTex(s, s, (ctx) => paintFace(ctx, s, 'hurt', draw)),
  };
  faceCache.set(key, set);
  return set;
}

export function botFaces(kind: string): FaceSet {
  if (kind === 'dash') return faceSet('dash', paintDash);
  if (kind === 'split') return faceSet('split', paintSplit);
  if (kind === 'heavy') return faceSet('heavy', paintHeavy);
  if (kind === 'blast') return faceSet('blast', paintBlast);
  return faceSet('grok', (ctx, s, expression) => paintGrokBot(ctx, s, expression, 'look'));
}

function paintRidge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  skyline: (u: number) => number,
  fill: string,
  ridge: string,
  tree: string,
  trees: number
): void {
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, skyline(x / w) * h);
    ctx.lineTo(w, h);
    ctx.closePath();
  };
  ctx.clearRect(0, 0, w, h);
  trace();
  const g = ctx.createLinearGradient(0, h * 0.2, 0, h);
  g.addColorStop(0, ridge);
  g.addColorStop(1, fill);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  trace();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.4) / 7;
    ctx.beginPath();
    ctx.ellipse(u * w, skyline(u) * h + h * 0.22, w * 0.07, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) {
    const y = skyline(x / w) * h + 12;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < trees; i++) {
    const u = 0.12 + hash(i + 21) * 0.76;
    const x = u * w;
    const ground = skyline(u) * h;
    const th = h * (0.04 + hash(i + 5) * 0.035);
    ctx.fillStyle = tree;
    circle(ctx, x, ground - th * 0.55, th * 0.55);
    ctx.fill();
    ctx.fillRect(x - th * 0.08, ground - th * 0.15, th * 0.16, th * 0.35);
  }
  const fade = ctx.createLinearGradient(0, 0, w, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.06, 'rgba(0,0,0,0)');
  fade.addColorStop(0.94, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

export function pigFaces(king: boolean, helmet: 'none' | 'hat' | 'helmet'): FaceSet {
  const key = `pig:${king ? 'king' : helmet}`;
  return faceSet(key, (ctx, s, expression) => paintPig(ctx, s, expression, king, helmet));
}

export const ILL = {
  plank: paintTex(256, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f0c07a');
    g.addColorStop(0.15, '#e0a45a');
    g.addColorStop(0.8, '#c9843c');
    g.addColorStop(1, '#a86a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 7) {
      ctx.strokeStyle = `rgba(90, 42, 12, ${0.15 + hash(y) * 0.25})`;
      ctx.lineWidth = 1 + (y % 3);
      ctx.beginPath();
      ctx.moveTo(6, y);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 2);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#5a3014';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#6a431c';
    for (const [x, y] of [
      [22, 22],
      [w - 22, 22],
      [22, h - 22],
      [w - 22, h - 22],
    ] as const) {
      circle(ctx, x, y, 7);
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      circle(ctx, x, y, 2.5);
      ctx.fill();
      ctx.fillStyle = '#6a431c';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(14, 12, w - 28, 8);
  }),
  stone: paintTex(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d5dbe3');
    g.addColorStop(0.5, '#9aa3ae');
    g.addColorStop(1, '#6e7680');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3e4650';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(40, 44, 50, ${0.25 + hash(i) * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hash(i + 2) * w, hash(i + 4) * h);
      ctx.lineTo(hash(i + 6) * w, hash(i + 8) * h);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(16, 16, w * 0.45, 10);
  }),
  glass: paintTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(186, 236, 255, 0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f4fdff';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(28, 20);
    ctx.lineTo(w * 0.42, h - 24);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80, 160, 190, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.15);
    ctx.lineTo(w * 0.75, h * 0.85);
    ctx.moveTo(w * 0.7, h * 0.2);
    ctx.lineTo(w * 0.3, h * 0.7);
    ctx.stroke();
  }),
  tnt: paintTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d8452b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(0, h * 0.38, w, h * 0.24);
    ctx.fillStyle = '#1a100c';
    for (let x = -20; x < w + 40; x += 28) {
      ctx.save();
      ctx.translate(x, h * 0.5);
      ctx.rotate(-0.7);
      ctx.fillRect(0, -h * 0.16, 12, h * 0.32);
      ctx.restore();
    }
    ctx.fillStyle = '#ffd84a';
    ctx.font = '800 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', w / 2, h * 0.22);
    ctx.strokeStyle = '#3a2414';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.strokeStyle = '#c9a36a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.72, 18);
    ctx.lineTo(w * 0.84, 4);
    ctx.stroke();
  }),
  hillFar: paintTex(1280, 512, (ctx, w, h) => {
    paintRidge(
      ctx, w, h,
      (u) => 0.58 + Math.sin(u * 6.2) * 0.1 + Math.sin(u * 13 + 0.7) * 0.04,
      '#cfcfcf',
      '#f7f7f7',
      '#9a9a9a',
      0
    );
  }),
  hillMid: paintTex(1280, 512, (ctx, w, h) => {
    paintRidge(
      ctx, w, h,
      (u) => 0.52 + Math.sin(u * 8.5 + 1.2) * 0.12 + Math.sin(u * 17) * 0.045,
      '#a3a3a3',
      '#ececec',
      '#6e6e6e',
      0
    );
  }),
  hillNear: paintTex(1280, 512, (ctx, w, h) => {
    paintRidge(
      ctx, w, h,
      (u) => 0.6 + Math.sin(u * 5.1 + 0.4) * 0.09 + Math.sin(u * 11.5 + 2) * 0.05,
      '#8a8a8a',
      '#d8d8d8',
      '#555555',
      0
    );
  }),
  tower: paintTex(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#2a3350';
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h);
    ctx.lineTo(w * 0.34, h * 0.22);
    ctx.lineTo(w * 0.66, h * 0.22);
    ctx.lineTo(w * 0.72, h);
    ctx.fill();
    ctx.fillStyle = '#3d4a6e';
    ctx.fillRect(w * 0.22, h * 0.16, w * 0.56, h * 0.08);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.02);
    ctx.lineTo(w * 0.7, h * 0.18);
    ctx.lineTo(w * 0.3, h * 0.18);
    ctx.fill();
  }),
  crate: paintTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#c9843c';
    ctx.fillRect(w * 0.08, h * 0.18, w * 0.84, h * 0.7);
    ctx.strokeStyle = '#5a3014';
    ctx.lineWidth = 10;
    ctx.strokeRect(w * 0.08, h * 0.18, w * 0.84, h * 0.7);
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.18);
    ctx.lineTo(w * 0.92, h * 0.88);
    ctx.moveTo(w * 0.92, h * 0.18);
    ctx.lineTo(w * 0.08, h * 0.88);
    ctx.stroke();
  }),
  tree: paintTex(256, 384, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#6a4424';
    ctx.fillRect(w * 0.42, h * 0.55, w * 0.16, h * 0.4);
    ctx.fillStyle = '#2f7a28';
    circle(ctx, w * 0.5, h * 0.42, w * 0.34);
    ctx.fill();
    ctx.fillStyle = '#4ea03a';
    circle(ctx, w * 0.34, h * 0.5, w * 0.22);
    ctx.fill();
    circle(ctx, w * 0.66, h * 0.48, w * 0.2);
    ctx.fill();
  }),
  cloud: paintTex(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    const puffs = [
      [0.28, 0.58, 0.16],
      [0.42, 0.42, 0.2],
      [0.58, 0.48, 0.18],
      [0.7, 0.58, 0.14],
    ] as const;
    for (const [x, y, r] of puffs) {
      circle(ctx, x * w, y * h, r * w);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(180, 210, 230, 0.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.68, w * 0.28, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }),
  bush: paintTex(256, 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#3e8f28';
    circle(ctx, s * 0.5, s * 0.62, s * 0.28);
    ctx.fill();
    ctx.fillStyle = '#67c043';
    circle(ctx, s * 0.34, s * 0.58, s * 0.2);
    ctx.fill();
    circle(ctx, s * 0.66, s * 0.56, s * 0.18);
    ctx.fill();
    ctx.fillStyle = '#2f6e1e';
    ctx.fillRect(s * 0.46, s * 0.7, s * 0.08, s * 0.18);
  }),
  fringe: paintTex(
    512,
    128,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#4f9e2a';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      for (let i = 0; i < 70; i++) {
        const x = (i + 0.5) * (w / 70);
        const bh = h * (0.35 + hash(i) * 0.55);
        ctx.fillStyle = hash(i + 3) > 0.5 ? '#67c043' : '#3d8a22';
        ctx.beginPath();
        ctx.moveTo(x - 4, h);
        ctx.quadraticCurveTo(x + (hash(i + 1) - 0.5) * 10, h - bh, x + 3, h);
        ctx.fill();
      }
    },
    true
  ),
  sling: paintTex(512, 512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const post = (x: number) => {
      ctx.fillStyle = '#a86a32';
      ctx.beginPath();
      ctx.moveTo(x - 28, s * 0.92);
      ctx.lineTo(x - 18, s * 0.18);
      ctx.lineTo(x + 18, s * 0.18);
      ctx.lineTo(x + 28, s * 0.92);
      ctx.closePath();
      ctx.fill();
      outlineStroke(ctx, 10);
      ctx.strokeStyle = 'rgba(90,40,12,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 6, s * 0.28);
      ctx.lineTo(x - 10, s * 0.84);
      ctx.stroke();
    };
    post(s * 0.22);
    post(s * 0.78);
    ctx.fillStyle = '#8a5528';
    ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.22);
    ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.78, s * 0.22);
    ctx.lineTo(s * 0.74, s * 0.32);
    ctx.quadraticCurveTo(s * 0.5, s * 0.16, s * 0.26, s * 0.32);
    ctx.closePath();
    ctx.fill();
    outlineStroke(ctx, 10);
  }),
  pouch: paintTex(128, 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#6b3a1c';
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.42, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    outlineStroke(ctx, 8);
    ctx.strokeStyle = 'rgba(255,220,170,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.46, s * 0.22, s * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }),
  sky: paintTex(16, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#e4e4e4');
    g.addColorStop(1, '#c8c8c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }),
};
