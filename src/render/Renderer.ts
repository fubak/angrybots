import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import type { Level } from '../game/Level';
import type { GameEntity } from '../entities/types';
import { toon } from './toon';
import { addOutline } from './outline';
import { SlingView } from './SlingView';
import { Scenery } from './Scenery';
import { Juice } from './Juice';
import { blockMaterial, decorateBlock, makeBotCharacter, makePigCharacter, tickFace } from './characters';
import { ILL } from './illustrations';
import { crackTexture } from './textures';
import type { View } from '../camera/fitRect';
import type { SlingModel } from '../sling/SlingModel';
import type { ShotTrail } from '../sling/ShotTrail';
import type { BotKind, LevelV2 } from '../levels/schema';

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
  private readonly terrain = new THREE.Group();
  private readonly key: THREE.DirectionalLight;
  private readonly rim: THREE.DirectionalLight;
  private readonly fill: THREE.PointLight;
  private readonly hemi: THREE.HemisphereLight;
  private aspect = 16 / 9;
  private fpsSamples: number[] = [];
  private lastFpsSample = 0;
  private lastFrameAt = 0;
  private clock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.domElement = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 220);
    this.camera.position.z = 50;

    this.hemi = new THREE.HemisphereLight('#c8e8ff', '#7a5a30', 0.95);
    this.scene.add(this.hemi);

    this.key = new THREE.DirectionalLight('#fff6d8', 2.4);
    this.key.position.set(-10, 16, 18);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(512, 512);
    this.key.shadow.camera.left = -28;
    this.key.shadow.camera.right = 28;
    this.key.shadow.camera.top = 18;
    this.key.shadow.camera.bottom = -10;
    this.key.shadow.camera.near = 2;
    this.key.shadow.camera.far = 70;
    this.key.shadow.bias = -0.0008;
    this.scene.add(this.key);

    this.rim = new THREE.DirectionalLight('#7ec8ff', 1.15);
    this.rim.position.set(14, 6, 8);
    this.scene.add(this.rim);

    this.fill = new THREE.PointLight('#ffd29a', 6, 32, 1.6);
    this.fill.position.set(4, 7, 6);
    this.scene.add(this.fill);

    this.scenery = new Scenery(this.scene);
    this.scene.add(this.terrain);
    this.slingView = new SlingView(this.scene);
    this.juice = new Juice(this.scene);
  }

  setChapter(chapter: string): void {
    this.scenery.setChapter(chapter);
    if (chapter === 'workshop') {
      this.hemi.color.set('#ffd7a0');
      this.hemi.groundColor.set('#6a3a18');
      this.key.color.set('#ffb56a');
      this.key.intensity = 3.1;
      this.rim.color.set('#ff8a40');
      this.fill.color.set('#ff9a3a');
      this.renderer.toneMappingExposure = 1;
      return;
    }
    if (chapter === 'citadel') {
      this.hemi.color.set('#6a80d0');
      this.hemi.groundColor.set('#1a1420');
      this.key.color.set('#c8d8ff');
      this.key.intensity = 2.2;
      this.rim.color.set('#6a8cff');
      this.fill.color.set('#4a68c8');
      this.renderer.toneMappingExposure = 1;
      return;
    }
    this.hemi.color.set('#c8e8ff');
    this.hemi.groundColor.set('#7a5a30');
    this.key.color.set('#fff6d8');
    this.key.intensity = 2.4;
    this.rim.color.set('#7ec8ff');
    this.fill.color.set('#ffd29a');
    this.renderer.toneMappingExposure = 1;
  }

  setTerrain(pieces: LevelV2['terrain']): void {
    for (const child of [...this.terrain.children]) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
      this.terrain.remove(child);
    }
    for (const t of pieces) {
      if (t.kind === 'ramp') {
        const shape = new THREE.Shape();
        shape.moveTo(t.x0, 0);
        shape.lineTo(t.x1, 0);
        shape.lineTo(t.x1, t.y1);
        shape.lineTo(t.x0, t.y0);
        shape.closePath();
        const mesh = new THREE.Mesh(
          new THREE.ShapeGeometry(shape),
          new THREE.MeshBasicMaterial({ color: '#8d5a32' })
        );
        mesh.position.z = DEPTH.ground + 0.02;
        this.terrain.add(mesh);
        continue;
      }
      const top = t.top;
      const thick = t.kind === 'ledge' ? t.thickness : top;
      const y0 = t.kind === 'ledge' ? top - t.thickness : 0;
      const w = t.x1 - t.x0;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, thick, 6),
        new THREE.MeshBasicMaterial({ color: '#8d5a32' })
      );
      body.position.set((t.x0 + t.x1) / 2, y0 + thick / 2, DEPTH.ground);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.16, 6),
        new THREE.MeshBasicMaterial({ color: '#5aaa34' })
      );
      cap.position.set((t.x0 + t.x1) / 2, top - 0.08, DEPTH.ground + 0.03);
      this.terrain.add(body, cap);
    }
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
          const hp = 'hp' in e ? e.hp : undefined;
          const prevHp = mesh.userData.hp as number | undefined;
          if (hp !== undefined && prevHp !== undefined && hp < prevHp) mesh.userData.flinch = 1;
          if (hp !== undefined) mesh.userData.hp = hp;
          let flinch = (mesh.userData.flinch as number | undefined) ?? 0;
          if (flinch > 0) {
            flinch = Math.max(0, flinch - 0.04);
            mesh.userData.flinch = flinch;
          }
          const bob = flinch > 0 ? Math.sin(flinch * 18) * flinch * 0.12 : 0;
          if (e.kind === 'bot') {
            const v = e.body.getLinearVelocity();
            const speed = v.length();
            const prevSpeed = (mesh.userData.speed as number | undefined) ?? speed;
            mesh.userData.speed = speed;
            let impact = (mesh.userData.impact as number | undefined) ?? 0;
            if (prevSpeed - speed > 7) impact = Math.min(1, (prevSpeed - speed) / 18);
            impact = Math.max(0, impact - 0.05);
            mesh.userData.impact = impact;
            const stretch = Math.min(0.34, speed / 55);
            const pancake = impact * 0.32;
            if (speed > 4 && v.x > 0) {
              // Stretch along the flight path so the streak reads at any spin angle.
              mesh.rotation.z = Math.atan2(v.y, v.x);
              mesh.scale.set(1 + stretch * 1.35, Math.max(0.66, 1 - stretch), 1);
            } else {
              mesh.scale.set(1 + pancake, Math.max(0.6, 1 - pancake), 1);
            }
            mesh.userData.flying = speed > 2;
            const face = mesh.getObjectByName('face');
            if (face) {
              face.position.x = Math.max(-0.1, Math.min(0.14, v.x * 0.012));
              face.position.y = Math.max(-0.08, Math.min(0.12, v.y * 0.01));
            }
          } else if (e.kind === 'pig') {
            const breathe = 1 + Math.sin(this.clock * 3.2 + mesh.id) * 0.035;
            mesh.scale.set(breathe, 2 - breathe, 1);
          } else {
            mesh.scale.set(1, 1, 1);
          }
          mesh.position.y += bob;
        }
        if (e.kind === 'block') this.tintDamage(mesh, e.hp / e.maxHp, e.material);
        if (e.kind === 'pig') this.tintPig(mesh, e.hp / e.maxHp);
        if (e.kind === 'pig' || e.kind === 'bot') {
          tickFace(mesh, this.clock, mesh.userData.hurt === true);
        }
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
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, e.h, e.depth),
        blockMaterial(e.material)
      );
      addOutline(mesh, 'box');
      decorateBlock(mesh);
      if (e.material === 'wood' && e.h > e.w * 1.15) {
        const map = ILL.plank.clone();
        map.center.set(0.5, 0.5);
        map.rotation = Math.PI / 2;
        map.needsUpdate = true;
        (mesh.material as THREE.MeshBasicMaterial).map = map;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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
      const depth = e.material === 'glass' ? 0.12 : 0.2;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(e.w, e.h, depth),
        blockMaterial(e.material)
      );
      mesh.castShadow = true;
      mesh.renderOrder = 11;
      return mesh;
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5, 4, 2, 2), toon(PALETTE.ground.dirt));
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

  private tintPig(obj: THREE.Object3D, ratio: number): void {
    obj.userData.hurt = ratio < 0.55;
  }

  private tintDamage(obj: THREE.Object3D, ratio: number, material: string): void {
    const cracked = ratio < 0.55;
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      if (mat instanceof THREE.MeshBasicMaterial && mesh.userData.role === 'block-face') {
        mat.color.set(cracked ? '#d0d0d0' : '#ffffff');
      }
      if (mat instanceof THREE.MeshToonMaterial && mat.emissive) {
        if (material === 'tnt') {
          mat.emissive.set(cracked ? '#8a2208' : '#5a1008');
        } else {
          mat.emissive.set(cracked ? '#2a1a10' : '#000000');
        }
      }
    });
    let crack = obj.getObjectByName('crack') as THREE.Mesh | undefined;
    if (ratio < 0.72) {
      if (!crack) {
        crack = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({
            map: crackTexture(),
            transparent: true,
            depthWrite: false,
            opacity: 0.85,
          })
        );
        crack.name = 'crack';
        crack.position.z = 0.55;
        obj.add(crack);
      }
      crack.visible = true;
      const block = obj as THREE.Mesh;
      const geo = block.geometry;
      if (geo instanceof THREE.BoxGeometry) {
        const params = geo.parameters;
        crack.scale.set(params.width * 0.92, params.height * 0.92, 1);
        crack.position.z = params.depth / 2 + 0.02;
      }
      (crack.material as THREE.MeshBasicMaterial).opacity = ratio < 0.4 ? 1 : 0.65;
    } else if (crack) {
      crack.visible = false;
    }
  }

  render(_alpha: number, frameDt: number): void {
    this.clock += frameDt;
    this.slingView.animate(this.clock);
    this.juice.update(frameDt);
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    const now = performance.now();
    if (this.lastFrameAt > 0) {
      const wall = (now - this.lastFrameAt) / 1000;
      if (wall > 0 && wall < 1) this.fpsSamples.push(1 / wall);
    }
    this.lastFrameAt = now;
    if (now - this.lastFpsSample > 3000) {
      this.fpsSamples = this.fpsSamples.slice(-120);
      this.lastFpsSample = now;
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
