import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { clamp, damp } from '../math';
import type { BotProfile } from '../bots/types';
import type { MaterialRegistry } from '../physics/materials';
import { enforcePlanarMotion } from '../physics/planar';

export type GrokMood = 'idle' | 'aim' | 'fly' | 'hit';

const RADIUS = 0.58;

export class GrokBot {
  readonly group = new THREE.Group();
  readonly body: CANNON.Body;

  /** Spins with physics; face stays camera-readable on `group`. */
  private readonly rotator = new THREE.Group();
  private readonly shell: THREE.Mesh;
  private readonly bandMat: THREE.MeshStandardMaterial;
  private readonly tipMat: THREE.MeshStandardMaterial;
  private readonly eyeMatL: THREE.MeshBasicMaterial;
  private readonly eyeMatR: THREE.MeshBasicMaterial;
  private readonly face: THREE.Group;
  private readonly antenna: THREE.Group;
  private readonly eyeL: THREE.Mesh;
  private readonly eyeR: THREE.Mesh;

  private mood: GrokMood = 'idle';
  private squash = 1;
  private stretch = 1;
  private spinVel = 0;
  private hitTimer = 0;
  private hitFlash = 0;
  private blinkTimer = 0;
  private nextBlink = 2.4;
  private animTime = 0;
  private lookDir = new THREE.Vector2(0, 0);
  private profileSpeedScale = 1;

  constructor(world: CANNON.World, materials: MaterialRegistry) {
    this.body = new CANNON.Body({
      mass: 1.2,
      shape: new CANNON.Sphere(RADIUS),
      linearDamping: 0.02,
      angularDamping: 0.08,
      material: materials.grok,
    });
    this.body.position.set(-8.05, 2.35, 0);
    this.body.collisionResponse = true;
    const bodyWithCcd = this.body as CANNON.Body & {
      ccdSpeedThreshold?: number;
      ccdIterations?: number;
    };
    bodyWithCcd.ccdSpeedThreshold = 0.5;
    bodyWithCcd.ccdIterations = 8;
    world.addBody(this.body);
    this.group.add(this.rotator);

    this.shell = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x353545,
        metalness: 0.48,
        roughness: 0.38,
        emissive: 0x1a0c06,
        emissiveIntensity: 0.28,
      })
    );
    this.shell.castShadow = true;
    this.rotator.add(this.shell);

    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.018, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xff6622,
        metalness: 0.2,
        roughness: 0.55,
        emissive: 0xff4400,
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0.22,
      })
    );
    this.rotator.add(rim);

    this.bandMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff4400,
      emissiveIntensity: 0.35,
    });
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS * 0.92, 0.06, 8, 32),
      this.bandMat
    );
    band.rotation.x = Math.PI / 2;
    this.rotator.add(band);

    this.face = new THREE.Group();
    const faceZ = RADIUS + 0.04;
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x08080c });
    const pillGeo = new THREE.CapsuleGeometry(0.048, 0.24, 6, 12);
    this.eyeMatL = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    this.eyeMatR = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });

    for (const sx of [-0.17, 0.17] as const) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.34, 0.04),
        slotMat
      );
      slot.position.set(sx, 0.04, faceZ - 0.03);
      this.face.add(slot);
    }

    this.eyeL = new THREE.Mesh(pillGeo, this.eyeMatL);
    this.eyeL.position.set(-0.17, 0.04, faceZ);
    this.eyeR = new THREE.Mesh(pillGeo, this.eyeMatR);
    this.eyeR.position.set(0.17, 0.04, faceZ);
    this.face.add(this.eyeL, this.eyeR);

    this.group.add(this.face);
    this.face.renderOrder = 5;
    this.face.traverse((obj) => {
      obj.renderOrder = 5;
    });

    this.antenna = new THREE.Group();
    this.antenna.position.set(0, RADIUS + 0.05, 0);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x666677 })
    );
    stem.position.y = 0.17;
    this.antenna.add(stem);
    this.tipMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff2200,
      emissiveIntensity: 0.55,
    });
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      this.tipMat
    );
    tip.position.y = 0.36;
    this.antenna.add(tip);
    this.rotator.add(this.antenna);
  }

  setMood(m: GrokMood) {
    if (m === 'hit') {
      this.hitTimer = 0.28;
      this.hitFlash = 1;
    }
    this.mood = m;
  }

  setLookDirection(x: number, y: number) {
    this.lookDir.set(x, y);
  }

  setSquashStretch(sq: number, st: number) {
    this.squash = sq;
    this.stretch = st;
  }

  onImpact(strength: number) {
    const s = clamp(strength / 14, 0.35, 1);
    this.setMood('hit');
    this.setSquashStretch(1 + s * 0.35, 1 - s * 0.22);
    this.spinVel += (Math.random() - 0.5) * 8 * s;
  }

  /** Set at launch; used for preview-vs-live checks (not mid-flight body velocity). */
  lastLaunchVel = { vx: 0, vy: 0 };

  applyProfile(profile: BotProfile) {
    this.profileSpeedScale = profile.speedScale;
    const mass = 1.2 * profile.massScale;
    if (Math.abs(this.body.mass - mass) > 0.001) {
      this.body.mass = mass;
      this.body.updateMassProperties();
    }
    this.rotator.scale.setScalar(profile.visualScale);
    const mat = this.shell.material as THREE.MeshStandardMaterial;
    mat.color.setHex(profile.shellColor);
    mat.emissive.setHex(profile.emissive);
    mat.emissiveIntensity = profile.kind === 'dash' ? 0.42 : 0.28;
  }

  getSpeedScale() {
    return this.profileSpeedScale;
  }

  launch(impulse: CANNON.Vec3) {
    this.body.wakeUp();
    this.body.angularVelocity.set(0, 0, 0);
    const m = this.body.mass;
    const vx = impulse.x / m;
    const vy = impulse.y / m;
    this.body.velocity.set(vx, vy, 0);
    this.lastLaunchVel.vx = vx;
    this.lastLaunchVel.vy = vy;
    this.spinVel = impulse.x * 0.18 + impulse.y * 0.06;
    this.setMood('fly');
  }

  reset(pos: CANNON.Vec3) {
    this.lastLaunchVel.vx = 0;
    this.lastLaunchVel.vy = 0;
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.position.copy(pos);
    this.body.quaternion.set(0, 0, 0, 1);
    this.mood = 'idle';
    this.squash = 1;
    this.stretch = 1;
    this.hitTimer = 0;
    this.hitFlash = 0;
    this.spinVel = 0;
    this.rotator.scale.set(1, 1, 1);
    this.shell.position.set(0, 0, 0);
    this.face.position.set(0, 0, 0);
  }

  update(dt: number, camera?: THREE.Camera) {
    this.animTime += dt;
    enforcePlanarMotion(this.body);
    this.group.position.copy(this.body.position as unknown as THREE.Vector3);
    this.rotator.quaternion.copy(
      this.body.quaternion as unknown as THREE.Quaternion
    );

    if (camera) {
      this.billboardFace(camera);
    }

    const v = this.body.velocity.length();
    const idleBob =
      this.mood === 'idle' && v < 0.25
        ? Math.sin(this.animTime * 3.4) * 0.045
        : 0;
    this.shell.position.y = idleBob;
    this.face.position.y = idleBob;

    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0 && v > 1.5) this.mood = 'fly';
      else if (this.hitTimer <= 0) this.mood = 'idle';
    }
    this.hitFlash = damp(this.hitFlash, 0, 12, dt);

    let targetSx = 1;
    let targetSy = 1;
    const squashVis = 1.35;
    if (this.mood === 'aim') {
      targetSx = 1 + (this.stretch - 1) * squashVis;
      targetSy = 1 + (this.squash - 1) * squashVis;
    } else if (this.mood === 'fly' && v > 2) {
      const speedT = clamp(v / 18, 0, 1);
      const along = Math.atan2(vy, vx);
      const c = Math.cos(along);
      const s = Math.sin(along);
      targetSx =
        1 +
        speedT * 0.32 * Math.abs(c) +
        (this.stretch - 1) * 0.65 * squashVis;
      targetSy =
        1 -
        speedT * 0.22 * Math.abs(s) +
        (this.squash - 1) * 0.65 * squashVis;
    } else if (this.mood === 'hit') {
      targetSx = 1 + (this.stretch - 1) * squashVis;
      targetSy = 1 + (this.squash - 1) * squashVis;
    }

    this.rotator.scale.x = damp(this.rotator.scale.x, targetSx, 14, dt);
    this.rotator.scale.y = damp(this.rotator.scale.y, targetSy, 14, dt);
    this.rotator.scale.z = 1;
    this.face.scale.x = damp(this.face.scale.x, targetSx, 14, dt);
    this.face.scale.y = damp(this.face.scale.y, targetSy, 14, dt);
    this.face.scale.z = 1;

    this.applyEyeExpression(dt, v);
    this.applyAntennaWiggle(dt, v);
    this.applyEmissivePulse(v);

    if (this.mood === 'fly') {
      this.body.angularVelocity.z = damp(
        this.body.angularVelocity.z,
        this.spinVel,
        4,
        dt
      );
    }
  }

  /** @deprecated use update(dt) */
  syncMesh() {
    this.update(1 / 60);
  }

  private applyEyeExpression(dt: number, speed: number) {
    const shellMat = this.shell.material as THREE.MeshStandardMaterial;
    let eyeScaleX = 1;
    let eyeScaleY = 1;
    let eyeRotL = 0;
    let eyeRotR = 0;
    let eyeShiftX = 0;
    let eyeShiftY = 0;
    let eyeTint = 0xf0f0f0;

    this.blinkTimer += dt;
    let blinking = false;
    if (this.mood === 'idle' && this.blinkTimer >= this.nextBlink) {
      blinking = this.blinkTimer < this.nextBlink + 0.1;
      if (this.blinkTimer >= this.nextBlink + 0.2) {
        this.blinkTimer = 0;
        this.nextBlink = 1.8 + Math.random() * 2.8;
      }
    }

    switch (this.mood) {
      case 'aim': {
        const pullT = clamp(Math.hypot(this.lookDir.x, this.lookDir.y) / 2.2, 0, 1);
        eyeScaleX = 0.68 - pullT * 0.12;
        eyeScaleY = 1.18 + pullT * 0.08;
        const lookLen = Math.hypot(this.lookDir.x, this.lookDir.y) || 1;
        eyeShiftX = (-this.lookDir.x / lookLen) * 0.025;
        eyeShiftY = (-this.lookDir.y / lookLen) * 0.02;
        eyeTint = 0xffffff;
        break;
      }
      case 'fly': {
        if (speed > 11) {
          eyeScaleX = 1.45;
          eyeScaleY = 0.38;
        } else if (speed > 5) {
          eyeScaleX = 1.08;
          eyeScaleY = 1.22;
        } else {
          eyeScaleX = 0.95;
          eyeScaleY = 1.05;
        }
        eyeTint = 0xf5f5f5;
        break;
      }
      case 'hit': {
        eyeScaleX = 1.55;
        eyeScaleY = 0.26;
        eyeRotL = 0.42;
        eyeRotR = -0.42;
        eyeTint = 0xffffff;
        shellMat.emissiveIntensity = 0.15 + this.hitFlash * 0.45;
        break;
      }
      default: {
        eyeScaleX = 0.92;
        eyeScaleY = 1.08;
        eyeTint = 0xeaeaea;
        break;
      }
    }

    if (blinking) {
      eyeScaleY = 0.07;
      eyeScaleX = 1.05;
    }

    if (this.mood !== 'hit') {
      eyeRotL = damp(this.eyeL.rotation.z, eyeRotL, 18, dt);
      eyeRotR = damp(this.eyeR.rotation.z, eyeRotR, 18, dt);
    } else {
      this.eyeL.rotation.z = damp(this.eyeL.rotation.z, eyeRotL, 22, dt);
      this.eyeR.rotation.z = damp(this.eyeR.rotation.z, eyeRotR, 22, dt);
    }

    for (const [eye, baseX, rot] of [
      [this.eyeL, -0.17, eyeRotL],
      [this.eyeR, 0.17, eyeRotR],
    ] as const) {
      eye.scale.x = damp(eye.scale.x, eyeScaleX, 22, dt);
      eye.scale.y = damp(eye.scale.y, eyeScaleY, 22, dt);
      eye.scale.z = 1;
      eye.position.x = damp(eye.position.x, baseX + eyeShiftX, 20, dt);
      eye.position.y = damp(eye.position.y, 0.04 + eyeShiftY, 20, dt);
      if (this.mood !== 'hit') {
        eye.rotation.z = rot;
      }
    }

    this.eyeMatL.color.setHex(eyeTint);
    this.eyeMatR.color.setHex(eyeTint);
  }

  private billboardFace(camera: THREE.Camera) {
    this.face.lookAt(camera.position);
  }

  private applyAntennaWiggle(dt: number, speed: number) {
    let amp = 0.04;
    let freq = 6;
    if (this.mood === 'aim') {
      const pullT = clamp(Math.hypot(this.lookDir.x, this.lookDir.y) / 2.2, 0, 1);
      amp = 0.06 + pullT * 0.14;
      freq = 10 + pullT * 8;
    } else if (this.mood === 'fly') {
      amp = 0.08 + clamp(speed / 20, 0, 1) * 0.2;
      freq = 14 + speed * 0.6;
    } else if (this.mood === 'hit') {
      amp = 0.35 * this.hitFlash;
      freq = 28;
    }

    const wobble =
      Math.sin(this.animTime * freq) * amp +
      Math.sin(this.animTime * freq * 1.7 + 1.2) * amp * 0.35;
    this.antenna.rotation.z = damp(this.antenna.rotation.z, wobble, 18, dt);
    this.antenna.rotation.x = damp(
      this.antenna.rotation.x,
      Math.sin(this.animTime * freq * 0.85) * amp * 0.6,
      14,
      dt
    );
  }

  private applyEmissivePulse(speed: number) {
    const t = this.animTime;
    const shellMat = this.shell.material as THREE.MeshStandardMaterial;

    if (this.mood === 'idle') {
      const breathe = 0.35 + Math.sin(t * 2.5) * 0.12;
      this.bandMat.emissiveIntensity = breathe;
      this.tipMat.emissiveIntensity = 0.45 + Math.sin(t * 3.1 + 0.5) * 0.15;
      shellMat.emissiveIntensity = 0.12 + Math.sin(t * 2) * 0.04;
    } else if (this.mood === 'aim') {
      const pulse = 0.55 + Math.sin(t * 12) * 0.25;
      this.bandMat.emissiveIntensity = pulse;
      this.tipMat.emissiveIntensity = 0.7 + Math.sin(t * 16) * 0.25;
      shellMat.emissiveIntensity = 0.18 + Math.sin(t * 10) * 0.06;
    } else if (this.mood === 'fly') {
      const streak = 0.5 + clamp(speed / 16, 0, 1) * 0.45;
      this.bandMat.emissiveIntensity =
        streak + Math.sin(t * 18 + speed * 0.1) * 0.12;
      this.tipMat.emissiveIntensity =
        0.65 + clamp(speed / 12, 0, 1) * 0.5 + Math.sin(t * 24) * 0.1;
      shellMat.emissiveIntensity = 0.14 + clamp(speed / 20, 0, 1) * 0.12;
    } else if (this.mood === 'hit') {
      this.bandMat.emissiveIntensity = 0.9 + this.hitFlash * 0.8;
      this.tipMat.emissiveIntensity = 1 + this.hitFlash * 1.2;
    }
  }
}
