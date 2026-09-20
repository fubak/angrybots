import planck, { type World, Vec2 } from 'planck';
import { TUNING } from '../config/tuning';
import { filterBits, CAT, MASK } from '../physics/categories';
import type { BotKind } from '../levels/schema';
import type { BotEntity } from './types';

const { Circle } = planck;

export function spawnBot(
  world: World,
  angleDeg: number,
  speed: number,
  kind: BotKind,
  id: string
): BotEntity {
  const prof = TUNING.bots[kind];
  const a = (angleDeg * Math.PI) / 180;
  const body = world.createBody({
    type: 'dynamic',
    position: Vec2(TUNING.sling.x, TUNING.sling.y),
    bullet: true,
  });
  body.setAngularDamping(0.4);
  body.createFixture(Circle(prof.r), {
    density: prof.density,
    friction: TUNING.bot.friction,
    restitution: TUNING.bot.restitution,
    ...filterBits(CAT.BOT, MASK.BOT),
  });
  body.setLinearVelocity(Vec2(Math.cos(a) * speed, Math.sin(a) * speed));
  const bot: BotEntity = {
    kind: 'bot',
    id,
    botKind: kind,
    r: prof.r,
    body,
    alive: true,
    abilityUsed: false,
    firstImpactAt: null,
  };
  body.setUserData(bot);
  return bot;
}
