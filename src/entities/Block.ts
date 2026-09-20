import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MATERIAL, type BlockMaterial } from '../config';
import type { MaterialRegistry } from '../physics/materials';
import { enforcePlanarMotion } from '../physics/planar';
import type { JuiceSystem } from '../systems/JuiceSystem';
import {
  explosiveBlockMaterial,
  woodBlockMaterial,
} from '../visuals/abTextures';

export class Block {
  readonly mesh: THREE.Mesh;
  readonly body: CANNON.Body;
  hp: number;
  readonly maxHp: number;
  readonly materialType: BlockMaterial;
  dead = false;
  /** Main collider removed; shards or fade handled separately. */
  private retiredFromPlay = false;
  private anchored = true;
  private readonly dynamicMass: number;
  private readonly restPos = new CANNON.Vec3();
  private readonly restQuat = new CANNON.Quaternion();
  readonly halfExtents: CANNON.Vec3;
  private flashTimer = 0;
  private readonly healthyColor = new THREE.Color();
  private readonly splinterColor = new THREE.Color();

  constructor(
    world: CANNON.World,
    scene: THREE.Scene,
    materialType: BlockMaterial,
    size: THREE.Vector3,
    position: THREE.Vector3,
    rotation: number,
    materials: MaterialRegistry
  ) {
    const def = MATERIAL[materialType];
    this.materialType = materialType;
    this.hp = def.hp;
    this.maxHp = def.hp;

    this.body = new CANNON.Body({
      mass: def.mass * size.x * size.y * size.z,
      shape: new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      ),
      material: materials.forBlock(materialType),
    });
    this.halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    this.dynamicMass = this.body.mass;
    this.body.position.set(position.x, position.y, position.z);
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotation);
    this.restPos.copy(this.body.position);
    this.restQuat.copy(this.body.quaternion);
    world.addBody(this.body);

    let surface: THREE.MeshStandardMaterial;
    if (materialType === 'wood') {
      surface = woodBlockMaterial();
    } else if (materialType === 'explosive') {
      surface = explosiveBlockMaterial();
    } else {
      surface = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: materialType === 'glass' ? 0.1 : 0.85,
        metalness: materialType === 'stone' ? 0.2 : 0,
        transparent: materialType === 'glass',
        opacity: materialType === 'glass' ? 0.75 : 1,
      });
    }
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), surface);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.healthyColor.setHex(def.color);
    this.splinterColor.setHex(def.splinterColor);
  }

  lockPhysics() {
    this.anchored = true;
    this.restPos.copy(this.body.position);
    this.restQuat.copy(this.body.quaternion);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.type = CANNON.Body.STATIC;
  }

  wakeFromBotHit() {
    this.forceWake();
  }

  forceWake() {
    if (!this.anchored) return;
    this.anchored = false;
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.mass = this.dynamicMass;
    this.body.updateMassProperties();
    this.body.wakeUp();
  }

  pinIfAnchored() {
    if (!this.anchored) return;
    this.body.position.copy(this.restPos);
    this.body.quaternion.copy(this.restQuat);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  isAnchored() {
    return this.anchored;
  }

  private bodyRemovalQueued = false;

  /** Hide mesh immediately; body removed after physics step (avoids Cannon mid-step crashes). */
  retireFromPlay() {
    if (this.retiredFromPlay) return;
    this.retiredFromPlay = true;
    this.bodyRemovalQueued = true;
    this.mesh.visible = false;
  }

  isRetired() {
    return this.retiredFromPlay;
  }

  consumeBodyRemovalQueue() {
    if (!this.bodyRemovalQueued) return false;
    this.bodyRemovalQueued = false;
    return true;
  }

  sync(dt: number) {
    if (this.dead || this.retiredFromPlay) return;
    enforcePlanarMotion(this.body);
    this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
    this.mesh.quaternion.copy(this.body.quaternion as unknown as THREE.Quaternion);

    const t = this.hp / this.maxHp;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;

    if (this.materialType === 'glass') {
      mat.opacity = 0.45 + t * 0.35;
      mat.emissive.setHex(t < 0.45 ? 0x88ccff : 0x000000);
      mat.emissiveIntensity = t < 0.45 ? (0.45 - t) * 0.35 : 0;
    } else if (this.materialType === 'wood') {
      this.mesh.scale.setScalar(0.96 + t * 0.04);
      mat.color.copy(this.splinterColor).lerp(this.healthyColor, t);
    } else if (this.materialType === 'explosive') {
      mat.emissiveIntensity = 0.28 + (1 - t) * 0.55 + Math.sin(performance.now() * 0.008) * 0.08;
    } else {
      this.mesh.scale.setScalar(0.99 + t * 0.01);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const flash = this.flashTimer / 0.12;
      if (this.materialType === 'stone') {
        mat.emissive.setHex(0x333333);
        mat.emissiveIntensity = flash * 0.25;
      } else if (this.materialType === 'wood') {
        mat.emissive.setHex(0xff6600);
        mat.emissiveIntensity = flash * 0.55;
      } else {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = flash * 0.7;
      }
      if (this.flashTimer <= 0) mat.emissiveIntensity = 0;
    }
  }

  applyDamage(amount: number, impulse = 0) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 0.12;

    if (this.materialType === 'stone' && impulse > 10) {
      this.body.velocity.y -= 0.15;
    }
    if (this.materialType === 'glass' && impulse > 6) {
      this.body.angularVelocity.z += (Math.random() - 0.5) * 2.5;
    }

    if (this.hp <= 0) this.dead = true;
  }

  /** Material-specific debris burst (wood splinters, glass shards, stone chunks). */
  playBreakJuice(juice: JuiceSystem, position: THREE.Vector3, impulse: number) {
    const def = MATERIAL[this.materialType];
    const strength = Math.min(impulse / 14, 1.2);

    if (this.materialType === 'wood') {
      juice.burst(position, def.color, def.breakDebris);
      juice.burst(position, def.splinterColor, Math.floor(def.breakDebris * 0.55));
      juice.impact(position, strength * 0.65, def.splinterColor);
    } else if (this.materialType === 'glass') {
      juice.burst(position, def.color, def.breakDebris);
      juice.burst(position, def.splinterColor, Math.floor(def.breakDebris * 0.4));
      juice.impact(position, Math.max(strength, 0.85), def.color);
    } else if (this.materialType === 'explosive') {
      juice.burst(position, 0xff6622, def.breakDebris);
      juice.burst(position, 0xffee44, Math.floor(def.breakDebris * 0.65));
      juice.impact(position, Math.max(strength, 1.1), 0xff4400);
    } else {
      juice.burst(position, def.color, def.breakDebris);
      juice.burst(position, def.splinterColor, Math.floor(def.breakDebris * 0.35));
      juice.impact(position, strength * 0.45, def.color);
    }
  }

  dispose(world: CANNON.World, scene: THREE.Scene) {
    world.removeBody(this.body);
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
