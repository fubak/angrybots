import type { Contact } from 'planck';
import { TUNING } from '../config/tuning';
import { affinity } from './affinity';
import type { BlockEntity, BotEntity, GameEntity, PigEntity } from '../entities/types';
import { entityUserData } from '../entities/types';
import { damagePoints } from '../game/Scoring';

export type ImpactEvent = {
  aId: string;
  bId: string;
  impulse: number;
  point: { x: number; y: number };
};

export type DamageCallbacks = {
  damageEnabled: () => boolean;
  onBlockDamaged: (e: BlockEntity, hpRatio: number, points: number) => void;
  onPigDamaged: (e: PigEntity, hpRatio: number) => void;
  onDestroy: (entity: BlockEntity | PigEntity) => void;
  onImpact: (ev: ImpactEvent) => void;
  onBotFirstImpact?: (bot: BotEntity) => void;
};

type PendingHit = { entity: BlockEntity | PigEntity; impulse: number; other: GameEntity | null };

export function attachDamagePipeline(
  world: import('planck').World,
  callbacks: DamageCallbacks
): { flushContacts: () => void } {
  const approach = new WeakMap<Contact, number>();
  let pending: PendingHit[] = [];
  const impactPairs: ImpactEvent[] = [];

  world.on('pre-solve', (contact) => {
    const wm = contact.getWorldManifold(null);
    if (!wm || wm.points.length === 0) return;
    const bA = contact.getFixtureA().getBody();
    const bB = contact.getFixtureB().getBody();
    let maxV = 0;
    for (const p of wm.points) {
      const vA = bA.getLinearVelocityFromWorldPoint(p);
      const vB = bB.getLinearVelocityFromWorldPoint(p);
      const vn = -((vB.x - vA.x) * wm.normal.x + (vB.y - vA.y) * wm.normal.y);
      if (vn > maxV) maxV = vn;
    }
    approach.set(contact, maxV);
  });

  world.on('post-solve', (contact, impulse) => {
    if (!callbacks.damageEnabled()) return;
    if ((approach.get(contact) ?? 0) < TUNING.minApproachSpeed) return;
    const wm = contact.getWorldManifold(null);
    if (!wm || wm.points.length === 0) return;
    const I = impulse.normalImpulses.reduce((a, b) => a + b, 0);
    const a = entityUserData(contact.getFixtureA().getBody());
    const b = entityUserData(contact.getFixtureB().getBody());
    if (!a || !b) return;
    for (const e of [a, b]) {
      if (e.kind === 'block' || e.kind === 'pig') {
        if (e.alive) pending.push({ entity: e, impulse: I, other: e === a ? b : a });
      }
    }
    if (a.kind === 'bot' && a.alive && a.firstImpactAt === null && (b.kind === 'block' || b.kind === 'pig' || b.kind === 'ground' || b.kind === 'terrain')) {
      callbacks.onBotFirstImpact?.(a);
    }
    if (b.kind === 'bot' && b.alive && b.firstImpactAt === null && (a.kind === 'block' || a.kind === 'pig' || a.kind === 'ground' || a.kind === 'terrain')) {
      callbacks.onBotFirstImpact?.(b);
    }
    if (I >= 1.0 && a.id && b.id) {
      impactPairs.push({
        aId: a.id,
        bId: b.id,
        impulse: I,
        point: wm.points[0]!,
      });
    }
  });

  function applyImpact(target: BlockEntity | PigEntity, impulse: number, other: GameEntity | null) {
    if (!target.alive) return;
    const min =
      target.kind === 'pig'
        ? TUNING.pig.minImpulse
        : TUNING.materials[target.material].minImpulse;
    if (impulse <= min) return;
    let dmg =
      (impulse - min) *
      (target.kind === 'pig' ? 1 : TUNING.materials[target.material].damageScale);
    if (other?.kind === 'bot' && target.kind === 'block') {
      dmg *= affinity(other.botKind, target.material);
    }
    const dealt = Math.min(dmg, Math.max(target.hp, 0));
    target.hp -= dmg;
    if (target.kind === 'block') {
      callbacks.onBlockDamaged(target, target.hp / target.maxHp, damagePoints(dealt));
    } else {
      callbacks.onPigDamaged(target, target.hp / target.maxHp);
    }
    if (target.hp <= 0) callbacks.onDestroy(target);
  }

  function flushContacts() {
    const agg = new Map<BlockEntity | PigEntity, { impulse: number; other: GameEntity | null }>();
    for (const hit of pending) {
      const cur = agg.get(hit.entity);
      if (!cur || hit.impulse > cur.impulse) {
        agg.set(hit.entity, { impulse: hit.impulse, other: hit.other });
      }
    }
    pending = [];
    for (const [entity, { impulse, other }] of agg) {
      applyImpact(entity, impulse, other);
    }
    impactPairs.sort((a, b) => b.impulse - a.impulse);
    const maxImpacts = 12;
    for (let i = 0; i < Math.min(maxImpacts, impactPairs.length); i++) {
      callbacks.onImpact(impactPairs[i]!);
    }
    impactPairs.length = 0;
  }

  return { flushContacts };
}

export type BotEntityRef = BotEntity;
