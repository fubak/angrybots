import planck, { type World, Vec2 } from 'planck';
import { TUNING } from '../config/tuning';
import { filterBits, CAT, MASK } from '../physics/categories';
import type { BotKind } from '../levels/schema';
import type { BotEntity } from './types';

const { Circle } = planck;

export function spawnBotAt(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  kind: BotKind,
  id: string,
  opts?: { r?: number; density?: number; spawnedFrom?: string }
): BotEntity {
  const prof = TUNING.bots[kind];
  const r = opts?.r ?? prof.r;
  const density = opts?.density ?? prof.density;
  const body = world.createBody({
    type: 'dynamic',
    position: Vec2(x, y),
    bullet: true,
  });
  body.setAngularDamping(0.4);
  body.createFixture(Circle(r), {
    density,
    friction: TUNING.bot.friction,
    restitution: TUNING.bot.restitution,
    ...filterBits(CAT.BOT, MASK.BOT),
  });
  body.setLinearVelocity(Vec2(vx, vy));
  const bot: BotEntity = {
    kind: 'bot',
    id,
    botKind: kind,
    r,
    body,
    alive: true,
    abilityUsed: false,
    firstImpactAt: null,
    spawnedFrom: opts?.spawnedFrom,
  };
  body.setUserData(bot);
  return bot;
}

export function spawnBot(
  world: World,
  angleDeg: number,
  speed: number,
  kind: BotKind,
  id: string
): BotEntity {
  const a = (angleDeg * Math.PI) / 180;
  return spawnBotAt(
    world,
    TUNING.sling.x,
    TUNING.sling.y,
    Math.cos(a) * speed,
    Math.sin(a) * speed,
    kind,
    id
  );
}
