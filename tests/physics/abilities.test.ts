import { describe, expect, it } from 'vitest';
import { Level } from '../../src/game/Level';
import { levelById } from '../../src/levels/registry';
import { TUNING } from '../../src/config/tuning';
import { activate, canActivate, type AbilityContext } from '../../src/bots/abilities';
import type { BotEntity } from '../../src/entities/types';

function runWithAbility(
  kind: 'dash' | 'split' | 'heavy',
  activateAt: number
): { bot: BotEntity | null; level: Level } {
  const def = levelById('first-flight')!;
  const level = Level.load(def);
  level.settle();
  level.fragmentsEnabled = true;
  const bot = level.launchBot(45, 18, kind);
  const launchTime = level.getSimTime();
  let activated = false;
  while (level.getSimTime() - launchTime < 3) {
    if (!activated && level.getSimTime() - launchTime >= activateAt) {
      const ctx: AbilityContext = {
        level,
        simTime: level.getSimTime(),
        launchTime,
        emit: () => {},
      };
      if (canActivate(bot, ctx)) {
        activate(bot, ctx);
        activated = true;
      }
    }
    level.step();
  }
  return { bot, level };
}

describe('bot abilities', () => {
  it('dash boost at t=0.4s', () => {
    const def = levelById('first-flight')!;
    const level = Level.load(def);
    level.settle();
    const bot = level.launchBot(45, 18, 'dash');
    const launchTime = level.getSimTime();
    let speedBefore = 0;
    while (level.getSimTime() - launchTime < 0.45) {
      level.step();
    }
    speedBefore = bot.body!.getLinearVelocity().length();
    const ctx: AbilityContext = {
      level,
      simTime: level.getSimTime(),
      launchTime,
      emit: () => {},
    };
    activate(bot, ctx);
    const speedAfter = bot.body!.getLinearVelocity().length();
    const expected = Math.min(Math.max(speedBefore * 1.9, 20), 36);
    expect(speedAfter).toBeCloseTo(expected, 2);
  });

  it('split into 3 children at t=0.4s', () => {
    const def = levelById('first-flight')!;
    const level = Level.load(def);
    level.settle();
    const bot = level.launchBot(45, 18, 'split');
    const launchTime = level.getSimTime();
    while (level.getSimTime() - launchTime < 0.4) level.step();
    const ctx: AbilityContext = {
      level,
      simTime: level.getSimTime(),
      launchTime,
      emit: () => {},
    };
    activate(bot, ctx);
    const bots = level.shotBots();
    expect(bots.length).toBe(3);
    expect(bots.every((b) => b.spawnedFrom === bot.id || b.id !== bot.id)).toBe(true);
    const angles = bots.map((b) =>
      Math.atan2(b.body!.getLinearVelocity().y, b.body!.getLinearVelocity().x)
    );
    angles.sort((a, b) => a - b);
    const d1 = ((angles[1]! - angles[0]!) * 180) / Math.PI;
    const d2 = ((angles[2]! - angles[1]!) * 180) / Math.PI;
    expect(d1).toBeCloseTo(12, 0.1);
    expect(d2).toBeCloseTo(12, 0.1);
  });

  it('heavy slam sets vy and mass', () => {
    const def = levelById('first-flight')!;
    const level = Level.load(def);
    level.settle();
    const bot = level.launchBot(45, 18, 'heavy');
    const launchTime = level.getSimTime();
    while (level.getSimTime() - launchTime < 0.4) level.step();
    const ctx: AbilityContext = {
      level,
      simTime: level.getSimTime(),
      launchTime,
      emit: () => {},
    };
    activate(bot, ctx);
    const v = bot.body!.getLinearVelocity();
    expect(v.y).toBeCloseTo(-26, 2);
    const mass = bot.body!.getMass();
    expect(mass).toBeCloseTo(3.0 * Math.PI * 0.72 * 0.72, 1);
  });

  it('second activation does nothing', () => {
    const def = levelById('first-flight')!;
    const level = Level.load(def);
    level.settle();
    const bot = level.launchBot(45, 18, 'dash');
    const launchTime = level.getSimTime();
    while (level.getSimTime() - launchTime < 0.4) level.step();
    const ctx: AbilityContext = {
      level,
      simTime: level.getSimTime(),
      launchTime,
      emit: () => {},
    };
    activate(bot, ctx);
    const v1 = bot.body!.getLinearVelocity().clone();
    activate(bot, ctx);
    const v2 = bot.body!.getLinearVelocity();
    expect(v2.x).toBeCloseTo(v1.x, 3);
    expect(v2.y).toBeCloseTo(v1.y, 3);
  });
});
