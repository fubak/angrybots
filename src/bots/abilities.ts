import { Vec2 } from 'planck';
import type { BotEntity } from '../entities/types';
import type { Level } from '../game/Level';
import { explodeAt } from '../physics/explosions';

export type AbilityContext = {
  level: Level;
  simTime: number;
  launchTime: number;
  emit: (name: 'bot:ability', payload: { kind: string; botId: string }) => void;
};

const ACTIVATION_WINDOW = 4.0;
const SPLIT_ANGLES = [-12, 0, 12];

export function canActivate(bot: BotEntity, ctx: AbilityContext): boolean {
  if (!bot.alive || !bot.body || bot.abilityUsed) return false;
  if (bot.botKind === 'grok') return false;
  if (bot.botKind === 'blast') {
    if (bot.firstImpactAt !== null) return true;
    return ctx.simTime - ctx.launchTime <= ACTIVATION_WINDOW;
  }
  if (bot.firstImpactAt !== null) return false;
  return ctx.simTime - ctx.launchTime <= ACTIVATION_WINDOW;
}

export function activate(bot: BotEntity, ctx: AbilityContext): void {
  if (!canActivate(bot, ctx)) return;

  switch (bot.botKind) {
    case 'dash':
      applyDash(bot);
      bot.abilityUsed = true;
      ctx.emit('bot:ability', { kind: 'dash', botId: bot.id });
      break;
    case 'split':
      splitBot(bot, ctx);
      bot.abilityUsed = true;
      ctx.emit('bot:ability', { kind: 'split', botId: bot.id });
      break;
    case 'heavy':
      applyHeavy(bot);
      bot.abilityUsed = true;
      ctx.emit('bot:ability', { kind: 'heavy', botId: bot.id });
      break;
    case 'blast':
      detonateBlast(bot, ctx);
      bot.abilityUsed = true;
      ctx.emit('bot:ability', { kind: 'blast', botId: bot.id });
      break;
    default:
      break;
  }
}

function applyDash(bot: BotEntity): void {
  const body = bot.body!;
  const v = body.getLinearVelocity();
  const speed = v.length();
  const newSpeed = Math.min(Math.max(speed * 1.9, 20), 36);
  if (speed < 1e-6) return;
  const s = newSpeed / speed;
  body.setLinearVelocity(Vec2(v.x * s, v.y * s));
}

function applyHeavy(bot: BotEntity): void {
  const body = bot.body!;
  const v = body.getLinearVelocity();
  body.setLinearVelocity(Vec2(v.x * 0.3, -26));
  const f = body.getFixtureList();
  if (f) {
    f.setDensity(3.0);
    body.resetMassData();
  }
}

function splitBot(bot: BotEntity, ctx: AbilityContext): void {
  const body = bot.body!;
  const pos = body.getPosition();
  const v = body.getLinearVelocity();
  const speed = v.length();
  const baseAngle = Math.atan2(v.y, v.x);

  ctx.level.removeBotBody(bot);

  for (let i = 0; i < 3; i++) {
    const ang = baseAngle + (SPLIT_ANGLES[i]! * Math.PI) / 180;
    const offset = i === 1 ? 0 : 0.45;
    const perp = baseAngle + Math.PI / 2;
    const sign = i === 0 ? -1 : i === 2 ? 1 : 0;
    const wx = pos.x + Math.cos(perp) * offset * sign;
    const wy = pos.y + Math.sin(perp) * offset * sign;
    ctx.level.spawnSplitChild(
      wx,
      wy,
      Math.cos(ang) * speed,
      Math.sin(ang) * speed,
      bot.id
    );
  }
}

function detonateBlast(bot: BotEntity, ctx: AbilityContext): void {
  const body = bot.body!;
  const pos = body.getPosition();
  explodeAt(ctx.level.pw, pos, 3.5, 18, 45, {
    onExplosion: () => {},
    onBlastDamage: (entity, damage) => {
      if (!entity.alive) return;
      const dealt = Math.min(damage, Math.max(entity.hp, 0));
      entity.hp -= damage;
      if (entity.kind === 'block') {
        ctx.level.hooks.score += dealt * 10;
      }
      if (entity.hp <= 0) ctx.level.destroyEntity(entity, 'blast');
    },
    queueTntChain: () => {},
  });
  ctx.level.removeBotBody(bot);
}
