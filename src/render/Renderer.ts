import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import type { Level } from '../game/Level';
import type { GameEntity } from '../entities/types';
import { toon } from './toon';
import { addOutline } from './outline';
import type { View } from '../camera/fitRect';

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
  private readonly entityMeshes = new Map<string, THREE.Mesh>();
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

    const bg = new THREE.Color(PALETTE.sky.top);
    this.scene.background = bg;

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(120, 2, 0.4),
      toon(PALETTE.ground.grass)
    );
    ground.position.set(8, -1, DEPTH.ground);
    this.scene.add(ground);
    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(120, 0.6, 0.35),
      toon(PALETTE.ground.dirt)
    );
    dirt.position.set(8, -1.8, DEPTH.ground - 0.01);
    this.scene.add(dirt);
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
        if (!e.alive || e.kind === 'fragment' || e.kind === 'ground') continue;
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
      }
    }
    for (const [id, mesh] of this.entityMeshes) {
      if (!live.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.entityMeshes.delete(id);
      }
    }
  }

  private createPlaceholder(e: GameEntity): THREE.Mesh {
    let mesh: THREE.Mesh;
    if (e.kind === 'block') {
      const color =
        e.material === 'wood'
          ? PALETTE.wood.base
          : e.material === 'stone'
            ? PALETTE.stone.base
            : e.material === 'glass'
              ? PALETTE.glass.base
              : PALETTE.tnt.base;
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, e.h, e.depth),
        toon(color, e.material === 'glass' ? { transparent: true, opacity: 0.55 } : undefined)
      );
      addOutline(mesh, 'box');
    } else if (e.kind === 'pig') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(e.r, 16, 12),
        toon(PALETTE.pig.skin)
      );
      addOutline(mesh, 'sphere');
    } else if (e.kind === 'bot') {
      const color = PALETTE.bot[e.botKind];
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(e.r, 16, 12),
        toon(color)
      );
      addOutline(mesh, 'sphere');
    } else {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.5, 0.5),
        toon(PALETTE.ground.dirt)
      );
    }
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

  render(_alpha: number, frameDt: number): void {
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
