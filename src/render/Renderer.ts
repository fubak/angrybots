import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import type { Level } from '../game/Level';
import type { GameEntity } from '../entities/types';
import { addOutline } from './outline';
import { SlingView } from './SlingView';
import { Scenery } from './Scenery';
import { Juice } from './Juice';
import { BlobShadows, type ShadowCaster } from './BlobShadows';
import { disposeObject } from './dispose';
import { popScale } from './slingAnim';
import { blockMaterial, decorateBlock, makeBotCharacter, makePigCharacter, tickBot, tickFace } from './characters';
import { ILL } from './illustrations';
import { TEX, damagedBlockTexture, type DamageableMaterial, type DamageStage } from './textures';
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

const DAMAGE_INTACT: Record<DamageableMaterial, THREE.Texture> = {
  wood: ILL.plank,
  stone: ILL.stone,
  glass: ILL.glass,
};

let bodyMat: THREE.MeshBasicMaterial | null = null;
let capMat: THREE.MeshBasicMaterial | null = null;
function terrainBodyMat(): THREE.MeshBasicMaterial {
  if (!bodyMat) bodyMat = new THREE.MeshBasicMaterial({ map: TEX.terrainBody });
  return bodyMat;
}
function terrainCapMat(): THREE.MeshBasicMaterial {
  if (!capMat) capMat = new THREE.MeshBasicMaterial({ map: TEX.terrainCap });
  return capMat;
}

/** Scales a BoxGeometry's 0–1 UVs so the terrain texture tiles at world density. */
function scaleUV(geo: THREE.BoxGeometry, su: number, sv: number): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
}

export class Renderer {
  readonly domElement: HTMLCanvasElement;
  readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.OrthographicCamera;
  private readonly entityMeshes = new Map<string, THREE.Object3D>();
  private readonly slingView: SlingView;
  readonly juice: Juice;
  private readonly scenery: Scenery;
  /** World point the sun/moon eyes follow: flying bot or pulled pouch, else the targets. */
  private readonly focus = new THREE.Vector2(12, 2);
  private readonly blobShadows: BlobShadows;
  private readonly terrain = new THREE.Group();
  private readonly casters: ShadowCaster[] = [];
  private readonly dying: { mesh: THREE.Object3D; t: number }[] = [];
  private aiming = false;
  private lostActive = false;
  reducedMotion = false;
  private aspect = 16 / 9;
  private fpsSamples: number[] = [];
  private lastFpsSample = 0;
  private lastFrameAt = 0;
  private clock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.domElement = canvas;
    // Automation (Playwright/CI) renders on SwiftShader — cut MSAA and the
    // pixel ratio there so frames stay interactive instead of ~1 fps.
    const automated = typeof navigator !== 'undefined' && navigator.webdriver;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !automated,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = false;
    this.renderer.info.autoReset = false;
    this.camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 220);
    this.camera.position.z = 50;

    this.scenery = new Scenery(this.scene);
    this.scene.add(this.terrain);
    this.slingView = new SlingView(this.scene);
    this.juice = new Juice(this.scene);
    this.blobShadows = new BlobShadows(this.scene);
  }

  setChapter(chapter: string): void {
    this.scenery.setChapter(chapter);
  }

  setTerrain(pieces: LevelV2['terrain']): void {
    this.blobShadows.setTerrain(pieces);
    this.scenery.resetParallax();
    for (const child of [...this.terrain.children]) {
      disposeObject(child);
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
          terrainBodyMat()
        );
        // ShapeGeometry UVs are world coordinates — scale to terrain texel density.
        const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5);
        uv.needsUpdate = true;
        mesh.position.z = DEPTH.ground + 0.02;
        this.terrain.add(mesh);
        continue;
      }
      const top = t.top;
      const thick = t.kind === 'ledge' ? t.thickness : top;
      const y0 = t.kind === 'ledge' ? top - t.thickness : 0;
      const w = t.x1 - t.x0;
      const bodyGeo = new THREE.BoxGeometry(w, thick, 6);
      scaleUV(bodyGeo, w / 2.5, thick / 2.5);
      const body = new THREE.Mesh(bodyGeo, terrainBodyMat());
      body.position.set((t.x0 + t.x1) / 2, y0 + thick / 2, DEPTH.ground);
      const capGeo = new THREE.BoxGeometry(w, 0.16, 6);
      scaleUV(capGeo, w / 2, 0.16);
      const cap = new THREE.Mesh(capGeo, terrainCapMat());
      cap.position.set((t.x0 + t.x1) / 2, top - 0.08, DEPTH.ground + 0.03);
      this.terrain.add(body, cap);
    }
  }

  syncSling(
    model: SlingModel,
    queue: readonly BotKind[],
    aiming: boolean,
    trail: ShotTrail,
    fx?: { hopT: number | null; bonusT: number | null; lostT?: number | null }
  ): void {
    this.aiming = aiming;
    this.lostActive = fx?.lostT != null;
    this.slingView.sync(model, queue, aiming, trail, fx);
  }

  /** World positions of queued bots (for bonus popups). */
  queuePositions(): readonly { x: number; y: number }[] {
    return this.slingView.queuePositions();
  }

  /** Pop pulse on a live shot bot — driven by the sim 'bot:ability' event. */
  pulseBot(botId: string): void {
    const mesh = this.entityMeshes.get(botId);
    if (mesh) mesh.userData.popAt = this.clock;
  }

  /** Trajectory preview density: 'short' truncates the arc, 'off' hides it. */
  setAimGuide(mode: 'off' | 'short' | 'full'): void {
    this.slingView.setGuide(mode);
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    const cap = typeof navigator !== 'undefined' && navigator.webdriver ? 0.6 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    this.aspect = w / h;
  }

  /** Drops every entity mesh and its owned GPU resources (level change / restart). */
  clearLevel(): void {
    for (const [id, mesh] of this.entityMeshes) {
      this.scene.remove(mesh);
      disposeObject(mesh);
      this.entityMeshes.delete(id);
    }
    for (const d of this.dying) {
      this.scene.remove(d.mesh);
      disposeObject(d.mesh);
    }
    this.dying.length = 0;
    this.juice.clear();
    this.blobShadows.update([]);
  }

  /** Position the targets should watch: the flying bot, else the loaded sling bot. */
  private watchTarget(level: Level | null): { x: number; y: number } | null {
    const flying = level?.shotBots().find((b) => b.alive && b.body);
    if (flying?.body) {
      const p = flying.body.getPosition();
      return { x: p.x, y: p.y };
    }
    return this.slingView.loadedPos();
  }

  syncLevel(level: Level | null, frameDt: number): void {
    const live = new Set<string>();
    this.casters.length = 0;
    const watch = this.watchTarget(level);
    if (watch) this.focus.set(watch.x, watch.y);
    let pigX = 0;
    let pigY = 0;
    let pigs = 0;
    if (level) {
      for (const e of level.registry.all()) {
        if (!e.alive || e.kind === 'ground' || e.kind === 'terrain') continue;
        if (e.kind === 'pig' && e.body) {
          pigX += e.body.getPosition().x;
          pigY += e.body.getPosition().y;
          pigs += 1;
        }
        live.add(e.id);
        let mesh = this.entityMeshes.get(e.id);
        if (!mesh) {
          mesh = this.createPlaceholder(e);
          mesh.userData.kind = e.kind;
          if (e.kind === 'pig') mesh.userData.nextTaunt = this.clock + 4 + Math.random() * 5;
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
            flinch = Math.max(0, flinch - 2.4 * frameDt);
            mesh.userData.flinch = flinch;
          }
          const bob = flinch > 0 ? Math.sin(flinch * 18) * flinch * 0.12 : 0;
          if (e.kind === 'bot') {
            const v = e.body.getLinearVelocity();
            const speed = v.length();
            // Orientation: while airborne the sticker points its top along the
            // velocity so the ≤15% stretch runs along the flight path; on the
            // ground the collider's real roll angle shows (tumbling reads as
            // part of the dizzy look).
            const oriented = mesh.userData.oriented === true;
            const flying = oriented ? speed > 1.5 : speed > 4;
            if (e.firstImpactAt !== null && mesh.userData.impacted !== true) {
              mesh.userData.impacted = true;
              mesh.userData.impactT = 0;
              mesh.userData.hurtT = 0;
            }
            const it = mesh.userData.impactT as number | undefined;
            let sx = 1;
            let sy = 1;
            if (it !== undefined && it < 0.2) {
              const k = 1 - it / 0.2;
              mesh.userData.impactT = it + frameDt;
              sx = 1 + 0.35 * k;
              sy = Math.max(0.66, 1 - 0.3 * k);
            } else if (flying) {
              mesh.userData.oriented = true;
              const s = Math.min(0.15, speed * 0.0042);
              sy = 1 + s;
              sx = 1 - s * 0.6;
              mesh.rotation.z = Math.atan2(v.y, v.x) - Math.PI / 2;
            } else {
              mesh.userData.oriented = false;
            }
            mesh.scale.set(sx, sy, 1);
            mesh.userData.flying = flying;
            if (mesh.userData.hurtT !== undefined) {
              mesh.userData.hurtT = (mesh.userData.hurtT as number) + frameDt;
            }
            if (!flying && (mesh.userData.impacted === true || speed > 0.4)) {
              mesh.userData.landed = true;
            }
          } else if (e.kind === 'pig') {
            const breathe = 1 + Math.sin(this.clock * 3.2 + mesh.id) * 0.035;
            mesh.scale.set(breathe * (1 + flinch * 0.28), (2 - breathe) * (1 - flinch * 0.3), 1);
            let taunt = mesh.userData.nextTaunt as number | undefined;
            if (taunt !== undefined && this.clock >= taunt && flinch <= 0) {
              mesh.userData.tauntT = 0;
              mesh.userData.nextTaunt = this.clock + 4 + Math.random() * 5;
              taunt = mesh.userData.nextTaunt;
            }
            const tt = mesh.userData.tauntT as number | undefined;
            if (tt !== undefined && tt < 0.4) {
              mesh.userData.tauntT = tt + frameDt;
              mesh.position.y += Math.sin((tt / 0.4) * Math.PI) * 0.24;
            }
            const pupils = mesh.getObjectByName('pupils') as THREE.Mesh | undefined;
            if (pupils) {
              if (watch) {
                const dx = watch.x - p.x;
                const dy = watch.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                pupils.position.x = Math.max(-0.06, Math.min(0.06, (dx / d) * 0.06));
                pupils.position.y = -e.r * 0.08 + Math.max(-0.06, Math.min(0.06, (dy / d) * 0.06));
              } else {
                pupils.position.x = 0;
                pupils.position.y = -e.r * 0.08;
              }
            }
          } else {
            mesh.scale.set(1, 1, 1);
          }
          mesh.position.y += bob;
          if (e.kind === 'block' || e.kind === 'pig' || e.kind === 'bot') {
            this.casters.push({
              x: p.x,
              y:
                p.y -
                (e.kind === 'block' ? e.h / 2 : e.r) * mesh.scale.y,
              w: (e.kind === 'block' ? e.w : e.r * 2) * mesh.scale.x,
            });
          }
        }
        if (e.kind === 'block') this.tintDamage(mesh, e.hp / e.maxHp, e.material);
        if (e.kind === 'pig') this.tintPig(mesh, e.hp / e.maxHp);
        if (e.kind === 'pig') {
          tickFace(mesh, this.clock, { hurt: mesh.userData.hurt === true, smug: this.aiming });
        } else if (e.kind === 'bot') {
          const popAt = mesh.userData.popAt as number | undefined;
          tickBot(mesh, this.clock, {
            lead: mesh.userData.flying === true,
            hurtT: mesh.userData.hurtT as number | undefined,
            dizzy:
              mesh.userData.landed === true &&
              mesh.userData.flying !== true &&
              !this.lostActive,
            // Level lost: the survivors on the field turn away and hold.
            turnAway: this.lostActive && mesh.userData.landed === true,
            popT: popAt === undefined ? null : this.clock - popAt,
            reducedMotion: this.reducedMotion,
          });
        }
      }
    }
    if (!watch && pigs > 0) this.focus.set(pigX / pigs, pigY / pigs);
    for (const [id, mesh] of this.entityMeshes) {
      if (!live.has(id)) {
        if (mesh.userData.kind === 'pig') {
          // Death pop: keep the mesh briefly as a scale-pop visual while the sim entity is gone.
          mesh.userData.dying = true;
          this.dying.push({ mesh, t: 0 });
        } else {
          this.scene.remove(mesh);
          disposeObject(mesh);
        }
        this.entityMeshes.delete(id);
      }
    }
    this.casters.push(...this.slingView.shadowCasters);
    this.blobShadows.update(this.casters);
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
        mesh.userData.ownedMap = map;
        mesh.userData.rotated = true;
      }
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
      mesh.renderOrder = 11;
      return mesh;
    }
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.5, 0.5, 4, 2, 2),
      new THREE.MeshBasicMaterial({ color: PALETTE.ground.dirt })
    );
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
    this.scenery.applyParallax(view.cx + shakeX, view.cy + shakeY, h);
  }

  private tintPig(obj: THREE.Object3D, ratio: number): void {
    obj.userData.hurt = ratio < 0.55;
  }

  /** Damage states: intact > 66% hp, cracked ≤ 66%, broken ≤ 33% — shared textures. */
  private tintDamage(obj: THREE.Object3D, ratio: number, material: string): void {
    const stage: DamageStage = ratio <= 0.33 ? 2 : ratio <= 0.66 ? 1 : 0;
    if (obj.userData.dmgStage === stage) return;
    obj.userData.dmgStage = stage;
    const damageable =
      material === 'wood' || material === 'stone' || material === 'glass'
        ? (material as DamageableMaterial)
        : null;
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      if (!(mat instanceof THREE.MeshBasicMaterial) || mesh.userData.role !== 'block-face') return;
      mat.color.set(stage === 2 ? '#d8d8d8' : '#ffffff');
      if (!damageable) return;
      const rotated = obj.userData.rotated === true;
      let map: THREE.Texture | null;
      if (stage === 0) {
        map = rotated ? (obj.userData.ownedMap as THREE.Texture) : DAMAGE_INTACT[damageable];
      } else {
        map = damagedBlockTexture(damageable, stage, rotated);
      }
      if (mat.map !== map) {
        mat.map = map;
        mat.needsUpdate = true;
      }
    });
  }

  render(_alpha: number, frameDt: number): void {
    this.clock += frameDt;
    this.slingView.animate(this.clock, this.reducedMotion);
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i]!;
      d.t += frameDt;
      const s = popScale(d.t);
      d.mesh.scale.setScalar(Math.max(0.001, s));
      d.mesh.rotation.z += frameDt * 2.5;
      if (s <= 0.001) {
        this.scene.remove(d.mesh);
        disposeObject(d.mesh);
        this.dying.splice(i, 1);
      }
    }
    this.juice.update(frameDt);
    this.scenery.lookAt(this.focus.x, this.focus.y, frameDt);
    this.scenery.update(frameDt);
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

  fpsStats(): { p50: number; p5Low: number } {
    const s = [...this.fpsSamples].sort((a, b) => a - b);
    if (s.length === 0) return { p50: 60, p5Low: 60 };
    const p50 = s[Math.floor(s.length * 0.5)] ?? 60;
    const p5Low = s[Math.floor(s.length * 0.05)] ?? p50;
    return { p50, p5Low };
  }
}
