import { describe, expect, it, vi } from 'vitest';
import * as CANNON from 'cannon-es';
import {
  beginContactFrame,
  bindBodyContacts,
  handleCollide,
  type ContactContext,
} from '../src/game/ContactSystem';
import type { Block } from '../src/entities/Block';

/** B01: duplicate collide events in the same window do not double-apply damage. */
describe('contact pair dedupe', () => {
  it('applies block damage once for repeated collides within cooldown frames', () => {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
    const bot = new CANNON.Body({ mass: 1.2, shape: new CANNON.Sphere(0.5) });
    const blockBody = new CANNON.Body({
      mass: 2,
      shape: new CANNON.Sphere(0.4),
    });
    world.addBody(bot);
    world.addBody(blockBody);

    const block = {
      dead: false,
      body: blockBody,
      isAnchored: () => false,
    } as Block;

    const onBlockDamage = vi.fn();
    const ctx: ContactContext = {
      structureWarmup: 0,
      botBody: bot,
      blocks: [block],
      pigs: [],
      onBotImpact: vi.fn(),
      onBotStrikeStructure: vi.fn(),
      onBlockDamage: (b, impulse) => onBlockDamage(b, impulse),
      onPigStrike: vi.fn(),
    };

    bindBodyContacts(blockBody, ctx);

    const contact = {
      getImpactVelocityAlongNormal: () => -9,
    } as CANNON.ContactEquation;

    beginContactFrame();
    handleCollide(blockBody, { body: bot, contact }, ctx);
    handleCollide(blockBody, { body: bot, contact }, ctx);

    expect(onBlockDamage).toHaveBeenCalledTimes(1);
  });
});
