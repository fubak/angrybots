import * as CANNON from 'cannon-es';
import {
  GROK_BOT_MASS,
  SLING_LAUNCH_SPEED_FLOOR,
  SLING_MAX_LAUNCH_SPEED,
  SLING_MAX_PULL,
  SLING_MIN_LAUNCH_LIFT,
  SLING_POWER,
  SLING_POWER_EXPONENT,
} from '../config';
import { clamp } from '../math';
import { launchSpeedFromPull } from './launchCurve';

/** Shared launch impulse from effective pull (matches SlingSystem.computeLaunchImpulse). */
export function launchImpulseFromEffectivePull(
  effX: number,
  effY: number,
  releaseSnapMul = 1
): CANNON.Vec3 {
  const len = Math.hypot(effX, effY);
  if (len < 1e-4) return new CANNON.Vec3(0, 0, 0);
  const t = clamp(len / SLING_MAX_PULL, 0, 1);
  let speed = launchSpeedFromPull(
    t,
    SLING_POWER,
    SLING_POWER_EXPONENT,
    SLING_MAX_LAUNCH_SPEED,
    SLING_LAUNCH_SPEED_FLOOR
  );
  speed *= releaseSnapMul;
  speed = Math.min(speed, SLING_MAX_LAUNCH_SPEED);
  let nx = -effX / len;
  let ny = -effY / len;
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
