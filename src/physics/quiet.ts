import type { World } from 'planck';
import { TUNING } from '../config/tuning';
import { entityUserData } from '../entities/types';

export function isQuiet(world: World): boolean {
  const lin = TUNING.quiet.lin;
  const ang = TUNING.quiet.ang;
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic() || !b.isAwake()) continue;
    const e = entityUserData(b);
    if (!e || e.kind === 'fragment' || e.kind === 'ground' || e.kind === 'terrain') continue;
    if (e.kind !== 'block' && e.kind !== 'pig' && e.kind !== 'bot') continue;
    const v = b.getLinearVelocity();
    if (Math.hypot(v.x, v.y) >= lin) return false;
    if (Math.abs(b.getAngularVelocity()) >= ang) return false;
  }
  return true;
}
