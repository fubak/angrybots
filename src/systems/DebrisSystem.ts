import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MATERIAL, type BlockMaterial } from '../config';
import type { MaterialRegistry } from '../physics/materials';
import { enforcePlanarMotion } from '../physics/planar';

type Fragment = {
  mesh: THREE.Mesh;
  body: CANNON.Body;
};

/** AB-style break: the main block vanishes but physics shards stay on the field. */
export class DebrisSystem {
  private fragments: Fragment[] = [];

  spawnFromBlock(
    world: CANNON.World,
    scene: THREE.Scene,
    materials: MaterialRegistry,
    opts: {
      materialType: BlockMaterial;
      halfExtents: CANNON.Vec3;
      position: CANNON.Vec3;
      quaternion: CANNON.Quaternion;
      linearVelocity: CANNON.Vec3;
      angularVelocity: CANNON.Vec3;
      impulse: number;
    }
  ) {
    const def = MATERIAL[opts.materialType];
    const count =
      opts.materialType === 'glass'
        ? 10
        : opts.materialType === 'stone'
          ? 5
          : opts.materialType === 'explosive'
            ? 9
            : 7;

    const parentPos = new THREE.Vector3(
      opts.position.x,
      opts.position.y,
      opts.position.z
    );
    const parentQuat = new THREE.Quaternion(
      opts.quaternion.x,
      opts.quaternion.y,
      opts.quaternion.z,
      opts.quaternion.w
    );

    for (let i = 0; i < count; i++) {
      const sx =
        opts.materialType === 'glass'
          ? 0.08 + Math.random() * 0.14
          : 0.12 + Math.random() * 0.22;
      const sy =
        opts.materialType === 'glass'
          ? 0.06 + Math.random() * 0.1
          : 0.1 + Math.random() * 0.2;
      const sz = 0.12;

      const local = new THREE.Vector3(
        (Math.random() - 0.5) * opts.halfExtents.x * 1.6,
        (Math.random() - 0.5) * opts.halfExtents.y * 1.6,
        0
      );
      local.applyQuaternion(parentQuat);
      local.add(parentPos);

      const body = new CANNON.Body({
        mass: def.mass * sx * sy * sz * 0.35,
        shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)),
        material: materials.forBlock(opts.materialType),
      });
      body.position.set(local.x, local.y, 0);
      body.quaternion.copy(opts.quaternion);
      body.velocity.set(
        opts.linearVelocity.x + (Math.random() - 0.5) * 3,
        opts.linearVelocity.y + Math.random() * 2,
        0
      );
      body.angularVelocity.set(
        opts.angularVelocity.x,
        opts.angularVelocity.y,
        opts.angularVelocity.z + (Math.random() - 0.5) * 6
      );

      const burst = Math.min(opts.impulse * 0.04, 4);
      body.velocity.x += (Math.random() - 0.5) * burst;
      body.velocity.y += Math.random() * burst * 0.6;

      world.addBody(body);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        new THREE.MeshStandardMaterial({
          color: def.color,
          roughness: opts.materialType === 'glass' ? 0.15 : 0.82,
          transparent: opts.materialType === 'glass',
          opacity: opts.materialType === 'glass' ? 0.82 : 1,
        })
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      this.fragments.push({ mesh, body });
    }
  }

  update() {
    for (const f of this.fragments) {
      enforcePlanarMotion(f.body);
      f.mesh.position.copy(f.body.position as unknown as THREE.Vector3);
      f.mesh.quaternion.copy(f.body.quaternion as unknown as THREE.Quaternion);
    }
  }

  get fragmentCount() {
    return this.fragments.length;
  }

  hasMotion(): boolean {
    for (const f of this.fragments) {
      if (f.body.velocity.length() > 0.32) return true;
      if (Math.abs(f.body.angularVelocity.z) > 0.5) return true;
    }
    return false;
  }

  clear(world: CANNON.World, scene: THREE.Scene) {
    for (const f of this.fragments) {
      world.removeBody(f.body);
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      (f.mesh.material as THREE.Material).dispose();
    }
    this.fragments = [];
  }
}
