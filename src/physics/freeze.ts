import type { World } from 'planck';
import { Vec2 as PVec2 } from 'planck';

/** Snap every dynamic body to rest. Used by Level.settle() so the level is
 *  truly static before the first shot; unsupported bodies re-accelerate under
 *  gravity afterwards, so unstable layouts still fail the idle check. */
export function freezeDynamicBodies(world: World): void {
  const zero = PVec2.zero();
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic()) continue;
    b.setLinearVelocity(zero);
    b.setAngularVelocity(0);
  }
}
