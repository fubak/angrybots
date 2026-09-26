import * as THREE from 'three';
import type { BotKind } from '../levels/schema';
import { ILL, pigFaces, pigPupilTexture, type FaceSet } from './illustrations';
import { botStickerArt, eyePadBox, stickerBodyTexture, stickerEyesTexture } from './botArt';

export type PigLook = {
  helmet: 'none' | 'hat' | 'helmet';
  king: boolean;
};

export type FaceMood = {
  hurt?: boolean;
  smug?: boolean;
};

function facePlane(w: number, h: number, faces: FaceSet): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: faces.idle,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.name = 'face';
  mesh.userData.idle = faces.idle;
  mesh.userData.blink = faces.blink;
  mesh.userData.hurt = faces.hurt;
  mesh.userData.smug = faces.smug;
  mesh.renderOrder = 12;
  return mesh;
}

export function tickFace(root: THREE.Object3D, time: number, mood: FaceMood = {}): void {
  const face = root.getObjectByName('face') as THREE.Mesh | undefined;
  if (!face) return;
  const mat = face.material as THREE.MeshBasicMaterial;
  const phase = Math.sin(time * 1.3 + root.id * 0.37);
  const hurt = mood.hurt === true;
  const smug = !hurt && mood.smug === true;
  const blink = !hurt && !smug && phase > 0.992;
  const next = (
    hurt ? face.userData.hurt : smug ? face.userData.smug : blink ? face.userData.blink : face.userData.idle
  ) as THREE.Texture | undefined;
  if (next && mat.map !== next) {
    mat.map = next;
    mat.needsUpdate = true;
  }
  const pupils = root.getObjectByName('pupils') as THREE.Mesh | undefined;
  if (pupils) pupils.visible = !hurt && !blink && !smug;
}

/** Non-round stickers size by height instead of collider diameter. */
const TALL_STICKERS = new Set(['08', '11']); // dash triangle, split drop

/**
 * Official sticker art as two planes: the composite body (backing + colored
 * silhouette + baked shines) and a separate white-eyes layer so the eyes can
 * look, blink, squint and go dizzy. Outer group carries physics-driven
 * transforms (position, rotation, impact squash); 'bot-inner' carries
 * animation transforms (breathing, aim stretch, ability pop).
 */
export function makeBotCharacter(kind: BotKind, r: number): THREE.Group {
  const art = botStickerArt(kind);
  const g = new THREE.Group();
  g.name = `bot:${kind}`;
  const inner = new THREE.Group();
  inner.name = 'bot-inner';
  g.add(inner);

  const tall = TALL_STICKERS.has(art.id);
  const w = tall ? 2.1 * r * (art.vbW / art.vbH) : 2 * r;
  const h = tall ? 2.1 * r : 2 * r * (art.vbH / art.vbW);
  const k = w / art.vbW; // world units per viewBox unit

  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: stickerBodyTexture(art.id),
      transparent: true,
      depthWrite: false,
    })
  );
  body.name = 'bot-body';
  body.renderOrder = 12;
  inner.add(body);

  const pb = eyePadBox(art);
  const eyes = new THREE.Mesh(
    new THREE.PlaneGeometry(pb[2] * k, pb[3] * k),
    new THREE.MeshBasicMaterial({
      map: stickerEyesTexture(art.id),
      transparent: true,
      depthWrite: false,
    })
  );
  eyes.name = 'eyes';
  eyes.renderOrder = 13;
  const ex = (pb[0] + pb[2] / 2 - art.vbW / 2) * k;
  const ey = (art.vbH / 2 - (pb[1] + pb[3] / 2)) * k;
  eyes.position.set(ex, ey, 0.03);
  inner.add(eyes);

  g.userData.eyeCX = ex;
  g.userData.eyeCY = ey;
  g.userData.lookRange = r * 0.12;
  return g;
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type BotAnim = {
  /** Queue/idle: breathing squash + occasional glance toward the structure. */
  queue?: boolean;
  /** Normalized eye-look offset in the bot group's local space. */
  lookX?: number;
  lookY?: number;
  /** Aim tension 0..1 — eyes narrow at high pull. */
  aimTension?: number;
  /** Flying: eyes lead forward (local +y once the group faces velocity). */
  lead?: boolean;
  /** Seconds since first impact — squeezed eyes + shake for ~0.5 s. */
  hurtT?: number | null;
  /** Settled/rolling: eyes do a small dizzy circle. */
  dizzy?: boolean;
  /** Bonus hop: happy squint. */
  happy?: boolean;
  /** Seconds since ability fired — pop pulse + wide eyes. */
  popT?: number | null;
  reducedMotion?: boolean;
};

const BLINK_SECONDS = 0.24;
const HURT_SECONDS = 0.5;
const POP_SECONDS = 0.18;

/** Per-frame bot expression driver. All timing derives from `time` + node id. */
export function tickBot(node: THREE.Object3D, time: number, a: BotAnim = {}): void {
  const inner = node.getObjectByName('bot-inner');
  const eyes = node.getObjectByName('eyes') as THREE.Mesh | undefined;
  if (!inner) return;
  const ud = node.userData;
  const phase = hash01(node.id);

  let sx = 1;
  let sy = 1;
  if (a.queue && !a.reducedMotion) {
    const period = 1.2 + 0.6 * phase;
    const s = Math.sin((time / period) * Math.PI * 2 + phase * 9);
    sx = 1 + 0.03 * s;
    sy = 1 - 0.03 * s;
  }
  if (a.popT != null && a.popT < POP_SECONDS && !a.reducedMotion) {
    const p = 1 + 0.25 * (1 - a.popT / POP_SECONDS);
    sx *= p;
    sy *= p;
  }
  inner.scale.set(sx, sy, 1);

  if (!eyes) return;
  const range = (ud.lookRange as number | undefined) ?? 0.05;

  // deterministic blink schedule: every 2.5–5 s, ~120 ms down and back up
  if (ud.nextBlink === undefined) ud.nextBlink = time + 2.5 + phase * 2.5;
  if (time >= (ud.nextBlink as number)) {
    ud.blinkStart = time;
    const n = ((ud.blinkN as number | undefined) ?? 0) + 1;
    ud.blinkN = n;
    ud.nextBlink = time + 2.5 + hash01(node.id * 31 + n) * 2.5;
  }
  let lid = 1;
  const bs = ud.blinkStart as number | undefined;
  if (bs !== undefined) {
    const t = (time - bs) / BLINK_SECONDS;
    if (t < 1) lid = 1 - 0.9 * Math.sin(t * Math.PI);
  }

  let ex = 0;
  let ey = 0;
  let lidX = 1;
  const hurt = a.hurtT != null && a.hurtT < HURT_SECONDS;
  if (a.dizzy && !hurt) {
    ex = Math.cos(time * 4 + node.id) * range * 0.55;
    ey = Math.sin(time * 4 + node.id) * range * 0.55;
  }
  if (a.lead && !a.dizzy) ey += range * 0.75;
  if (a.queue && !a.dizzy && !hurt) {
    // occasional glance toward the structure (+x local = world for queued bots)
    const cyc = (time * 0.28 + phase * 3.1) % 1;
    if (cyc < 0.32) {
      ex += range * 0.8;
      ey += range * 0.15;
    }
  }
  ex += (a.lookX ?? 0) * range;
  ey += (a.lookY ?? 0) * range;

  if (hurt) {
    lid = Math.min(lid, 0.16);
    ex += Math.sin(time * 55) * range * 0.3;
  } else if (a.popT != null && a.popT < POP_SECONDS) {
    const k = 1 - a.popT / POP_SECONDS;
    lid = Math.min(lid + 0.3 * k, 1.3);
    lidX = 1 + 0.12 * k;
  } else if (a.happy) {
    lid = Math.min(lid, 0.55);
  } else if (a.aimTension !== undefined) {
    lid *= 1 - 0.35 * Math.max(0, Math.min(1, (a.aimTension - 0.55) / 0.45));
  }

  eyes.position.set(
    (ud.eyeCX as number) + ex,
    (ud.eyeCY as number) + ey,
    0.03
  );
  eyes.scale.set(lidX, Math.max(0.08, lid), 1);
}

export function makePigCharacter(r: number, look: PigLook): THREE.Group {
  const g = new THREE.Group();
  g.name = look.king ? 'pig:king' : `pig:${look.helmet}`;
  const face = facePlane(r * 2.6, r * 2.6, pigFaces(look.king, look.helmet));
  face.userData.role = 'pig-skin';
  g.add(face);
  const pupils = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 1.4, r * 0.85),
    new THREE.MeshBasicMaterial({
      map: pigPupilTexture(),
      transparent: true,
      depthWrite: false,
    })
  );
  pupils.name = 'pupils';
  pupils.renderOrder = 13;
  pupils.position.set(0, -r * 0.08, 0.03);
  g.add(pupils);
  return g;
}

export function decorateBlock(mesh: THREE.Mesh): void {
  mesh.userData.role = 'block-face';
}

export function blockMaterial(material: string): THREE.Material {
  if (material === 'wood') {
    return new THREE.MeshBasicMaterial({ map: ILL.plank, color: '#ffffff' });
  }
  if (material === 'stone') {
    return new THREE.MeshBasicMaterial({ map: ILL.stone, color: '#ffffff' });
  }
  if (material === 'tnt') {
    return new THREE.MeshBasicMaterial({ map: ILL.tnt, color: '#ffffff' });
  }
  return new THREE.MeshBasicMaterial({
    map: ILL.glass,
    color: '#ffffff',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
}
