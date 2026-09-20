import * as CANNON from 'cannon-es';
import type { Block } from '../entities/Block';
import type { Pig } from '../entities/Pig';

const MOTION_EPS = 0.35;
const ANG_EPS = 0.55;
const SLEEP_OK = CANNON.Body.SLEEPING;

export function sceneHasMeaningfulMotion(
  bot: CANNON.Body,
  blocks: Block[],
  pigs: Pig[],
  pendingExplosions: number
): boolean {
  if (pendingExplosions > 0) return true;
  if (bot.velocity.length() > MOTION_EPS) return true;
  if (Math.abs(bot.angularVelocity.z) > ANG_EPS) return true;

  for (const b of blocks) {
    if (b.dead) continue;
    if (b.isAnchored()) continue;
    if (b.body.sleepState !== SLEEP_OK && b.body.velocity.length() > MOTION_EPS) {
      return true;
    }
    if (Math.abs(b.body.angularVelocity.z) > ANG_EPS) return true;
  }
  for (const p of pigs) {
    if (p.dead) continue;
    if (p.isAnchored()) continue;
    if (p.body.sleepState !== SLEEP_OK && p.body.velocity.length() > MOTION_EPS) {
      return true;
    }
  }
  return false;
}
