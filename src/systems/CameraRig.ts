import * as THREE from 'three';
import { damp, clamp } from '../math';
import { SIDE_VIEW, WORLD_BOUNDS } from '../config';
import type { SlingPhase } from './SlingSystem';

const STRUCTURE_FOCUS = new THREE.Vector3(5.35, 2.4, 0);
const LEVEL_CENTER = new THREE.Vector3(
  SIDE_VIEW.centerX,
  SIDE_VIEW.centerY,
  0
);

export class CameraRig {
  private target = new THREE.Vector3(
    LEVEL_CENTER.x,
    LEVEL_CENTER.y,
    SIDE_VIEW.cameraZ
  );
  private look = new THREE.Vector3().copy(LEVEL_CENTER);
  private shake = 0;
  private shakeSeed = 0;
  private zoomPulse = 0;
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private readonly frameCenter = new THREE.Vector3();
  private readonly leadDir = new THREE.Vector3(1, 0, 0);
  private readonly zeroVel = new THREE.Vector3();
  private camera: THREE.Camera;
  private readonly ortho: THREE.OrthographicCamera | null;
  private readonly baseFrustum: number;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.ortho =
      camera instanceof THREE.OrthographicCamera ? camera : null;
    this.baseFrustum = SIDE_VIEW.frustumHeight;
    camera.position.copy(this.target);
    camera.lookAt(this.look);
  }

  addShake(amount: number) {
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
    slingDragging = false
  ) {
    const vel = velocity ?? this.zeroVel;
    const speed = vel.length();
    const z = SIDE_VIEW.cameraZ;

    this.desiredPos.set(LEVEL_CENTER.x, LEVEL_CENTER.y, z);
    this.desiredLook.copy(LEVEL_CENTER);

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

    if (this.ortho) {
      const aspect =
        (this.ortho.right - this.ortho.left) /
        (this.ortho.top - this.ortho.bottom);
      const h = this.baseFrustum * (1 - this.zoomPulse * 0.04);
      const w = h * aspect;
      this.ortho.left = -w / 2;
      this.ortho.right = w / 2;
      this.ortho.top = h / 2;
      this.ortho.bottom = -h / 2;
      this.ortho.updateProjectionMatrix();
    }

    this.camera.position.set(this.target.x + sx, this.target.y + sy, z);
    this.camera.lookAt(this.look);
  }
}
