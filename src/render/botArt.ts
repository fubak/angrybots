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

/** Eye-layer canvas crop: the eye bbox padded so look offsets stay inside it. */
const EYE_PAD = 0.1; // fraction of eyeBox size

export function eyePadBox(art: StickerArt): [number, number, number, number] {
  const [x, y, w, h] = art.eyeBox;
  const px = w * EYE_PAD;
  const py = h * EYE_PAD;
  return [x - px, y - py, w + 2 * px, h + 2 * py];
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
// Cached textures — one body + one eyes texture per sticker, shared by all bots

const bodyTexCache = new Map<string, THREE.Texture>();
const eyesTexCache = new Map<string, THREE.Texture>();
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

export function stickerEyesTexture(id: string): THREE.Texture {
  const hit = eyesTexCache.get(id);
  if (hit) return hit;
  const art = stickerArt(id);
  const pb = eyePadBox(art);
  const k = TEX_SIZE / art.vbW;
  const ctx = makeCanvas(pb[2] * k, pb[3] * k);
  if (!ctx) {
    const t = blankTexture();
    eyesTexCache.set(id, t);
    return t;
  }
  ctx.scale(k, k);
  ctx.translate(-pb[0], -pb[1]);
  paintEyes(ctx, art);
  const tex = canvasTexture(ctx.canvas);
  eyesTexCache.set(id, tex);
  return tex;
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

export function stickerEyesImage(id: string): string {
  const art = stickerArt(id);
  const pb = eyePadBox(art);
  const k = TEX_SIZE / art.vbW;
  const ctx = makeCanvas(pb[2] * k, pb[3] * k);
  if (!ctx) return '';
  ctx.scale(k, k);
  ctx.translate(-pb[0], -pb[1]);
  paintEyes(ctx, art);
  return ctx.canvas.toDataURL();
}

export function botStickerImage(kind: BotKind): string {
  return stickerImage(BOT_STICKER[kind]);
}

export function botStickerCanvas(kind: BotKind): HTMLCanvasElement | null {
  return stickerCompositeCanvas(BOT_STICKER[kind]);
}
