import * as THREE from 'three';
import { damp, clamp } from '../math';
import { SIDE_VIEW, WORLD_BOUNDS } from '../config';
import type { SlingPhase } from './SlingSystem';

const STRUCTURE_FOCUS = new THREE.Vector3(5.35, 2.4, 0);
export class CameraRig {
  private readonly levelCenter = new THREE.Vector3(
    SIDE_VIEW.centerX,
    SIDE_VIEW.centerY,
    0
  );
  private target = new THREE.Vector3(
    SIDE_VIEW.centerX,
    SIDE_VIEW.centerY,
    SIDE_VIEW.cameraZ
  );
  private look = new THREE.Vector3(
    SIDE_VIEW.centerX,
    SIDE_VIEW.centerY,
    0
  );
  private shake = 0;
  private shakeSeed = 0;
  private zoomPulse = 0;
  /** 0 → 1 level reveal pan from fort to sling framing. */
  private reveal = 1;
  private reducedMotion = false;
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private readonly frameCenter = new THREE.Vector3();
  private readonly leadDir = new THREE.Vector3(1, 0, 0);
  private readonly zeroVel = new THREE.Vector3();
  private camera: THREE.Camera;
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    camera.position.copy(this.target);
    camera.lookAt(this.look);
  }

  setFramingCenter(x: number, y: number) {
    this.levelCenter.set(x, y, 0);
  }

  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
    if (enabled) this.reveal = 1;
  }

  /** Gate 2: brief level reveal before aiming (skipped when reduced motion). */
  playLevelReveal() {
    this.reveal = this.reducedMotion ? 1 : 0;
  }

  isRevealComplete() {
    return this.reveal >= 1;
  }

  addShake(amount: number) {
    if (this.reducedMotion) return;
    this.shake = Math.min(1.2, this.shake + amount);
    this.shakeSeed += 1.7;
    this.zoomPulse = Math.max(this.zoomPulse, amount * 0.35);
  }

  shakeFromImpulse(impulse: number, cap = 0.55) {
    const t = clamp((impulse - 4) / 14, 0, 1);
    if (t <= 0) return;
    this.addShake(t * cap);
  }

  update(
    dt: number,
    phase: SlingPhase,
    focus: THREE.Vector3,
    velocity?: THREE.Vector3,
    slingDragging = false,
    destructionHold = false,
    resolveTimer = 0
  ) {
    const vel = velocity ?? this.zeroVel;
    const speed = vel.length();
    const z = SIDE_VIEW.cameraZ;

    this.desiredPos.set(this.levelCenter.x, this.levelCenter.y, z);
    this.desiredLook.copy(this.levelCenter);

    if (this.reveal < 1 && phase !== 'flying') {
      this.reveal = Math.min(1, this.reveal + dt * 0.72);
    }
    const revealU = this.reveal * this.reveal * (3 - 2 * this.reveal);
    if (revealU < 1 && phase !== 'flying') {
      const fromX = STRUCTURE_FOCUS.x + 0.6;
      const fromY = STRUCTURE_FOCUS.y + 0.85;
      this.desiredPos.x = fromX + (this.desiredPos.x - fromX) * revealU;
      this.desiredPos.y = fromY + (this.desiredPos.y - fromY) * revealU;
      this.desiredLook.lerp(STRUCTURE_FOCUS, 1 - revealU);
    }

    if (phase === 'flying') {
      const lead = clamp(speed * 0.07, 0, 2);
      if (speed > 0.5) {
        this.leadDir.copy(vel).normalize();
      } else {
        this.leadDir.set(1, 0, 0);
      }

      this.frameCenter.copy(focus).lerp(STRUCTURE_FOCUS, 0.15);
      this.frameCenter.x += this.leadDir.x * lead;
      this.frameCenter.y = clamp(
        this.frameCenter.y + this.leadDir.y * lead * 0.45,
        WORLD_BOUNDS.minY + 1.5,
        WORLD_BOUNDS.maxY
      );

      this.desiredPos.set(this.frameCenter.x + 0.8, this.frameCenter.y + 0.35, z);
      this.desiredLook.set(this.frameCenter.x, this.frameCenter.y - 0.15, 0);
    }

    if (destructionHold && phase !== 'flying') {
      const hold = clamp(1 - (resolveTimer - 0.6) / 1.8, 0, 1);
      const structX = STRUCTURE_FOCUS.x + 0.45;
      const structY = STRUCTURE_FOCUS.y + 0.35;
      this.desiredPos.x += (structX - this.desiredPos.x) * hold * 0.92;
      this.desiredPos.y += (structY - this.desiredPos.y) * hold * 0.92;
      this.desiredLook.lerp(STRUCTURE_FOCUS, hold * 0.88);
    }

    const lockAimCam =
      (phase === 'aiming' || phase === 'coiling') && slingDragging;
    const posLambda = lockAimCam ? 48 : phase === 'flying' ? 5 : 3.5;
    const lookLambda = lockAimCam ? 48 : phase === 'flying' ? 5.5 : 4;

    this.target.x = damp(this.target.x, this.desiredPos.x, posLambda, dt);
    this.target.y = damp(this.target.y, this.desiredPos.y, posLambda, dt);
    this.target.z = z;
    this.look.x = damp(this.look.x, this.desiredLook.x, lookLambda, dt);
    this.look.y = damp(this.look.y, this.desiredLook.y, lookLambda, dt);
    this.look.z = 0;

    const shakeAmt = this.shake;
    const t = performance.now() * 0.001;
    const sx =
      (Math.sin(t * 42 + this.shakeSeed) * 0.6 +
        Math.sin(t * 67 + this.shakeSeed * 2) * 0.4) *
      shakeAmt;
    const sy =
      (Math.cos(t * 38 + this.shakeSeed) * 0.6 +
        Math.sin(t * 59 + this.shakeSeed * 1.3) * 0.4) *
      shakeAmt;

    this.shake = damp(this.shake, 0, 14, dt);
    this.zoomPulse = damp(this.zoomPulse, 0, 10, dt);

    this.camera.position.set(this.target.x + sx, this.target.y + sy, z);
    this.camera.lookAt(this.look);
  }
}
