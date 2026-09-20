import * as CANNON from 'cannon-es';
import type { Block } from '../entities/Block';
import type { Pig } from '../entities/Pig';

export type ContactContext = {
  structureWarmup: number;
  botBody: CANNON.Body;
  blocks: Block[];
  pigs: Pig[];
  onBotImpact: (impulse: number) => void;
  onBotStrikeStructure: (other: CANNON.Body, block?: Block, pig?: Pig) => void;
  onBlockDamage: (block: Block, impulse: number, botHit: boolean) => void;
  onPigStrike: (pig: Pig, impulse: number) => void;
};

function blockAt(blocks: Block[], body: CANNON.Body) {
  return blocks.find((b) => !b.dead && b.body === body);
}

function pigAt(pigs: Pig[], body: CANNON.Body) {
  return pigs.find((p) => !p.dead && p.body === body);
}

/** Impact severity from contact (always non-negative). */
export function impactFromContact(contact: CANNON.ContactEquation): number {
  const rel = contact.getImpactVelocityAlongNormal();
  return Math.abs(rel);
}

/** Min contact severity to unpin a static block/pig hit by moving debris. */
export const CHAIN_WAKE_IMPULSE = 2.4;
export const PIG_CRUSH_IMPULSE = 4.8;
export const PIG_CRUSH_KILL = 7.5;

function wakeAnchoredFromChain(
  block: Block | undefined,
  pig: Pig | undefined,
  impulse: number
) {
  if (impulse < CHAIN_WAKE_IMPULSE) return;
  if (block?.isAnchored()) block.forceWake();
  if (pig?.isAnchored()) pig.forceWake();
}

const pairCooldown = new Map<string, number>();
let frameId = 0;

export function beginContactFrame() {
  frameId += 1;
}

function dedupePair(a: CANNON.Body, b: CANNON.Body, windowFrames = 3): boolean {
  const id = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
  const last = pairCooldown.get(id);
  if (last !== undefined && frameId - last < windowFrames) return true;
  pairCooldown.set(id, frameId);
  return false;
}

export function handleCollide(
  self: CANNON.Body,
  event: { body: CANNON.Body; contact: CANNON.ContactEquation },
  ctx: ContactContext
) {
  if (ctx.structureWarmup > 0) return;
  const other = event.body;
  const impulse = impactFromContact(event.contact);
  if (impulse < 0.4) return;
  if (dedupePair(self, other)) return;

  const botHit = self === ctx.botBody || other === ctx.botBody;
  const blockSelf = blockAt(ctx.blocks, self);
  const blockOther = blockAt(ctx.blocks, other);
  const pigSelf = pigAt(ctx.pigs, self);
  const pigOther = pigAt(ctx.pigs, other);

  if (botHit && impulse > 2.5) {
    ctx.onBotImpact(impulse);
  }

  if (botHit) {
    const structBody = self === ctx.botBody ? other : self;
    const hitBlock = blockAt(ctx.blocks, structBody);
    const hitPig = pigAt(ctx.pigs, structBody);
    ctx.onBotStrikeStructure(structBody, hitBlock, hitPig);
  }

  if (blockSelf && !blockSelf.isAnchored()) {
    ctx.onBlockDamage(blockSelf, impulse, botHit);
  }
  if (blockOther && !blockOther.isAnchored()) {
    ctx.onBlockDamage(blockOther, impulse, botHit);
  }

  if (!botHit) {
    if (blockSelf && !blockSelf.isAnchored()) {
      wakeAnchoredFromChain(blockOther, pigOther, impulse);
    }
    if (blockOther && !blockOther.isAnchored()) {
      wakeAnchoredFromChain(blockSelf, pigSelf, impulse);
    }
    if (pigSelf && !pigSelf.isAnchored()) {
      wakeAnchoredFromChain(blockOther, undefined, impulse);
    }
    if (pigOther && !pigOther.isAnchored()) {
      wakeAnchoredFromChain(blockSelf, undefined, impulse);
    }
  }

  const pig = pigSelf ?? pigOther;
  if (pig && !pig.dead) {
    const blockHit =
      (pigSelf && blockOther) || (pigOther && blockSelf);
    if (blockHit && pig.isAnchored() && impulse >= PIG_CRUSH_KILL) {
      pig.forceWake();
    }
    const crush =
      (botHit && impulse > 5.5) ||
      (blockHit && impulse >= PIG_CRUSH_IMPULSE) ||
      (blockHit && !pig.isAnchored() && impulse >= PIG_CRUSH_IMPULSE * 0.85);
    if (crush && (!pig.isAnchored() || impulse >= PIG_CRUSH_KILL)) {
      ctx.onPigStrike(pig, impulse);
    }
  }
}

export function bindBodyContacts(body: CANNON.Body, ctx: ContactContext) {
  body.addEventListener(
    'collide',
    (e: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      handleCollide(body, e, ctx);
    }
  );
}
