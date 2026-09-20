import { clamp } from '../math';

/** Monotonic launch speed (m/s) from pull depth t ∈ [0,1]. */
export function launchSpeedFromPull(
  t: number,
  _power: number,
  exponent: number,
  maxSpeed: number,
  floorSpeed: number
): number {
  const depth = clamp(t, 0, 1);
  const speed =
    floorSpeed +
    (maxSpeed - floorSpeed) * Math.pow(depth, exponent);
  return clamp(speed, 0, maxSpeed);
}
