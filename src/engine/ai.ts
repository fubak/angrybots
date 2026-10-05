import type { Entity, Projectile } from '../core/types';
import type { WorldMap } from './map';
import type { Player } from './player';

/**
 * Basic entity AI.
 * chase: move toward player when within aggro range; damages on contact.
 * wander: drift around the spawn tile.
 * patrol/stand: static for v0.
 */
export function updateEntities(
  entities: Entity[],
  map: WorldMap,
  player: Player,
  dt: number,
  onContact: (e: Entity) => void,
): void {
  for (const e of entities) {
    if (!e.alive) continue;
    const ai = e.def.ai ?? 'stand';
    if (ai === 'chase') {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.55) {
        onContact(e);
        continue;
      }
      if (dist < 9) {
        const speed = 1.4;
        const nx = e.x + (dx / dist) * speed * dt;
        const ny = e.y + (dy / dist) * speed * dt;
        const res = map.resolve(nx, ny, 0.3);
        e.x = res.x;
        e.y = res.y;
      }
    } else if (ai === 'wander') {
      const t = (e.state.wanderT = ((e.state.wanderT as number) ?? 0) + dt);
      if (t > 2) {
        e.state.wanderT = 0;
        e.state.wanderA = Math.random() * Math.PI * 2;
      }
      const a = (e.state.wanderA as number) ?? 0;
      const nx = e.x + Math.cos(a) * 0.5 * dt;
      const ny = e.y + Math.sin(a) * 0.5 * dt;
      if (!map.blockedF(nx, ny)) {
        e.x = nx;
        e.y = ny;
      }
    }
  }
}

/** Advance projectiles; returns those that hit an entity (first collision). */
export function updateProjectiles(
  projectiles: Projectile[],
  entities: Entity[],
  map: WorldMap,
  dt: number,
): { p: Projectile; hit: Entity | null }[] {
  const events: { p: Projectile; hit: Entity | null }[] = [];
  for (const p of projectiles) {
    if (!p.alive) continue;
    const step = p.speed * dt;
    p.x += p.dx * step;
    p.y += p.dy * step;
    p.traveled += step;
    if (p.traveled >= p.range || map.blockedF(p.x, p.y)) {
      p.alive = false;
      events.push({ p, hit: null });
      continue;
    }
    for (const e of entities) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < 0.45) {
        p.alive = false;
        events.push({ p, hit: e });
        break;
      }
    }
  }
  return events;
}
