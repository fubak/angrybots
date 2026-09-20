import { clamp } from '../math';

/** 0–1 worry when a flying bot is closing on a pig (F01). */
export function computePigThreat(
  botX: number,
  botY: number,
  botVx: number,
  botVy: number,
  pigX: number,
  pigY: number
): number {
  const dx = pigX - botX;
  const dy = pigY - botY;
  const dist = Math.hypot(dx, dy);
  if (dist > 4.2) return 0;
  const speed = Math.hypot(botVx, botVy);
  if (speed < 2.5) return 0;
  const toward = (dx * botVx + dy * botVy) / (dist * speed + 1e-4);
  if (toward < 0.25) return 0;
  return clamp(((4.2 - dist) / 4.2) * toward, 0, 1);
}
