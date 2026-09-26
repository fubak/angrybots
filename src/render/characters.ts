import * as THREE from 'three';
import type { BotKind } from '../levels/schema';
import { ILL, pigFaces, pigPupilTexture, type FaceSet } from './illustrations';
import {
  botStickerArt,
  lookAroundYaw,
  stickerBodyTexture,
  stickerEyeTexture,
  yawEyeTransforms,
} from './botArt';

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
 * Official sticker art as layered planes: the composite body (backing +
 * colored silhouette + baked shines) plus one plane per eye so the eyes can
 * look, blink, squint, go dizzy and slide/foreshorten with head yaw. Outer
 * group carries physics-driven transforms (position, rotation, impact
 * squash); 'bot-inner' carries animation transforms (breathing, aim stretch,
 * ability pop, yaw lean).
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

  // One plane per eye so yaw can foreshorten/slide each eye independently.
  const eyeGroup = new THREE.Group();
  eyeGroup.name = 'eyes';
  const ecx0 = art.eyeBox[0] + art.eyeBox[2] / 2;
  const ecy0 = art.eyeBox[1] + art.eyeBox[3] / 2;
  const eyeMeshes: THREE.Mesh[] = [];
  art.eyes.forEach((e, i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(e.box[2] * 1.16 * k, e.box[3] * 1.16 * k),
      new THREE.MeshBasicMaterial({
        map: stickerEyeTexture(art.id, i),
        transparent: true,
        depthWrite: false,
      })
    );
    m.name = `eye-${i}`;
    m.renderOrder = 13;
    m.position.set(
      (e.box[0] + e.box[2] / 2 - art.vbW / 2) * k,
      (art.vbH / 2 - (e.box[1] + e.box[3] / 2)) * k,
      0.03
    );
    m.userData.bx = m.position.x;
    m.userData.by = m.position.y;
    eyeGroup.add(m);
    eyeMeshes.push(m);
  });
  inner.add(eyeGroup);

  g.userData.art = art;
  g.userData.eyeMeshes = eyeMeshes;
  g.userData.eyeK = k; // viewBox → world scale
  g.userData.eyeCX = (ecx0 - art.vbW / 2) * k;
  g.userData.eyeCY = (art.vbH / 2 - ecy0) * k;
  g.userData.lookRange = r * 0.12;
  g.userData.leanRange = r * 0.08;
  return g;
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type BotAnim = {
  /** Queue/idle: breathing squash + look-around yaw cycle. */
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
  /** Explicit head yaw −1..1 (±90°); overrides the idle look-around. */
  yaw?: number;
  /** Vertical glance −1..1, in lookRange units. */
  pitch?: number;
  /** Turned away (level lost): yaw eases to ±1.1 and holds — back of head. */
  turnAway?: boolean;
  reducedMotion?: boolean;
};

const BLINK_SECONDS = 0.24;
const HURT_SECONDS = 0.5;
const POP_SECONDS = 0.18;
const TURN_SECONDS = 0.7;

/** Per-frame bot expression driver. All timing derives from `time` + node id. */
export function tickBot(node: THREE.Object3D, time: number, a: BotAnim = {}): void {
  const inner = node.getObjectByName('bot-inner');
  const eyes = node.userData.eyeMeshes as THREE.Mesh[] | undefined;
  if (!inner) return;
  const ud = node.userData;
  const phase = hash01(node.id);
  const hurt = a.hurtT != null && a.hurtT < HURT_SECONDS;

  // Head yaw: explicit override > turn-away > idle look-around.
  let yaw = a.yaw ?? 0;
  if (a.turnAway) {
    if (ud.turnStart === undefined) {
      ud.turnStart = time;
      ud.turnDir = hash01(node.id * 7.7) < 0.5 ? -1 : 1;
    }
    const k = Math.min(1, (time - (ud.turnStart as number)) / TURN_SECONDS);
    yaw = (ud.turnDir as number) * 1.08 * (1 - Math.pow(1 - k, 3));
  } else {
    ud.turnStart = undefined;
    if (a.queue && !hurt && !a.dizzy && !a.happy && !a.reducedMotion) {
      yaw = lookAroundYaw(time, phase);
    }
  }
  let pitch = a.pitch ?? 0;
  if (a.queue && !a.reducedMotion) {
    pitch += Math.sin(time * 0.83 + phase * 5) * 0.3;
  }

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
  // Lean + squash tied to yaw velocity (the sticker tips toward the turn).
  const prevYaw = ud.prevYaw as number | undefined;
  const prevYawT = ud.prevYawT as number | undefined;
  const yawVel =
    prevYaw !== undefined && prevYawT !== undefined && time > prevYawT
      ? (yaw - prevYaw) / (time - prevYawT)
      : 0;
  ud.prevYaw = yaw;
  ud.prevYawT = time;
  if (!a.reducedMotion) {
    // Silhouette follows the look: ~10° lean at the look-around extreme,
    // capped so turn-away stays at a ~12° tilt. Plus a gentle idle bob.
    const leanYaw = Math.max(-0.42, Math.min(0.42, yaw));
    inner.rotation.z = -leanYaw * 0.5;
    inner.position.x = yaw * ((ud.leanRange as number | undefined) ?? 0.04);
    inner.position.y = Math.sin(time * 1.31 + phase * 7) * ((ud.leanRange as number | undefined) ?? 0.04) * 0.35;
    const sq = Math.min(0.03, Math.abs(yawVel) * 0.02);
    sy *= 1 - sq;
    sx *= 1 + sq * 0.6;
  } else {
    inner.rotation.z = 0;
    inner.position.x = 0;
    inner.position.y = 0;
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
  let ey = pitch * range * 0.4;
  let lidX = 1;
  if (a.dizzy && !hurt) {
    ex = Math.cos(time * 4 + node.id) * range * 0.55;
    ey += Math.sin(time * 4 + node.id) * range * 0.55;
  }
  if (a.lead && !a.dizzy) ey += range * 0.75;
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
  } else if (a.aimTension !== undefined && a.aimTension > 0) {
    lid *= 1 - 0.35 * Math.max(0, Math.min(1, (a.aimTension - 0.55) / 0.45));
  }

  const poses = yaw === 0 ? null : yawEyeTransforms(ud.art, yaw);
  const k2w = (ud.eyeK as number | undefined) ?? 1;
  for (let i = 0; i < eyes.length; i++) {
    const m = eyes[i]!;
    const pose = poses?.[i];
    const sxYaw = pose ? Math.max(0.02, pose.sx) : 1;
    m.visible = !pose || pose.visible;
    m.position.set(
      (m.userData.bx as number) + ex + (pose ? pose.dx * k2w : 0),
      (m.userData.by as number) + ey,
      0.03
    );
    m.scale.set(Math.max(0.02, lidX * sxYaw), Math.max(0.08, lid), 1);
    // Slight eye tilt following the head turn (dropped under reduced motion).
    m.rotation.z = a.reducedMotion ? 0 : -yaw * 0.22;
  }
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
