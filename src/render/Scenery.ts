import * as THREE from 'three';
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
  private readonly dirtMat: THREE.MeshBasicMaterial;
  private readonly grassMat: THREE.MeshBasicMaterial;
  private readonly fringeMat: THREE.MeshBasicMaterial;
  private readonly sunMat: THREE.MeshBasicMaterial;
  private readonly shaftMat: THREE.MeshBasicMaterial;
  readonly sun: THREE.Mesh;
  private halo!: THREE.Mesh;
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

    this.sunMat = new THREE.MeshBasicMaterial({ color: look.sun, fog: false });
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), this.sunMat);
    this.sun.position.set(-6, 7.2, DEPTH.hillsFar - 4);
    this.layer(PARALLAX.sun).add(this.sun);
    this.halo = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 32),
      new THREE.MeshBasicMaterial({
        color: '#ffe7a8',
        transparent: true,
        opacity: 0.16,
        fog: false,
        depthWrite: false,
      })
    );
    this.halo.position.copy(this.sun.position);
    this.halo.position.z += 0.2;
    this.layer(PARALLAX.sun).add(this.halo);

    this.shaftMat = new THREE.MeshBasicMaterial({
      color: look.shaft,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    for (let i = 0; i < 4; i++) {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 26), this.shaftMat);
      shaft.position.set(-12 + i * 4.2, 9, DEPTH.hillsFar + 1);
      shaft.rotation.z = -0.45 + i * 0.08;
      this.layer(PARALLAX.sun).add(shaft);
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
    this.shaftMat.opacity = chapter === 'citadel' ? 0.03 : 0.08;
    this.fringeMat.color.set(chapter === 'citadel' ? '#8fb89a' : '#ffffff');
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
    if (moon) this.sun.position.set(14, 7.4, DEPTH.hillsFar - 4);
    else this.sun.position.set(-6, chapter === 'workshop' ? 6.4 : 7.2, DEPTH.hillsFar - 4);
    this.sun.scale.setScalar(moon ? 0.55 : 1);
    this.halo.visible = !moon;
    this.halo.scale.setScalar(1);
    this.halo.position.set(this.sun.position.x, this.sun.position.y, this.sun.position.z + 0.2);
    this.resetParallax();
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
