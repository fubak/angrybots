import * as THREE from 'three';
import type { BotKind } from '../levels/schema';
import { STICKER_BY_ID, type StickerArt } from './botArt.generated';

// Official GrokBot sticker set (user-supplied). Gameplay kinds map to these
// stickers; the other seven are menu/achievement art only.
export const BOT_STICKER: Record<BotKind, string> = {
  grok: '01',
  dash: '08',
  split: '11',
  heavy: '06',
  blast: '05',
};

/** Non-playable stickers — title lineup, achievement badges, menus. */
export const MENU_STICKERS = ['02', '03', '04', '07', '09', '10', '12'] as const;

export function stickerArt(id: string): StickerArt {
  const art = STICKER_BY_ID[id];
  if (!art) throw new Error(`unknown sticker ${id}`);
  return art;
}

export function botStickerArt(kind: BotKind): StickerArt {
  return stickerArt(BOT_STICKER[kind]);
}

// ---------------------------------------------------------------------------
// Pure canvas painting (also used by tools/bot-composite.html in the browser)

export function paintBacking(ctx: CanvasRenderingContext2D, art: StickerArt): void {
  ctx.fillStyle = '#ffffff';
  if (art.backing.circle) {
    const [cx, cy, r] = art.backing.circle;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fill(new Path2D(art.backing.d!));
  }
}

export function paintBodyLayer(ctx: CanvasRenderingContext2D, art: StickerArt): void {
  paintBacking(ctx, art);
  ctx.fillStyle = art.bodyColor;
  ctx.fill(new Path2D(art.body));
  ctx.fillStyle = '#ffffff';
  for (const ex of art.extras) ctx.fill(new Path2D(ex.d));
}

/** White eye shapes only. eyeSY < 1 squeezes lids (blink/hurt/happy). */
export function paintEyes(
  ctx: CanvasRenderingContext2D,
  art: StickerArt,
  eyeSY = 1,
  eyeSX = 1
): void {
  ctx.fillStyle = '#ffffff';
  for (const e of art.eyes) {
    const [x, y, w, h] = e.box;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(eyeSX, eyeSY);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    ctx.fill(new Path2D(e.d));
    ctx.restore();
  }
}

/** Full sticker composite in viewBox space — caller scales the ctx first. */
export function paintSticker(
  ctx: CanvasRenderingContext2D,
  art: StickerArt,
  eyeSY = 1,
  eyeSX = 1
): void {
  paintBodyLayer(ctx, art);
  paintEyes(ctx, art, eyeSY, eyeSX);
}

function makeCanvas(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c.getContext('2d');
}

const TEX_SIZE = 512;

function canvasTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function blankTexture(): THREE.Texture {
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Cached textures — one body texture per sticker + one texture per eye,
// shared by all bots (no per-bot allocations).

const bodyTexCache = new Map<string, THREE.Texture>();
const compositeCache = new Map<string, HTMLCanvasElement>();

export function stickerBodyTexture(id: string): THREE.Texture {
  const hit = bodyTexCache.get(id);
  if (hit) return hit;
  const art = stickerArt(id);
  const ctx = makeCanvas(TEX_SIZE, (TEX_SIZE * art.vbH) / art.vbW);
  if (!ctx) {
    const t = blankTexture();
    bodyTexCache.set(id, t);
    return t;
  }
  const k = TEX_SIZE / art.vbW;
  ctx.scale(k, k);
  paintBodyLayer(ctx, art);
  const tex = canvasTexture(ctx.canvas);
  bodyTexCache.set(id, tex);
  return tex;
}

/** Single-eye texture (cached per sticker+eye) — enables per-eye yaw foreshorten. */
const eyeTexCache = new Map<string, THREE.Texture>();

export function stickerEyeTexture(id: string, index: number): THREE.Texture {
  const key = `${id}:${index}`;
  const hit = eyeTexCache.get(key);
  if (hit) return hit;
  const art = stickerArt(id);
  const e = art.eyes[index];
  if (!e) return blankTexture();
  const k = TEX_SIZE / art.vbW;
  const pad = 0.08; // fraction of eye size, keeps scaled edges inside the canvas
  const pw = e.box[2] * (1 + pad * 2);
  const ph = e.box[3] * (1 + pad * 2);
  const ctx = makeCanvas(pw * k, ph * k);
  if (!ctx) {
    const t = blankTexture();
    eyeTexCache.set(key, t);
    return t;
  }
  ctx.scale(k, k);
  ctx.translate(-(e.box[0] - e.box[2] * pad), -(e.box[1] - e.box[3] * pad));
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(e.d));
  const tex = canvasTexture(ctx.canvas);
  eyeTexCache.set(key, tex);
  return tex;
}

export function stickerEyeImage(id: string, index: number): string {
  const art = stickerArt(id);
  const e = art.eyes[index];
  if (!e) return '';
  const k = TEX_SIZE / art.vbW;
  const pad = 0.08;
  const ctx = makeCanvas(e.box[2] * (1 + pad * 2) * k, e.box[3] * (1 + pad * 2) * k);
  if (!ctx) return '';
  ctx.scale(k, k);
  ctx.translate(-(e.box[0] - e.box[2] * pad), -(e.box[1] - e.box[3] * pad));
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(e.d));
  return ctx.canvas.toDataURL();
}

// ---------------------------------------------------------------------------
// Pseudo-3D head yaw (matches the official look-around / turn-away refs)

/** Eyes sit on a face sphere subtending ±EYE_THETA_MAX rad. */
const EYE_THETA_MAX = 0.5;
/** yaw=±1 maps to ~97° head turn. */
const YAW_TO_ANGLE = 1.7;
/** |yaw| beyond this thins eyes to nothing (they have "wrapped" out of view). */
const YAW_FADE_START = 0.72;
const YAW_FADE_END = 0.96;
/** Slide limit as a fraction of the eye-pair half-span (matches the refs' ~±0.15 body widths). */
const YAW_SLIDE_LIM = 0.55;
/** Approximate the body silhouette as an ellipse (fraction of viewBox) so the
 *  slide clamp keeps eyes inside the silhouette — they never float outside it. */
const BODY_RX = 0.44;
const BODY_RY = 0.44;
const BODY_MARGIN = 1.5; // viewBox units of rim clearance

export type EyePose = {
  /** x offset from the eye's rest center, in viewBox units. */
  dx: number;
  sx: number;
  visible: boolean;
};

/**
 * Per-eye pose for a head yaw (−1..1). Near-side eye squashes into the edge
 * first; the far eye slides inward, then also thins out — at full turn no
 * eyes show (back of head). dx is in viewBox units; scale to the render
 * space (world k or CSS %) at the call site. Slide is clamped inside an
 * ellipse approximating the body silhouette so eyes stay on the face.
 */
export function yawEyeTransforms(art: StickerArt, yaw: number): EyePose[] {
  const y = Math.max(-1.15, Math.min(1.15, yaw));
  const ew = art.eyeBox[2];
  const ecx0 = art.eyeBox[0] + ew / 2;
  const span = Math.max(4, ew / 2); // viewBox units
  const rx = span / Math.sin(EYE_THETA_MAX);
  const xLim = span * YAW_SLIDE_LIM;
  const bcx = art.vbW / 2;
  const bry = art.vbH * BODY_RY;
  const brx = art.vbW * BODY_RX;
  const edge = Math.max(
    0,
    1 - Math.max(0, Math.abs(y) - YAW_FADE_START) / (YAW_FADE_END - YAW_FADE_START)
  );
  return art.eyes.map((e) => {
    const ecx = e.box[0] + e.box[2] / 2 - ecx0;
    const theta = (ecx / span) * EYE_THETA_MAX;
    const a = theta + y * YAW_TO_ANGLE;
    const c = Math.cos(a);
    let x = Math.max(-xLim, Math.min(xLim, Math.sin(a) * rx));
    // Silhouette clamp: the eye's shrunken half-width must stay inside the
    // body ellipse at the eye's own height.
    const ny = Math.max(-1, Math.min(1, (e.box[1] + e.box[3] / 2 - art.vbH / 2) / bry));
    const halfW = brx * Math.sqrt(1 - ny * ny);
    const hw = (e.box[2] / 2) * Math.max(0.25, c);
    const lo = bcx - halfW + hw + BODY_MARGIN - ecx0;
    const hi = bcx + halfW - hw - BODY_MARGIN - ecx0;
    x = Math.max(Math.min(lo, ecx), Math.min(Math.max(hi, ecx), x));
    // Softened foreshortening: the reference keeps eyes mostly legible through
    // the turn — they thin fast only once the edge fade kicks in.
    const sx = Math.pow(Math.max(0, c), 0.7) * edge;
    return {
      dx: x - ecx,
      sx,
      visible: sx > 0.05 && Math.abs(y) < 1.05,
    };
  });
}

/** ~4.8 s eased look-around cycle — sin already dwells near the extremes.
 *  Amplitude ~0.55 keeps eyes visible the whole cycle, like the reference. */
export function lookAroundYaw(t: number, phase: number, amplitude = 0.55): number {
  return Math.sin(((t / 4.8 + phase) % 1) * Math.PI * 2) * amplitude;
}

/** Full sticker composite as a canvas — used for DOM <img> data URLs. */
export function stickerCompositeCanvas(id: string, eyeSY = 1, eyeSX = 1): HTMLCanvasElement | null {
  const key = `${id}:${eyeSY}:${eyeSX}`;
  const hit = compositeCache.get(key);
  if (hit) return hit;
  const art = stickerArt(id);
  const ctx = makeCanvas(TEX_SIZE, (TEX_SIZE * art.vbH) / art.vbW);
  if (!ctx) return null;
  ctx.scale(TEX_SIZE / art.vbW, TEX_SIZE / art.vbW);
  paintSticker(ctx, art, eyeSY, eyeSX);
  compositeCache.set(key, ctx.canvas);
  return ctx.canvas;
}

export function stickerImage(id: string): string {
  return stickerCompositeCanvas(id)?.toDataURL() ?? '';
}

export function botStickerImage(kind: BotKind): string {
  return stickerImage(BOT_STICKER[kind]);
}

export function botStickerCanvas(kind: BotKind): HTMLCanvasElement | null {
  return stickerCompositeCanvas(BOT_STICKER[kind]);
}
