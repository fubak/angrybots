import * as THREE from 'three';
import type { BotKind } from '../levels/schema';
import { ILL, botFaces, pigFaces, pigPupilTexture, type FaceSet } from './illustrations';

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

/** Plane is this many radii on a side. The painted disc fills 0.8 of it, so the visible diameter equals 2r. */
const BOT_SIZE: Record<BotKind, [number, number]> = {
  grok: [2.5, 2.5],
  dash: [2.5, 2.5],
  split: [2.5, 2.5],
  heavy: [2.5, 2.5],
  blast: [2.5, 2.5],
};

export function makeBotCharacter(kind: BotKind, r: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `bot:${kind}`;
  const [sx, sy] = BOT_SIZE[kind];
  const face = facePlane(r * sx, r * sy, botFaces(kind));
  g.add(face);
  return g;
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
