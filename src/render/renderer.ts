import * as THREE from 'three';
import type { Entity, MapDef, Projectile } from '../core/types';
import type { WorldMap } from '../engine/map';
import type { Player } from '../engine/player';
import { buildTextures, textureRegistry } from './textures';
import { buildSprites, spriteRegistry } from './sprites';

/**
 * LOOK: Three.js renderer.
 * - Level built from the grid map: per-cell wall boxes + floor/ceiling planes,
 *   grouped per texture, vertex-colored by sector light level.
 * - Renders into a fixed 320x200 canvas stretched with nearest-neighbor CSS.
 * - Entities are billboarded THREE.Sprite; distance fog gives light falloff.
 */
export const VIEW_W = 320;
export const VIEW_H = 200;

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private levelGroup = new THREE.Group();
  private spriteGroup = new THREE.Group();
  private spriteMeshes = new Map<string, THREE.Sprite>();
  private projMeshes: THREE.Mesh[] = [];

  constructor(container: HTMLElement) {
    buildTextures();
    buildSprites();
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(VIEW_W, VIEW_H, false);
    this.canvas = this.renderer.domElement;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.imageRendering = 'pixelated';
    container.appendChild(this.canvas);

    this.camera = new THREE.PerspectiveCamera(75, VIEW_W / VIEW_H, 0.05, 40);
    this.scene.fog = new THREE.Fog(0x000000, 4, 16);
    this.scene.add(this.levelGroup);
    this.scene.add(this.spriteGroup);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  }

  dispose(): void {
    this.canvas.remove();
    this.renderer.dispose();
  }

  /** Rebuild level geometry for a new mission. */
  buildLevel(map: WorldMap, _def: MapDef): void {
    this.levelGroup.clear();
    this.spriteGroup.clear();
    this.spriteMeshes.clear();
    this.projMeshes = [];

    const matCache = new Map<string, THREE.MeshBasicMaterial>();
    const mat = (tex: string) => {
      let m = matCache.get(tex);
      if (!m) {
        m = new THREE.MeshBasicMaterial({
          map: textureRegistry.require(tex),
          vertexColors: true,
        });
        matCache.set(tex, m);
      }
      return m;
    };

    // merge boxes per texture for walls/doors
    this.doorMeshes.clear();

    const byTex = new Map<string, { geo: THREE.BoxGeometry[]; shade: number[] }>();
    const doorGeos = new Map<string, THREE.BoxGeometry[]>();
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const cell = map.cellAt(tx, ty);
        if (!cell) continue;
        if (cell.kind === 'door') {
          if (!map.isDoorOpen(cell.doorId ?? '')) {
            const g = new THREE.BoxGeometry(1, 1, 1);
            g.translate(tx + 0.5, 0.5, ty + 0.5);
            const list = doorGeos.get(cell.doorId ?? `d${tx},${ty}`) ?? [];
            list.push(g);
            doorGeos.set(cell.doorId ?? `d${tx},${ty}`, list);
          }
          continue;
        }
        if (cell.kind === 'wall') {
          const g = new THREE.BoxGeometry(1, 1, 1);
          g.translate(tx + 0.5, 0.5, ty + 0.5);
          let e = byTex.get(cell.tex);
          if (!e) {
            e = { geo: [], shade: [] };
            byTex.set(cell.tex, e);
          }
          e.geo.push(g);
          e.shade.push(map.lightAt(tx, ty));
        }
      }
    }
    for (const [doorId, geos] of doorGeos) {
      const merged = mergeGeos(geos, geos.map(() => 1));
      const mesh = new THREE.Mesh(merged, mat('door'));
      this.levelGroup.add(mesh);
      this.doorMeshes.set(doorId, mesh);
    }
    for (const [tex, { geo, shade }] of byTex) {
      const merged = mergeGeos(geo, shade);
      this.levelGroup.add(new THREE.Mesh(merged, mat(tex)));
    }

    // floors & ceilings
    const floorGeos: { geo: THREE.PlaneGeometry; shade: number }[] = [];
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        const cell = map.cellAt(tx, ty);
        if (!cell || cell.kind === 'wall') continue;
        const light = map.lightAt(tx, ty);
        const fg = new THREE.PlaneGeometry(1, 1);
        fg.rotateX(-Math.PI / 2);
        fg.translate(tx + 0.5, 0, ty + 0.5);
        floorGeos.push({ geo: fg, shade: light });
        const cg = new THREE.PlaneGeometry(1, 1);
        cg.rotateX(Math.PI / 2);
        cg.translate(tx + 0.5, 1, ty + 0.5);
        floorGeos.push({ geo: cg, shade: light * 0.6 });
      }
    }
    const floorMerged = mergeGeos(
      floorGeos.map((f) => f.geo),
      floorGeos.map((f) => f.shade),
    );
    this.levelGroup.add(new THREE.Mesh(floorMerged, mat('floor')));

  }

  private doorMeshes = new Map<string, THREE.Mesh>();

  /** Remove the mesh for an opened door. */
  setDoorOpen(doorId: string): void {
    const mesh = this.doorMeshes.get(doorId);
    if (mesh) {
      this.levelGroup.remove(mesh);
      this.doorMeshes.delete(doorId);
    }
  }

  syncEntities(entities: Entity[], projectiles: Projectile[]): void {
    const seen = new Set<string>();
    for (const e of entities) {
      if (!e.alive) continue;
      seen.add(e.def.id);
      let sp = this.spriteMeshes.get(e.def.id);
      if (!sp) {
        const texId = e.infected ? 'workstation-infected' : e.def.sprite;
        const m = new THREE.SpriteMaterial({
          map: spriteRegistry.get(texId) ?? spriteRegistry.require('npc-m'),
          transparent: true,
          alphaTest: 0.1,
        });
        sp = new THREE.Sprite(m);
        sp.scale.set(0.9, 0.9, 1);
        this.spriteGroup.add(sp);
        this.spriteMeshes.set(e.def.id, sp);
      }
      // refresh infected texture when cleaned
      const wantTex = e.infected ? 'workstation-infected' : e.def.sprite;
      const cur = (sp.material as THREE.SpriteMaterial).map;
      const want = spriteRegistry.get(wantTex);
      if (want && cur !== want) (sp.material as THREE.SpriteMaterial).map = want;
      sp.position.set(e.x, 0.45, e.y);
    }
    for (const [id, sp] of [...this.spriteMeshes]) {
      if (!seen.has(id)) {
        this.spriteGroup.remove(sp);
        this.spriteMeshes.delete(id);
      }
    }

    // projectiles as small glowing spheres
    while (this.projMeshes.length < projectiles.length) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x33ccff }),
      );
      this.spriteGroup.add(m);
      this.projMeshes.push(m);
    }
    for (let i = 0; i < this.projMeshes.length; i++) {
      const mesh = this.projMeshes[i];
      const p = projectiles[i];
      if (p && p.alive) {
        mesh.visible = true;
        mesh.position.set(p.x, 0.5, p.y);
      } else {
        mesh.visible = false;
      }
    }
  }

  render(player: Player): void {
    this.camera.position.set(player.x, 0.5 + Math.sin(player.bob) * 0.02, player.y);
    this.camera.rotation.set(0, -player.angle - Math.PI / 2, 0, 'YXZ');
    this.renderer.render(this.scene, this.camera);
  }
}

/** Merge a list of translated geos, assigning a flat vertex shade per geo. */
function mergeGeos(
  geos: (THREE.BoxGeometry | THREE.PlaneGeometry)[],
  shades: number[],
): THREE.BufferGeometry {
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  let base = 0;
  geos.forEach((g, i) => {
    const shade = shades[i] ?? 1;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    const index = g.getIndex();
    for (let v = 0; v < p.count; v++) {
      pos.push(p.getX(v), p.getY(v), p.getZ(v));
      norm.push(n.getX(v), n.getY(v), n.getZ(v));
      uv.push(u.getX(v), u.getY(v));
      col.push(shade, shade, shade);
    }
    if (index) {
      for (let k = 0; k < index.count; k++) idx.push(base + index.getX(k));
    } else {
      for (let v = 0; v < p.count; v++) idx.push(base + v);
    }
    base += p.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}
