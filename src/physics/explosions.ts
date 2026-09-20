import planck, { type Vec2 } from 'planck';
import { TUNING } from '../config/tuning';
import type { PhysicsWorld } from './PhysicsWorld';
import type { BlockEntity, PigEntity } from '../entities/types';
import { entityUserData } from '../entities/types';

export type ExplosionHooks = {
  onExplosion: (x: number, y: number, radius: number) => void;
  onBlastDamage: (entity: BlockEntity | PigEntity, damage: number) => void;
  queueTntChain: (entity: BlockEntity) => void;
};

export function explodeAt(
  pw: PhysicsWorld,
  center: Vec2,
  radius: number,
  impulse: number,
  damage: number,
  hooks: ExplosionHooks
): void {
  hooks.onExplosion(center.x, center.y, radius);
  const aabb = {
    lowerBound: planck.Vec2(center.x - radius, center.y - radius),
    upperBound: planck.Vec2(center.x + radius, center.y + radius),
  };
  const pending: { entity: BlockEntity | PigEntity; d: number }[] = [];

  pw.world.queryAABB(aabb, (fixture) => {
    const body = fixture.getBody();
    if (!body.isDynamic()) return true;
    const e = entityUserData(body);
    if (!e || !e.alive) return true;
    if (e.kind !== 'block' && e.kind !== 'pig' && e.kind !== 'bot') return true;
    const p = body.getWorldCenter();
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return true;
    const f = 1 - dist / radius;
    let dirX = dx;
    let dirY = dy;
    if (dist > 1e-4) {
      dirX /= dist;
      dirY /= dist;
    } else {
      dirX = 0;
      dirY = 1;
    }
    body.applyLinearImpulse(planck.Vec2(dirX * impulse * f, dirY * impulse * f), p, true);
    if (e.kind === 'block' || e.kind === 'pig') {
      pending.push({ entity: e, d: damage * f });
    }
    return true;
  });

  for (const { entity, d } of pending) {
    hooks.onBlastDamage(entity, d);
  }
}

export function defaultTntExplosion(pw: PhysicsWorld, center: Vec2, hooks: ExplosionHooks): void {
  const { radius, impulse, damage } = TUNING.tnt;
  explodeAt(pw, center, radius, impulse, damage, hooks);
}
