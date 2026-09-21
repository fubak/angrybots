import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import type { Level } from '../game/Level';
import type { GameEntity } from '../entities/types';
import { toon } from './toon';
import { addOutline } from './outline';
import { SlingView } from './SlingView';
import { Scenery } from './Scenery';
import { Juice } from './Juice';
import { decorateBlock, makeBotCharacter, makePigCharacter } from './characters';
import type { View } from '../camera/fitRect';
import type { SlingModel } from '../sling/SlingModel';
import type { ShotTrail } from '../sling/ShotTrail';
import type { BotKind } from '../levels/schema';

export type RendererInfo = {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
};

export class Renderer {
  readonly domElement: HTMLCanvasElement;
  readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.OrthographicCamera;
  private readonly entityMeshes = new Map<string, THREE.Object3D>();
  private readonly slingView: SlingView;
  readonly juice: Juice;
  private readonly scenery: Scenery;
  private aspect = 16 / 9;
  private fpsSamples: number[] = [];
  private lastFpsSample = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.domElement = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;
    this.camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 200);
    this.camera.position.z = 50;

    const hemi = new THREE.HemisphereLight(PALETTE.sky.bottom, PALETTE.ground.grass, 1.1);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff4e0', 2.0);
    key.position.set(-4, 8, 10);
    this.scene.add(key);

    this.scenery = new Scenery(this.scene);
    this.slingView = new SlingView(this.scene);
    this.juice = new Juice(this.scene);
  }

  setChapter(chapter: string): void {
    this.scenery.setChapter(chapter);
  }

  syncSling(
    model: SlingModel,
    queue: readonly BotKind[],
    aiming: boolean,
    trail: ShotTrail
  ): void {
    this.slingView.sync(model, queue, aiming, trail);
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.aspect = w / h;
  }

  syncLevel(level: Level | null): void {
    const live = new Set<string>();
    if (level) {
      for (const e of level.registry.all()) {
        if (!e.alive || e.kind === 'ground') continue;
        live.add(e.id);
        let mesh = this.entityMeshes.get(e.id);
        if (!mesh) {
          mesh = this.createPlaceholder(e);
          this.entityMeshes.set(e.id, mesh);
          this.scene.add(mesh);
        }
        if (e.body) {
          const p = e.body.getPosition();
          mesh.position.set(p.x, p.y, DEPTH.entities);
          mesh.rotation.z = e.body.getAngle();
        }
        if (e.kind === 'block') this.tintDamage(mesh, e.hp / e.maxHp, e.material);
      }
    }
    for (const [id, mesh] of this.entityMeshes) {
      if (!live.has(id)) {
        this.scene.remove(mesh);
        mesh.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
        this.entityMeshes.delete(id);
      }
    }
  }

  private createPlaceholder(e: GameEntity): THREE.Object3D {
    if (e.kind === 'block') {
      const color =
        e.material === 'wood'
          ? PALETTE.wood.base
          : e.material === 'stone'
            ? PALETTE.stone.base
            : e.material === 'glass'
              ? PALETTE.glass.base
              : PALETTE.tnt.base;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, e.h, e.depth),
        toon(color, e.material === 'glass' ? { transparent: true, opacity: 0.55 } : undefined).clone()
      );
      addOutline(mesh, 'box');
      decorateBlock(mesh, e.material, e.w, e.h, e.depth);
      mesh.renderOrder = 10;
      return mesh;
    }
    if (e.kind === 'pig') {
      const g = makePigCharacter(e.r, { helmet: e.helmet, king: e.king });
      g.renderOrder = 10;
      return g;
    }
    if (e.kind === 'bot') {
      const g = makeBotCharacter(e.botKind, e.r);
      g.renderOrder = 10;
      return g;
    }
    if (e.kind === 'fragment') {
      const color =
        e.material === 'wood'
          ? PALETTE.wood.base
          : e.material === 'stone'
            ? PALETTE.stone.base
            : e.material === 'glass'
              ? PALETTE.glass.base
              : PALETTE.tnt.base;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.2, 0.2),
        toon(color, e.material === 'glass' ? { transparent: true, opacity: 0.5 } : undefined)
      );
      mesh.renderOrder = 11;
      return mesh;
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5), toon(PALETTE.ground.dirt));
    mesh.renderOrder = 10;
    return mesh;
  }

  applyView(view: View, shakeX = 0, shakeY = 0): void {
    const h = view.h;
    const w = h * this.aspect;
    this.camera.left = view.cx - w / 2 + shakeX;
    this.camera.right = view.cx + w / 2 + shakeX;
    this.camera.bottom = view.cy - h / 2 + shakeY;
    this.camera.top = view.cy + h / 2 + shakeY;
    this.camera.updateProjectionMatrix();
  }

  private tintDamage(obj: THREE.Object3D, ratio: number, material: string): void {
    const cracked = ratio < 0.55;
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      if (!(mat instanceof THREE.MeshToonMaterial) || !mat.emissive) return;
      mat.emissive.set(cracked ? (material === 'tnt' ? '#3a1008' : '#2a1a10') : '#000000');
    });
  }

  render(_alpha: number, frameDt: number): void {
    this.juice.update(frameDt);
    this.renderer.render(this.scene, this.camera);
    const now = performance.now();
    if (frameDt > 0) {
      this.fpsSamples.push(1 / frameDt);
      if (now - this.lastFpsSample > 3000) {
        this.fpsSamples = this.fpsSamples.slice(-120);
        this.lastFpsSample = now;
      }
    }
  }

  getInfo(): RendererInfo {
    const m = this.renderer.info.memory;
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: m.geometries,
      textures: m.textures,
    };
  }

  fpsStats(): { p50: number; p95: number } {
    const s = [...this.fpsSamples].sort((a, b) => a - b);
    if (s.length === 0) return { p50: 60, p95: 60 };
    const p50 = s[Math.floor(s.length * 0.5)] ?? 60;
    const p95 = s[Math.floor(s.length * 0.95)] ?? p50;
    return { p50, p95 };
  }
}
