import * as THREE from 'three';
import { DEPTH } from '../config/render';
import type { TerrainV2 } from '../levels/schema';

export type ShadowCaster = {
  /** world x */
  x: number;
  /** world y of the entity's underside (feet), used for height-above-surface fade */
  y: number;
  /** entity footprint width; blob is drawn at w * 1.1 */
  w: number;
};

const MAX = 256;
const FADE_OUT = 6;
const SURFACE_EPS = 0.5;

let sharedTex: THREE.Texture | null = null;

function blobTexture(): THREE.Texture {
  if (sharedTex) return sharedTex;
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([10, 8, 6, 90]), 1, 1);
    tex.needsUpdate = true;
    sharedTex = tex;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(10, 8, 6, 0.35)');
  g.addColorStop(0.7, 'rgba(10, 8, 6, 0.16)');
  g.addColorStop(1, 'rgba(10, 8, 6, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedTex = tex;
  return tex;
}

export class BlobShadows {
  private readonly mesh: THREE.InstancedMesh;
  private readonly fade: THREE.InstancedBufferAttribute;
  private terrain: TerrainV2[] = [];
  private readonly dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
    this.fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', this.fade);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: blobTexture() } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: `
        attribute float aFade;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vUv = uv;
          vFade = aFade;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vec4 c = texture2D(map, vUv);
          gl_FragColor = vec4(c.rgb, c.a * vFade);
        }
      `,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.renderOrder = 5;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  setTerrain(pieces: TerrainV2[]): void {
    this.terrain = pieces;
  }

  /** Highest surface at x at or below `below`; 0 = grass. */
  private surfaceY(x: number, below: number): number {
    let best = 0;
    for (const t of this.terrain) {
      if (x < t.x0 || x > t.x1) continue;
      let y = 0;
      if (t.kind === 'ramp') {
        const f = t.x1 === t.x0 ? 0 : (x - t.x0) / (t.x1 - t.x0);
        y = t.y0 + (t.y1 - t.y0) * f;
      } else {
        y = t.top;
      }
      if (y <= below + SURFACE_EPS && y > best) best = y;
    }
    return best;
  }

  update(casters: readonly ShadowCaster[]): void {
    let n = 0;
    for (const c of casters) {
      if (n >= MAX) break;
      const surf = this.surfaceY(c.x, c.y);
      const above = c.y - surf;
      const t = 1 - above / FADE_OUT;
      if (t <= 0.02) continue;
      const grow = 1 + Math.min(above, FADE_OUT) * 0.05;
      this.dummy.position.set(c.x, surf + 0.02, DEPTH.ground + 0.45);
      this.dummy.scale.set(c.w * 1.1 * grow, c.w * 0.34 * grow, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(n, this.dummy.matrix);
      this.fade.setX(n, t);
      n += 1;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.fade.needsUpdate = true;
  }
}
