import * as THREE from 'three';
import { clamp } from '../math';

type ParticleKind = 'debris' | 'dust' | 'spark';

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: THREE.Vector3;
  kind: ParticleKind;
}

export class JuiceSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;
  private debrisGeo: THREE.BoxGeometry;
  private dustGeo: THREE.PlaneGeometry;
  private sparkGeo: THREE.OctahedronGeometry;
  private materials = new Map<number, THREE.MeshBasicMaterial>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.debrisGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    this.dustGeo = new THREE.PlaneGeometry(0.35, 0.35);
    this.sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
  }

  private materialFor(color: number) {
    let mat = this.materials.get(color);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      this.materials.set(color, mat);
    }
    return mat;
  }

  burst(position: THREE.Vector3, color: number, count = 12) {
    for (let i = 0; i < count; i++) {
      const mat = this.materialFor(color).clone();
      const mesh = new THREE.Mesh(this.debrisGeo, mat);
      mesh.position.copy(position);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 7,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 2.5
      );
      const life = 1.1 + Math.random() * 0.65;
      this.particles.push({
        mesh,
        vel,
        life,
        maxLife: life,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
        kind: 'debris',
      });
    }
  }

  /** Scaled impact feedback: dust on taps, debris + sparks on heavy hits. */
  impact(position: THREE.Vector3, strength: number, color: number) {
    const s = clamp(strength, 0, 1);
    if (s < 0.08) return;

    const dustCount = Math.floor(2 + s * 6);
    for (let i = 0; i < dustCount; i++) {
      const mesh = new THREE.Mesh(
        this.dustGeo,
        this.materialFor(0xccbbaa)
      );
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.4;
      mesh.position.y += (Math.random() - 0.5) * 0.2;
      mesh.rotation.z = Math.random() * Math.PI;
      this.scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        Math.random() * 1.5 + 0.5,
        0
      );
      const life = 0.35 + Math.random() * 0.25;
      this.particles.push({
        mesh,
        vel,
        life,
        maxLife: life,
        spin: new THREE.Vector3(0, 0, (Math.random() - 0.5) * 4),
        kind: 'dust',
      });
    }

    if (s > 0.35) {
      const debris = Math.floor(4 + s * 14);
      this.burst(position, color, debris);
    }

    if (s > 0.65) {
      const sparks = Math.floor(3 + s * 8);
      for (let i = 0; i < sparks; i++) {
        const mesh = new THREE.Mesh(
          this.sparkGeo,
          this.materialFor(0xfff4a8)
        );
        mesh.position.copy(position);
        this.scene.add(mesh);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          Math.random() * 8 + 3,
          (Math.random() - 0.5) * 3
        );
        const life = 0.25 + Math.random() * 0.2;
        this.particles.push({
          mesh,
          vel,
          life,
          maxLife: life,
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            0
          ),
          kind: 'spark',
        });
      }
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.kind === 'debris') {
        p.vel.y -= 22 * dt;
        p.vel.multiplyScalar(1 - dt * 0.8);
      } else if (p.kind === 'dust') {
        p.vel.y += 1.2 * dt;
        p.vel.multiplyScalar(1 - dt * 2.5);
      } else {
        p.vel.y -= 12 * dt;
        p.vel.multiplyScalar(1 - dt * 1.5);
      }

      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;

      const fade = clamp(p.life / p.maxLife, 0, 1);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (p.kind === 'dust') {
        p.mesh.scale.setScalar(0.4 + fade * 0.9);
        mat.opacity = fade * 0.55;
      } else if (p.kind === 'spark') {
        p.mesh.scale.setScalar(fade * 1.2);
        mat.opacity = fade;
      } else {
        p.mesh.scale.setScalar(0.45 + fade * 0.75);
        mat.opacity = 0.55 + fade * 0.45;
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        const mat = p.mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
