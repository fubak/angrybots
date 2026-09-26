import * as THREE from 'three';
import { yawEyeTransforms } from './botArt';
import type { StickerArt } from './botArt.generated';
import { DEPTH } from '../config/render';
import { TEX } from './textures';
import { ILL } from './illustrations';

type ChapterLook = {
  sky: string;
  fog: string;
  hill: [string, string, string];
  dirt: string;
  grass: string;
  sun: string;
  shaft: string;
  skyTint: string;
  cloud: string;
};

const LOOK: Record<string, ChapterLook> = {
  training: {
    sky: '#4ea6e8',
    fog: '#9fd4f0',
    hill: ['#d7eeb4', '#6fbf45', '#3c8a2a'],
    dirt: '#ffffff',
    grass: '#ffffff',
    sun: '#fff4c2',
    shaft: '#ffe6a8',
    skyTint: '#4ea6e8',
    cloud: '#ffffff',
  },
  workshop: {
    sky: '#e7a15a',
    fog: '#e7c48a',
    hill: ['#f0d2a4', '#d7a15a', '#a87432'],
    dirt: '#e8c4a0',
    grass: '#d5e08a',
    sun: '#ffb14a',
    shaft: '#ffc36a',
    skyTint: '#e7a15a',
    cloud: '#ffe9cd',
  },
  citadel: {
    sky: '#1a2748',
    fog: '#3a4570',
    hill: ['#6e82ad', '#3e527f', '#243352'],
    dirt: '#9a8c88',
    grass: '#7f9a86',
    sun: '#dce6ff',
    shaft: '#9bb0ff',
    skyTint: '#24365f',
    cloud: '#4e5d8d',
  },
};

/** Fraction of camera motion each layer follows. 1 = fixed to screen, 0 = locked to world. */
const PARALLAX = {
  sky: 0.98,
  sun: 0.9,
  clouds: 0.8,
  hillsFar: 0.7,
  hillsMid: 0.5,
  hillsNear: 0.3,
  trees: 0.2,
  world: 0,
} as const;

const CLOUD_DRIFT = 0.15;
const CLOUD_WRAP = 36;
const CLOUD_SPAN = 72;

// Sun/moon eyes: two dark pill eyes, proportioned like the sticker-01/cloud
// eye pills relative to the disc (diameter 4.2 world units). CELESTIAL_EYES is
// a viewBox-space description of the pair so yawEyeTransforms can drive the
// group slide + mild foreshortening exactly like the bot stickers.
const SUN_EYE_X = 0.62;
const SUN_EYE_Y = 0.2;
const SUN_EYE_W = 0.4;
const SUN_EYE_H = 0.95;
const SUN_EYE_TILT = 0.14;
const CELESTIAL_EYE_BOXES = [-1, 1].map(
  (side) =>
    [
      2.1 + side * SUN_EYE_X - SUN_EYE_W / 2,
      2.1 - SUN_EYE_Y - SUN_EYE_H / 2,
      SUN_EYE_W,
      SUN_EYE_H,
    ] as readonly [number, number, number, number]
);
const CELESTIAL_EYES: StickerArt = {
  id: 'celestial',
  vbW: 4.2,
  vbH: 4.2,
  backing: { circle: [2.1, 2.1, 2.1] },
  bodyColor: '#000000',
  body: '',
  eyes: CELESTIAL_EYE_BOXES.map((box) => ({ d: '', box })),
  extras: [],
  eyeBox: [
    CELESTIAL_EYE_BOXES[0]![0],
    CELESTIAL_EYE_BOXES[0]![1],
    CELESTIAL_EYE_BOXES[1]![0] + SUN_EYE_W - CELESTIAL_EYE_BOXES[0]![0],
    SUN_EYE_H,
  ],
};

export class Scenery {
  readonly group = new THREE.Group();
  private readonly layers = new Map<number, THREE.Group>();
  private readonly background: THREE.Color;
  private readonly skyMat: THREE.MeshBasicMaterial;
  private readonly hillMats: THREE.MeshBasicMaterial[] = [];
  private readonly treeMats: THREE.MeshBasicMaterial[] = [];
  private readonly trainingProps: THREE.Object3D[] = [];
  private readonly workshopProps: THREE.Object3D[] = [];
  private readonly citadelProps: THREE.Object3D[] = [];
  private readonly clouds: THREE.Mesh[] = [];
  private readonly cloudMats: THREE.MeshBasicMaterial[] = [];
  private readonly dirtMat: THREE.MeshBasicMaterial;
  private readonly grassMat: THREE.MeshBasicMaterial;
  private readonly fringeMat: THREE.MeshBasicMaterial;
  private readonly sunMat: THREE.MeshBasicMaterial;
  private readonly shaftMat: THREE.MeshBasicMaterial;
  /** Sun by day, moon over the citadel: disc, halo, eyes and light shafts all hang off this. */
  readonly celestial = new THREE.Group();
  readonly sun: THREE.Mesh;
  private halo!: THREE.Mesh;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private readonly shafts: THREE.Mesh[] = [];
  private readonly pupils: THREE.Object3D[] = [];
  private readonly lids: THREE.Object3D[] = [];
  private readonly face = new THREE.Group();
  private readonly gaze = new THREE.Vector2();
  private readonly gazeTarget = new THREE.Vector2();
  private blinkAt = 3;
  private parallaxRef: { cx: number; cy: number; h: number } | null = null;

  constructor(scene: THREE.Scene) {
    const look = LOOK.training!;
    this.background = new THREE.Color(look.sky);
    scene.background = this.background;
    scene.fog = null;

    this.skyMat = new THREE.MeshBasicMaterial({
      map: ILL.sky,
      color: look.skyTint,
      fog: false,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(520, 360), this.skyMat);
    sky.position.set(0, 40, DEPTH.sky);
    sky.renderOrder = -100;
    this.layer(PARALLAX.sky).add(sky);

    this.celestial.position.set(-6, 7.2, DEPTH.hillsFar - 4);
    this.layer(PARALLAX.sun).add(this.celestial);

    this.sunMat = new THREE.MeshBasicMaterial({ color: look.sun, fog: false });
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), this.sunMat);
    this.celestial.add(this.sun);
    this.haloMat = new THREE.MeshBasicMaterial({
      color: '#ffe7a8',
      transparent: true,
      opacity: 0.16,
      fog: false,
      depthWrite: false,
    });
    this.halo = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), this.haloMat);
    this.halo.position.z = -0.2;
    this.celestial.add(this.halo);
    this.addEyes();

    this.shaftMat = new THREE.MeshBasicMaterial({
      map: ILL.shaft,
      color: look.shaft,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.PlaneGeometry(3.2, 30);
      geo.translate(0, -15, 0);
      const shaft = new THREE.Mesh(geo, this.shaftMat);
      shaft.position.z = 5;
      shaft.userData.spread = -0.5 + i * 0.25;
      this.celestial.add(shaft);
      this.shafts.push(shaft);
    }

    this.addHill(-16, 2.5, DEPTH.hillsFar, 78, 7.4, ILL.hillFar, 0);
    this.addHill(28, 2.3, DEPTH.hillsFar + 1, 64, 6.6, ILL.hillFar, 0);
    this.addHill(-4, 2.05, DEPTH.hillsFar + 6, 62, 6.2, ILL.hillMid, 1);
    this.addHill(26, 1.85, DEPTH.hillsFar + 7, 54, 5.6, ILL.hillMid, 1);
    this.addHill(2, 1.45, DEPTH.hillsFar + 12, 48, 4.8, ILL.hillNear, 2);
    this.addHill(32, 1.3, DEPTH.hillsFar + 13, 40, 4.4, ILL.hillNear, 2);
    this.addTree(-8, 2.3, DEPTH.hillsFar + 14);
    this.addTree(7.5, 2.6, DEPTH.hillsFar + 15);
    this.addTree(19, 2.1, DEPTH.hillsFar + 14);
    this.addProp(5.5, 0.6, 0.8, ILL.crate, this.workshopProps, DEPTH.hillsFar + 9, {
      baseY: 1.55,
      tint: '#efd9bd',
      layer: PARALLAX.hillsMid,
    });
    this.addProp(17.2, 0.74, 0.95, ILL.crate, this.workshopProps, DEPTH.hillsFar + 9, {
      baseY: 1.75,
      tint: '#efd9bd',
      layer: PARALLAX.hillsMid,
    });
    this.addProp(-1.5, 2.6, 3.4, ILL.tower, this.citadelProps, DEPTH.hillsFar + 16);
    this.addProp(9, 3.1, 4.2, ILL.tower, this.citadelProps, DEPTH.hillsFar + 16);
    this.addProp(22, 2.2, 2.8, ILL.tower, this.citadelProps, DEPTH.hillsFar + 16);

    this.addClouds();

    this.dirtMat = new THREE.MeshBasicMaterial({ map: TEX.dirt, color: look.dirt });
    TEX.dirt.wrapS = TEX.dirt.wrapT = THREE.RepeatWrapping;
    TEX.dirt.repeat.set(10, 18);
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(420, 360, 6), this.dirtMat);
    dirt.position.set(0, -180, DEPTH.ground);
    this.layer(PARALLAX.world).add(dirt);

    this.grassMat = new THREE.MeshBasicMaterial({ map: TEX.grass, color: look.grass });
    TEX.grass.wrapS = TEX.grass.wrapT = THREE.RepeatWrapping;
    TEX.grass.repeat.set(24, 2);
    const grass = new THREE.Mesh(new THREE.BoxGeometry(420, 0.42, 6), this.grassMat);
    grass.position.set(0, -0.08, DEPTH.ground + 0.05);
    this.layer(PARALLAX.world).add(grass);

    this.fringeMat = new THREE.MeshBasicMaterial({
      map: ILL.fringe,
      transparent: true,
      depthWrite: false,
      color: '#ffffff',
    });
    ILL.fringe.wrapS = THREE.RepeatWrapping;
    ILL.fringe.repeat.set(36, 1);
    const fringe = new THREE.Mesh(new THREE.PlaneGeometry(420, 1.15), this.fringeMat);
    fringe.position.set(0, 0.42, DEPTH.ground + 0.4);
    fringe.renderOrder = 2;
    this.layer(PARALLAX.world).add(fringe);

    this.addBush(-3.2, 0.42);
    this.addBush(3.4, 0.38);
    this.addBush(16.8, 0.4);
    this.addBush(21.5, 0.36);

    scene.add(this.group);
  }

  private layer(factor: number): THREE.Group {
    let g = this.layers.get(factor);
    if (!g) {
      g = new THREE.Group();
      this.layers.set(factor, g);
      this.group.add(g);
    }
    return g;
  }

  /** Next applyParallax captures a fresh reference (level start camera). */
  resetParallax(): void {
    this.parallaxRef = null;
  }

  /**
   * Anchor parallax to a known view instead of the next rendered frame —
   * level load calls this with the intro start view so the reference can't
   * race the camera snap (a mid-transition capture offsets every layer).
   */
  setParallaxAnchor(anchor: { cx: number; cy: number; h: number }): void {
    this.parallaxRef = { cx: anchor.cx, cy: anchor.cy, h: anchor.h };
  }

  /** Layers offset by (cam - ref) * factor and scaled by viewH relative to ref. */
  applyParallax(camCx: number, camCy: number, viewH: number): void {
    if (!this.parallaxRef) {
      this.parallaxRef = { cx: camCx, cy: camCy, h: viewH };
      return;
    }
    const ref = this.parallaxRef;
    const zoom = ref.h > 0 ? viewH / ref.h : 1;
    for (const [factor, g] of this.layers) {
      g.position.x = (camCx - ref.cx) * factor;
      g.position.y = (camCy - ref.cy) * factor;
      g.scale.setScalar(1 + factor * (zoom - 1));
    }
  }

  /** Slow cloud drift, wrapping across the sky. */
  update(dt: number): void {
    for (const c of this.clouds) {
      c.position.x += CLOUD_DRIFT * dt;
      if (c.position.x > CLOUD_WRAP) c.position.x -= CLOUD_SPAN;
    }
  }

  setChapter(chapter: string): void {
    const look = LOOK[chapter] ?? LOOK.training!;
    this.background.set(look.sky);
    this.skyMat.color.set(look.skyTint);
    this.dirtMat.color.set(look.dirt);
    this.grassMat.color.set(look.grass);
    this.sunMat.color.set(look.sun);
    this.shaftMat.color.set(look.shaft);
    this.shaftMat.opacity = chapter === 'citadel' ? 0.12 : chapter === 'workshop' ? 0.3 : 0.26;
    this.fringeMat.color.set(chapter === 'citadel' ? '#8fb89a' : '#ffffff');
    for (const mat of this.cloudMats) mat.color.set(look.cloud);
    const training = chapter !== 'workshop' && chapter !== 'citadel';
    for (const obj of this.trainingProps) obj.visible = training;
    for (const obj of this.workshopProps) obj.visible = chapter === 'workshop';
    for (const obj of this.citadelProps) obj.visible = chapter === 'citadel';
    let i = 0;
    for (const mat of this.hillMats) {
      mat.color.set(look.hill[Math.min(2, Math.floor(i / 2))]!);
      i += 1;
    }
    const treeTint = chapter === 'citadel' ? '#9aab9a' : chapter === 'workshop' ? '#e7d2a4' : '#ffffff';
    for (const mat of this.treeMats) mat.color.set(treeTint);
    const moon = chapter === 'citadel';
    if (moon) this.celestial.position.set(-5, 8.6, DEPTH.hillsFar - 4);
    else this.celestial.position.set(-6, chapter === 'workshop' ? 6.4 : 7.2, DEPTH.hillsFar - 4);
    const size = moon ? 0.62 : 1;
    this.sun.scale.setScalar(size);
    this.haloMat.color.set(moon ? '#b9c8ff' : '#ffe7a8');
    this.haloMat.opacity = moon ? 0.12 : 0.16;
    this.halo.scale.setScalar(moon ? 0.8 : 1);
    this.face.scale.setScalar(size);
    // Rays fan out from the disc toward the play field: sun and moon both hang on
    // the western side of the frame, so their light leans east onto the structures.
    const lean = moon ? 0.35 : 0.3;
    for (const shaft of this.shafts) {
      shaft.rotation.z = lean + (shaft.userData.spread as number) * 1.3;
      shaft.scale.set(1, moon ? 0.7 : 1, 1);
    }
    this.resetParallax();
  }

  /** Point the sun/moon eyes at a world-space spot; called every frame with the action focus. */
  lookAt(x: number, y: number, dt: number): void {
    const dx = x - this.celestial.position.x;
    const dy = y - this.celestial.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, dist / 14);
    this.gazeTarget.set((dx / dist) * reach, (dy / dist) * reach);
    const k = 1 - Math.exp(-dt * 6);
    this.gaze.lerp(this.gazeTarget, k);
    // Same look-around math as the bot stickers: the pill pair slides as one
    // group ∝ gaze, spacing compresses a little, the far eye narrows mildly —
    // the eyes never merge or slide off the disc.
    const poses = yawEyeTransforms(CELESTIAL_EYES, this.gaze.x * 0.42);
    for (let i = 0; i < this.pupils.length; i++) {
      const p = this.pupils[i]!;
      const pose = poses[i];
      p.position.x = (p.userData.homeX as number) + (pose?.dx ?? 0);
      p.position.y = (p.userData.homeY as number) + this.gaze.y * 0.2;
      p.scale.x = Math.max(0.05, pose?.sx ?? 1);
    }
    this.blinkAt -= dt;
    if (this.blinkAt < -0.14) this.blinkAt = 2.5 + Math.random() * 3;
    const closed = this.blinkAt < 0 ? 1 - Math.abs(this.blinkAt + 0.07) / 0.07 : 0;
    for (const lid of this.lids) lid.scale.y = Math.max(0.05, 1 - closed);
  }

  /** One flat capsule shape per eye — a single mesh, so nothing can smear. */
  private static eyeCapsule(w: number, h: number): THREE.ShapeGeometry {
    const r = w / 2;
    const half = h / 2 - r;
    const shape = new THREE.Shape();
    shape.absarc(0, half, r, 0, Math.PI, false); // top cap
    shape.lineTo(-r, -half);
    shape.absarc(0, -half, r, Math.PI, Math.PI * 2, false); // bottom cap
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 16);
  }

  private addEyes(): void {
    const face = this.face;
    // Above the light shafts (they sit at z=5) so a translucent ray band can
    // never wash across the eyes and read as a ghosted second pill.
    face.position.z = 5.5;
    this.celestial.add(face);
    // Dark rounded pills on the pale disc — same style as the sticker bots
    // (e.g. the white cloud), with a slight inward tilt.
    const pill = new THREE.MeshBasicMaterial({ color: '#1d2433', fog: false });
    const geo = Scenery.eyeCapsule(SUN_EYE_W, SUN_EYE_H);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(geo, pill);
      eye.position.set(side * SUN_EYE_X, SUN_EYE_Y, 0);
      eye.rotation.z = side * SUN_EYE_TILT;
      eye.userData.homeX = side * SUN_EYE_X;
      eye.userData.homeY = SUN_EYE_Y;
      face.add(eye);
      this.pupils.push(eye);
      this.lids.push(eye);
    }
  }

  private addTree(x: number, h: number, z: number): void {
    const mat = new THREE.MeshBasicMaterial({
      map: ILL.tree,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.72, h), mat);
    mesh.position.set(x, 0.2 + h / 2, z);
    this.layer(PARALLAX.trees).add(mesh);
    this.treeMats.push(mat);
    this.trainingProps.push(mesh);
  }

  private addProp(
    x: number,
    h: number,
    w: number,
    map: THREE.Texture,
    bucket: THREE.Object3D[],
    z: number,
    opts?: { baseY?: number; tint?: string; layer?: number }
  ): void {
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    if (opts?.tint) mat.color.set(opts.tint);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, (opts?.baseY ?? 0) + h / 2, z);
    mesh.visible = false;
    this.layer(opts?.layer ?? PARALLAX.trees).add(mesh);
    bucket.push(mesh);
  }

  private addHill(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    map: THREE.Texture,
    layer: number
  ): void {
    const mat = new THREE.MeshBasicMaterial({
      map,
      color: LOOK.training.hill[layer],
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    const factor =
      layer === 0 ? PARALLAX.hillsFar : layer === 1 ? PARALLAX.hillsMid : PARALLAX.hillsNear;
    this.layer(factor).add(mesh);
    this.hillMats.push(mat);
  }

  private addClouds(): void {
    const spots = [
      [-12, 7.4, 5.2],
      [0.5, 8.2, 4.6],
      [11, 7.1, 5.4],
      [22, 8, 4.2],
    ] as const;
    for (const [x, y, w] of spots) {
      const mat = new THREE.MeshBasicMaterial({
        map: ILL.cloud,
        transparent: true,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.48), mat);
      mesh.position.set(x, y, DEPTH.hillsFar + 8);
      this.layer(PARALLAX.clouds).add(mesh);
      this.clouds.push(mesh);
      this.cloudMats.push(mat);
    }
  }

  private addBush(x: number, y: number): void {
    const mat = new THREE.MeshBasicMaterial({
      map: ILL.bush,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), mat);
    mesh.position.set(x, y + 0.35, DEPTH.ground + 0.35);
    mesh.renderOrder = 3;
    this.layer(PARALLAX.world).add(mesh);
    this.trainingProps.push(mesh);
  }
}
