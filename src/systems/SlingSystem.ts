import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  GRAVITY,
  GROUND_CONTACT_Y,
  GROK_BOT_MASS,
  SLING_ANCHOR,
  SLING_AIM_CONE_DEG,
  SLING_GRAB_RADIUS,
  SLING_MAX_DRAG_ALONG_BONUS,
  SLING_MAX_DRAG_NDC_MIN,
  SLING_SHALLOW_ALONG_BONUS,
  SLING_SHALLOW_TIER_CAP_TRIM,
  SLING_SCREEN_MID_ALONG_CAP,
  SLING_SCREEN_MID_LEN_FRAC,
  SLING_SCREEN_SHALLOW_LEN_FRAC,
  SLING_SCREEN_PULL_CURVE,
  SLING_SCREEN_PULL_GAIN,
  SLING_TRUE_MAX_DRAW_BOOST,
  SLING_LINEAR_DAMPING,
  SLING_HALF_DRAW_CAP_TRIM,
  SLING_UPPER_MID_CAP_TRIM,
  SLING_QUARTER_MID_CAP_TRIM,
  SLING_LAUNCH_SPEED_FLOOR,
  SLING_MIN_LAUNCH_LIFT,
  SLING_MAX_LAUNCH_SPEED,
  SLING_MAX_PULL,
  SLING_MAX_PULL_DOWN,
  SLING_MAX_PULL_DOWN_DEEP_MUL,
  SLING_MIN_EFFECTIVE_PULL,
  SLING_PERCH_OFFSET,
  SLING_POWER,
  SLING_POWER_EXPONENT,
  SLING_COIL_HOLD_SEC,
  SLING_SNAP_BOOST,
  SLING_SOFT_CLAMP_START,
  WORLD_BOUNDS,
} from '../config';
import { clamp, vec2Len } from '../math';

export type SlingPhase = 'ready' | 'aiming' | 'coiling' | 'flying' | 'settled';

const TRAJ_STEPS = 80;
const TRAJ_DT = 1 / 45;
const _v2 = new THREE.Vector2();
const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();

export class SlingSystem {
  phase: SlingPhase = 'ready';
  /** World offset from anchor; at rest equals perch offset. */
  pull = new THREE.Vector2(SLING_PERCH_OFFSET.x, SLING_PERCH_OFFSET.y);
  readonly anchor = new THREE.Vector3(
    SLING_ANCHOR.x,
    SLING_ANCHOR.y,
    SLING_ANCHOR.z
  );
  readonly perchOffset = new THREE.Vector2(
    SLING_PERCH_OFFSET.x,
    SLING_PERCH_OFFSET.y
  );
  private readonly forkL = new THREE.Vector3(
    SLING_ANCHOR.x - 0.35,
    SLING_ANCHOR.y + 0.5,
    0
  );
  private readonly forkR = new THREE.Vector3(
    SLING_ANCHOR.x + 0.35,
    SLING_ANCHOR.y + 0.5,
    0
  );
  readonly bandLines: THREE.Line[] = [];
  readonly trajectory: THREE.Points;
  readonly trajectoryOutline: THREE.Points;
  readonly trajectoryLine: THREE.Line;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly planeHit = new THREE.Vector3();
  private pointerDown = false;
  private peakScreenNdcMag = 0;

  /** Peak NDC drag magnitude this aim (screen pulls only). */
  get screenDragPeakNdc() {
    return this.peakScreenNdcMag;
  }

  get isDragging() {
    return this.pointerDown;
  }
  private releaseSnapMul = 1;
  private lastPullLen = 0;
  private pullVelocity = 0;
  private readonly dragStartHit = new THREE.Vector2();
  private readonly dragStartEff = new THREE.Vector2();
  private readonly dragStartNdc = new THREE.Vector2();
  private pullFromScreen = false;
  private coilTimer = 0;
  /** 0–1 band whip/recoil after release. */
  private bandRecoil = 0;
  /** Draw tension when bands snap back to the empty perch. */
  private releaseBandTension = 0;

  private camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera;
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(3 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: 0x5c4033,
          linewidth: 2,
        })
      );
      scene.add(line);
      this.bandLines.push(line);
    }

    const trajGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAJ_STEPS * 3);
    trajGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trajectory = new THREE.Points(
      trajGeo,
      new THREE.PointsMaterial({
        color: 0xfff176,
        size: 10,
        transparent: true,
        opacity: 1,
        sizeAttenuation: false,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.trajectory.visible = false;
    this.trajectory.renderOrder = 20;
    scene.add(this.trajectory);

    const outlineGeo = new THREE.BufferGeometry();
    outlineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAJ_STEPS * 3), 3)
    );
    this.trajectoryOutline = new THREE.Points(
      outlineGeo,
      new THREE.PointsMaterial({
        color: 0x1a1a22,
        size: 14,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: false,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.trajectoryOutline.visible = false;
    this.trajectoryOutline.renderOrder = 19;
    scene.add(this.trajectoryOutline);

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TRAJ_STEPS * 3), 3)
    );
    this.trajectoryLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.trajectoryLine.visible = false;
    this.trajectoryLine.renderOrder = 18;
    scene.add(this.trajectoryLine);
  }

  bind(canvas: HTMLCanvasElement) {
    const aimZoneNdcX = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches
        ? 0.42
        : 0.28;

    canvas.addEventListener(
      'pointerdown',
      (e) => {
      if (this.phase !== 'ready') return;
      const hit = this.pointerOnPlane(e, canvas);
      if (!hit) return;
      const grabX = this.anchor.x + this.perchOffset.x;
      const grabY = this.anchor.y + this.perchOffset.y;
      const onBird =
        vec2Len(hit.x - grabX, hit.y - grabY) < SLING_GRAB_RADIUS;
      const inSlingshotZone =
        this.ndc.x < aimZoneNdcX() &&
        this.ndc.y > -0.82 &&
        this.ndc.y < 0.82;
      if (onBird || inSlingshotZone) {
        if (e.pointerType === 'touch') e.preventDefault();
        this.pointerDown = true;
        this.releaseSnapMul = 1;
        this.pullFromScreen = inSlingshotZone;
        this.dragStartHit.set(hit.x, hit.y);
        this.dragStartNdc.set(this.ndc.x, this.ndc.y);
        this.dragStartEff.copy(this.effectivePull());
        this.peakScreenNdcMag = 0;
        canvas.setPointerCapture(e.pointerId);
        this.applyPointerPullFromHit(hit.x, hit.y, 0);
      }
      },
      { passive: false }
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
      if (
        !this.pointerDown ||
        this.phase === 'coiling' ||
        this.phase === 'flying' ||
        this.phase === 'settled'
      )
        return;
      if (e.pointerType === 'touch') e.preventDefault();
      const hit = this.pointerOnPlane(e, canvas);
      if (!hit) return;
      if (this.pullFromScreen) {
        const dNdcX = this.ndc.x - this.dragStartNdc.x;
        const dNdcY = this.ndc.y - this.dragStartNdc.y;
        this.peakScreenNdcMag = Math.max(
          this.peakScreenNdcMag,
          Math.hypot(dNdcX, dNdcY)
        );
      }
      this.applyPointerPullFromHit(hit.x, hit.y, 1 / 60);
      },
      { passive: false }
    );
    const release = (e: PointerEvent) => {
      if (!this.pointerDown) return;
      this.pointerDown = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ok */
      }
      const eff = this.effectivePull();
      const effLen = eff.length();
      const tension = clamp(effLen / SLING_MAX_PULL, 0, 1);
      if (
        this.phase === 'aiming' &&
        effLen >= SLING_MIN_EFFECTIVE_PULL
      ) {
        const snap =
          tension > 0.82 && this.pullVelocity > 2.5 ? SLING_SNAP_BOOST : 1;
        this.releaseSnapMul = snap + (snap - 1) * tension;
        this.coilTimer = 0;
        this.releaseBandTension = tension;
        this.bandRecoil = 1;
        this.phase = 'coiling';
      } else {
        this.resetPull();
      }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  /** Displacement from perch — zero when bird sits on the fork. */
  effectivePull(out = new THREE.Vector2()): THREE.Vector2 {
    return out.set(
      this.pull.x - this.perchOffset.x,
      this.pull.y - this.perchOffset.y
    );
  }

  computeLaunchImpulse(): CANNON.Vec3 {
    const eff = this.effectivePull(_v2);
    const len = eff.length();
    if (len < 1e-4) {
      return new CANNON.Vec3(0, 0, 0);
    }
    const t = clamp(len / SLING_MAX_PULL, 0, 1);
    const curve = Math.pow(t, SLING_POWER_EXPONENT);
    const rawSpeed = SLING_POWER * curve * this.releaseSnapMul;
    let speedCap =
      SLING_LAUNCH_SPEED_FLOOR +
      (SLING_MAX_LAUNCH_SPEED - SLING_LAUNCH_SPEED_FLOOR) *
        Math.pow(t, 0.72);
    const shallowScreen =
      this.pullFromScreen &&
      this.peakScreenNdcMag > 0.02 &&
      this.peakScreenNdcMag < 0.45;
    if (shallowScreen) {
      /** t≈0.55–0.57: skip half-draw (and quarter-mid) caps; shallow trim only vs h/m. */
      speedCap *= SLING_SHALLOW_TIER_CAP_TRIM;
    } else if (t >= 0.28 && t < 0.55) {
      speedCap *= SLING_QUARTER_MID_CAP_TRIM;
    } else if (t >= 0.5 && t <= 0.72) {
      speedCap *= SLING_HALF_DRAW_CAP_TRIM;
    } else if (t >= 0.69 && t < 0.85) {
      speedCap *= SLING_UPPER_MID_CAP_TRIM;
    }
    if (t >= 0.875) {
      speedCap *= SLING_TRUE_MAX_DRAW_BOOST;
    }
    const speed = Math.min(rawSpeed, speedCap, SLING_MAX_LAUNCH_SPEED);
    let nx = -eff.x / len;
    let ny = -eff.y / len;
    if (nx > 0.35 && ny < SLING_MIN_LAUNCH_LIFT && t > 0.15) {
      const blend = clamp((t - 0.15) / 0.85, 0, 1) * 0.65;
      const targetNy = SLING_MIN_LAUNCH_LIFT + nx * 0.08;
      ny = ny * (1 - blend) + targetNy * blend;
      const nlen = Math.hypot(nx, ny) || 1;
      nx /= nlen;
      ny /= nlen;
    }
    const m = GROK_BOT_MASS;
    return new CANNON.Vec3(nx * speed * m, ny * speed * m, 0);
  }

  /** Trajectory/HUD — matches base launch (release snap is optional bonus only). */
  previewLaunchImpulse(): CANNON.Vec3 {
    const saved = this.releaseSnapMul;
    this.releaseSnapMul = 1;
    const impulse = this.computeLaunchImpulse();
    this.releaseSnapMul = saved;
    return impulse;
  }

  tick(dt: number) {
    if (this.phase === 'coiling') {
      this.coilTimer += dt;
      if (this.coilTimer >= SLING_COIL_HOLD_SEC) {
        this.phase = 'flying';
      }
    }
    if (this.bandRecoil > 0) {
      this.bandRecoil = Math.max(0, this.bandRecoil - dt * 8.5);
    }
    if (this.phase === 'flying' || this.phase === 'settled') {
      this.releaseBandTension = Math.max(0, this.releaseBandTension - dt * 3.5);
    }
  }

  consumeLaunchImpulse(): CANNON.Vec3 {
    const impulse = this.computeLaunchImpulse();
    this.releaseSnapMul = 1;
    return impulse;
  }

  updateBands(botPos: THREE.Vector3) {
    /** AB-style: bands snap to empty perch on release; bot may still coil on perch hold. */
    const bandsOnBird = this.phase === 'aiming';
    const effLen = this.effectivePull(_v2).length();
    const pullT = clamp(effLen / SLING_MAX_PULL, 0, 1);
    const tension = bandsOnBird
      ? pullT
      : clamp(this.releaseBandTension * (0.2 + this.bandRecoil * 0.8), 0, 1);
    const sag = 0.08 + tension * 0.22;
    const recoil = this.bandRecoil;
    const targets = [this.forkL, this.forkR];
    const bandEnd = bandsOnBird
      ? botPos
      : _v3c.set(
          this.anchor.x + this.perchOffset.x,
          this.anchor.y + this.perchOffset.y,
          0
        );

    this.bandLines.forEach((line, i) => {
      const fork = targets[i];
      _v3a.set(bandEnd.x - fork.x, bandEnd.y - fork.y, 0);
      const span = _v3a.length();
      const midT = bandsOnBird ? 0.5 - recoil * 0.42 : 0.22 + recoil * 0.35;
      _v3b.copy(fork).lerp(bandEnd, midT);
      if (span > 0.01) {
        _v3a.normalize();
        const side = i === 0 ? 1 : -1;
        const sagAmt = bandsOnBird
          ? sag * (1 - recoil * 0.85) + recoil * 0.38
          : 0.06 + recoil * 0.28 + tension * 0.12;
        _v3b.x += -_v3a.y * sagAmt * side * 0.35;
        _v3b.y += _v3a.x * sagAmt * side * 0.35;
        _v3b.z = 0;
      }

      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, fork.x, fork.y, fork.z);
      pos.setXYZ(1, _v3b.x, _v3b.y, _v3b.z);
      pos.setXYZ(2, bandEnd.x, bandEnd.y, bandEnd.z);
      pos.needsUpdate = true;

      const mat = line.material as THREE.LineBasicMaterial;
      const r = 0.36 + tension * 0.45;
      const g = 0.25 - tension * 0.12;
      const b = 0.15 - tension * 0.08;
      mat.color.setRGB(r, g, b);
    });
  }

  updateTrajectory(origin: THREE.Vector3, impulse: CANNON.Vec3) {
    const effLen = this.effectivePull(_v2).length();
    if (this.phase !== 'aiming' || effLen < SLING_MIN_EFFECTIVE_PULL * 0.5) {
      this.trajectory.visible = false;
      this.trajectoryOutline.visible = false;
      this.trajectoryLine.visible = false;
      return;
    }
    this.trajectory.visible = true;
    this.trajectoryOutline.visible = true;
    this.trajectoryLine.visible = true;

    const posAttr = this.trajectory.geometry.attributes
      .position as THREE.BufferAttribute;
    const outlineAttr = this.trajectoryOutline.geometry.attributes
      .position as THREE.BufferAttribute;
    const lineAttr = this.trajectoryLine.geometry.attributes
      .position as THREE.BufferAttribute;

    let vx = impulse.x / GROK_BOT_MASS;
    let vy = impulse.y / GROK_BOT_MASS;
    let x = origin.x;
    let y = origin.y;
    const damp = Math.exp(-SLING_LINEAR_DAMPING * TRAJ_DT);
    let visible = 0;

    for (let i = 0; i < TRAJ_STEPS; i++) {
      vy += GRAVITY * TRAJ_DT;
      vx *= damp;
      vy *= damp;
      x += vx * TRAJ_DT;
      y += vy * TRAJ_DT;
      if (y >= GROUND_CONTACT_Y && x >= WORLD_BOUNDS.minX && x <= WORLD_BOUNDS.maxX) {
        posAttr.setXYZ(visible, x, y, 0.5);
        outlineAttr.setXYZ(visible, x, y, 0.5);
        lineAttr.setXYZ(visible, x, y, 0.5);
        visible++;
      }
      if (y < GROUND_CONTACT_Y && vy < 0) break;
      if (x > WORLD_BOUNDS.maxX + 2) break;
    }

    for (let i = visible; i < TRAJ_STEPS; i++) {
      posAttr.setXYZ(i, x, GROUND_CONTACT_Y, -999);
      outlineAttr.setXYZ(i, x, GROUND_CONTACT_Y, -999);
      lineAttr.setXYZ(i, x, GROUND_CONTACT_Y, -999);
    }
    posAttr.needsUpdate = true;
    outlineAttr.needsUpdate = true;
    lineAttr.needsUpdate = true;
    const drawCount = Math.max(visible, 1);
    this.trajectory.geometry.setDrawRange(0, drawCount);
    this.trajectoryOutline.geometry.setDrawRange(0, drawCount);
    this.trajectoryLine.geometry.setDrawRange(0, drawCount);

    const mat = this.trajectory.material as THREE.PointsMaterial;
    const outlineMat = this.trajectoryOutline.material as THREE.PointsMaterial;
    const lineMat = this.trajectoryLine.material as THREE.LineBasicMaterial;
    const t = clamp(effLen / SLING_MAX_PULL, 0, 1);
    mat.size = 9 + t * 4;
    outlineMat.size = mat.size + 5;
    lineMat.opacity = 0.45 + t * 0.35;
  }

  resetPull() {
    this.pull.set(this.perchOffset.x, this.perchOffset.y);
    this.phase = 'ready';
    this.trajectory.visible = false;
    this.trajectoryOutline.visible = false;
    this.trajectoryLine.visible = false;
    this.releaseSnapMul = 1;
    this.pullFromScreen = false;
    this.pullVelocity = 0;
    this.lastPullLen = 0;
    this.coilTimer = 0;
    this.bandRecoil = 0;
    this.releaseBandTension = 0;
  }

  restPosition(out = new THREE.Vector3()) {
    return out.set(
      this.anchor.x + this.perchOffset.x,
      this.anchor.y + this.perchOffset.y,
      0
    );
  }

  getStretchFactors() {
    const t = clamp(this.effectivePull(_v2).length() / SLING_MAX_PULL, 0, 1);
    const ease = t * t * (3 - 2 * t);
    return {
      squash: 1 - ease * 0.28,
      stretch: 1 + ease * 0.24,
    };
  }

  private pointerOnPlane(
    e: PointerEvent,
    canvas: HTMLCanvasElement
  ): THREE.Vector3 | null {
    this.updateNdc(e, canvas);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.ray.intersectPlane(this.dragPlane, this.planeHit)
      ? this.planeHit
      : null;
  }

  /** Screen-space AB pull (bottom-left drag) → stretch length; readable quarter/half/max. */
  private effFromScreenDrag(): { x: number; y: number } {
    const dNdcX = this.ndc.x - this.dragStartNdc.x;
    const dNdcY = this.ndc.y - this.dragStartNdc.y;
    const ndcMag = Math.hypot(dNdcX, dNdcY);
    const isDeepMax = ndcMag >= SLING_MAX_DRAG_NDC_MIN;
    let along = (-dNdcX - dNdcY) * 0.5 * SLING_SCREEN_PULL_GAIN;
    if (isDeepMax) {
      along += SLING_MAX_DRAG_ALONG_BONUS;
    } else if (ndcMag < 0.45) {
      along += SLING_SHALLOW_ALONG_BONUS;
      along = Math.min(along, SLING_SCREEN_MID_ALONG_CAP);
    } else {
      along = Math.min(along, SLING_SCREEN_MID_ALONG_CAP);
    }
    const raw = clamp(along, 0, SLING_MAX_PULL * 1.12);
    const tr = raw / SLING_MAX_PULL;
    let len = clamp(
      SLING_MAX_PULL * Math.pow(tr, SLING_SCREEN_PULL_CURVE),
      0,
      SLING_MAX_PULL
    );
    const center = (-3 * Math.PI) / 4;
    let angle = center;
    if (Math.hypot(dNdcX, dNdcY) > 0.015) {
      angle = Math.atan2(dNdcY, dNdcX);
      const halfRad = (SLING_AIM_CONE_DEG * Math.PI) / 360;
      let delta = angle - center;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      angle = clamp(delta, -halfRad, halfRad) + center;
    }
    return { x: Math.cos(angle) * len, y: Math.sin(angle) * len };
  }

  /** Delta from drag start so camera motion does not remap pull mid-aim. */
  private applyPointerPullFromHit(worldX: number, worldY: number, dt: number) {
    let effX: number;
    let effY: number;
    if (this.pullFromScreen) {
      const screen = this.effFromScreenDrag();
      effX = screen.x;
      effY = screen.y;
    } else {
      effX = this.dragStartEff.x - (worldX - this.dragStartHit.x);
      effY = this.dragStartEff.y + (worldY - this.dragStartHit.y);
    }

    const cone = this.constrainToAimCone(effX, effY);
    effX = cone.x;
    effY = cone.y;

    const preLen = vec2Len(effX, effY);
    if (this.pullFromScreen && preLen > SLING_MAX_PULL) {
      const s = SLING_MAX_PULL / preLen;
      effX *= s;
      effY *= s;
    } else if (!this.pullFromScreen) {
      const soft = this.softClampLength(effX, effY);
      effX = soft.x;
      effY = soft.y;
    }

    const preDownLen = vec2Len(effX, effY);
    const pullT = clamp(preDownLen / SLING_MAX_PULL, 0, 1);
    let maxDown = SLING_MAX_PULL_DOWN * (0.35 + 0.65 * pullT);
    const deepTier =
      this.pullFromScreen && this.peakScreenNdcMag >= SLING_MAX_DRAG_NDC_MIN;
    if (this.pullFromScreen) {
      if (deepTier) {
        maxDown *= SLING_MAX_PULL_DOWN_DEEP_MUL;
      } else {
        maxDown *= 0.96;
      }
    }
    if (effY < -maxDown) {
      const s = -maxDown / effY;
      effX *= s;
      effY = -maxDown;
    }

    if (this.pullFromScreen) {
      const lenCap = deepTier
        ? SLING_MAX_PULL
        : SLING_MAX_PULL *
          (this.peakScreenNdcMag < 0.45
            ? SLING_SCREEN_SHALLOW_LEN_FRAC
            : SLING_SCREEN_MID_LEN_FRAC);
      const len = vec2Len(effX, effY);
      if (len > lenCap) {
        const s = lenCap / len;
        effX *= s;
        effY *= s;
      }
    }

    const newLen = vec2Len(effX, effY);
    if (dt > 0) {
      this.pullVelocity = Math.abs(newLen - this.lastPullLen) / dt;
    }
    this.lastPullLen = newLen;

    this.pull.set(effX + this.perchOffset.x, effY + this.perchOffset.y);
    this.phase = 'aiming';
  }

  /** Keep stretch in the backward arc (away from structure, +X is forward). */
  private constrainToAimCone(
    effX: number,
    effY: number
  ): { x: number; y: number } {
    const halfRad = (SLING_AIM_CONE_DEG * Math.PI) / 360;
    const len = vec2Len(effX, effY);
    if (len < 1e-6) return { x: effX, y: effY };

    const angle = Math.atan2(effY, effX);
    /** Back-left-down in world (+X = toward fort). */
    const center = (-3 * Math.PI) / 4;
    let delta = angle - center;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    const clamped = clamp(delta, -halfRad, halfRad) + center;
    let x = Math.cos(clamped) * len;
    let y = Math.sin(clamped) * len;

    // Fort reach: enforce back-X only on deep draws so half/quarter pulls stay distinct.
    const minBackX = len * 0.36;
    const deepScreen =
      this.pullFromScreen &&
      this.peakScreenNdcMag >= SLING_MAX_DRAG_NDC_MIN;
    if (len >= SLING_MAX_PULL * 0.72 && x > -minBackX && !deepScreen) {
      x = -minBackX;
      const rem = Math.sqrt(Math.max(0, len * len - x * x));
      y = y <= 0 ? -rem : rem;
    }
    return { x, y };
  }

  private softClampLength(effX: number, effY: number): { x: number; y: number } {
    const len = vec2Len(effX, effY);
    if (len < 1e-6) return { x: 0, y: 0 };

    const max = SLING_MAX_PULL;
    const softStart = max * SLING_SOFT_CLAMP_START;
    if (len <= softStart) return { x: effX, y: effY };

    const hardCap = max;
    const excess = len - softStart;
    const softZone = hardCap - softStart;
    const t = 1 - Math.exp(-excess / (softZone * 0.55));
    const clampedLen = softStart + softZone * t;
    const s = clampedLen / len;
    return { x: effX * s, y: effY * s };
  }

  private updateNdc(e: PointerEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
}
