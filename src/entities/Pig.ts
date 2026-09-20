import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { MaterialRegistry } from '../physics/materials';
import { enforcePlanarMotion } from '../physics/planar';
import { clamp, damp } from '../math';

export class Pig {
  readonly group = new THREE.Group();
  readonly body: CANNON.Body;
  dead = false;
  private popTime = 0;
  private popDuration = 0.95;
  private popActive = false;
  private popDone = false;
  private readonly popOrigin = new THREE.Vector3();
  /** Static at nest pose until struck by the bot or falling debris. */
  private anchored = true;
  private readonly dynamicMass: number;
  private readonly restPos = new CANNON.Vec3();
  private readonly restQuat = new CANNON.Quaternion();
  readonly radius = 0.55;
  /** Spawn center Y — used for fatal long falls (roof pigs). */
  readonly spawnY: number;

  constructor(
    world: CANNON.World,
    scene: THREE.Scene,
    x: number,
    y: number,
    materials: MaterialRegistry
  ) {
    this.spawnY = y;
    const r = this.radius;
    this.body = new CANNON.Body({
      mass: 1.5,
      shape: new CANNON.Sphere(r),
      material: materials.pig,
    });
    this.dynamicMass = this.body.mass;
    this.body.position.set(x, y, 0);
    this.restPos.set(x, y, 0);
    this.restQuat.copy(this.body.quaternion);
    world.addBody(this.body);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x6ecf5a,
      roughness: 0.52,
      emissive: 0x245018,
      emissiveIntensity: 0.18,
    });
    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), bodyMat);
    bodyMesh.castShadow = true;
    this.group.add(bodyMesh);
    const silhouette = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.045, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x1a4010 })
    );
    silhouette.scale.set(1, 1, 0.55);
    silhouette.renderOrder = -1;
    this.group.add(silhouette);

    const earMat = new THREE.MeshStandardMaterial({
      color: 0x5fc04a,
      roughness: 0.7,
      flatShading: true,
    });
    for (const sx of [-0.42, 0.42] as const) {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.32, 5),
        earMat
      );
      ear.position.set(sx, 0.38, 0.05);
      ear.rotation.z = sx < 0 ? 0.35 : -0.35;
      ear.rotation.x = -0.25;
      this.group.add(ear);
    }

    const snout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.15, 12),
      new THREE.MeshStandardMaterial({ color: 0x5ab84a, roughness: 0.65 })
    );
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.05, r * 0.85);
    this.group.add(snout);

    const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x3d8a32 });
    for (const nx of [-0.06, 0.06] as const) {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        nostrilMat
      );
      nostril.position.set(nx, -0.05, r * 0.92);
      this.group.add(nostril);
    }

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.32,
    });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const sx of [-0.2, 0.2] as const) {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        eyeWhiteMat
      );
      eyeWhite.position.set(sx, 0.16, r * 0.72);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 10),
        pupilMat
      );
      pupil.position.set(sx < 0 ? -0.02 : 0.02, 0.02, 0.08);
      eyeWhite.add(pupil);
      this.group.add(eyeWhite);
    }

    this.brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.05, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x4a9a3a })
    );
    this.browRestY = 0.32;
    this.brow.position.set(0, this.browRestY, r * 0.68);
    this.group.add(this.brow);

    scene.add(this.group);
  }

  lockPhysics() {
    this.anchored = true;
    this.restPos.copy(this.body.position);
    this.restQuat.copy(this.body.quaternion);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.sleep();
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
  private readonly brow: THREE.Mesh;
  private worry = 0;
  private readonly browRestY: number;

  beginDefeatPop() {
    if (this.dead) return;
    this.dead = true;
    this.popActive = true;
    this.popTime = this.popDuration;
    this.popOrigin.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    this.bodyRemovalQueued = true;
  }

  consumeBodyRemovalQueue() {
    if (!this.bodyRemovalQueued) return false;
    this.bodyRemovalQueued = false;
    return true;
  }

  isPopping() {
    return this.popActive;
  }

  isDefeatVisualDone() {
    return this.popDone;
  }

  updateDefeatPop(dt: number) {
    if (!this.popActive) return;
    this.popTime -= dt;
    const u = 1 - clamp(this.popTime / this.popDuration, 0, 1);

    let scale = 1;
    if (u < 0.22) scale = 1 + (u / 0.22) * 0.45;
    else if (u < 0.55) scale = 1.45 - ((u - 0.22) / 0.33) * 0.95;
    else scale = 0.5 - ((u - 0.55) / 0.45) * 0.28;

    this.group.position.set(
      this.popOrigin.x,
      this.popOrigin.y + Math.sin(u * Math.PI) * 0.12,
      this.popOrigin.z
    );
    this.group.rotation.z += dt * (6 + u * 4);
    this.group.scale.set(scale, Math.max(scale * 0.65, 0.15), scale);

    const fade =
      u < 0.7 ? 1 : 1 - ((u - 0.7) / 0.3) * 0.35;
    this.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!('opacity' in m)) continue;
        const std = m as THREE.MeshStandardMaterial;
        std.transparent = true;
        std.opacity = fade;
      }
    });

    if (this.popTime <= 0) {
      this.popActive = false;
      this.popDone = true;
      this.group.visible = false;
    }
  }

  updateIdleThreat(dt: number, threat01: number) {
    if (this.dead || this.popActive) return;
    this.worry = damp(this.worry, threat01, 10, dt);
    const squash = 1 + this.worry * 0.05;
    this.group.scale.set(1, squash, 1);
    this.brow.position.y = this.browRestY - this.worry * 0.06;
  }

  sync() {
    if (this.dead || this.popActive) return;
    enforcePlanarMotion(this.body);
    this.group.position.copy(this.body.position as unknown as THREE.Vector3);
    this.group.quaternion.copy(this.body.quaternion as unknown as THREE.Quaternion);
  }

  dispose(world: CANNON.World, scene: THREE.Scene) {
    world.removeBody(this.body);
    scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
        else m.dispose();
      }
    });
  }
}
