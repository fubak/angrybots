import { describe, expect, it, vi } from 'vitest';
import * as CANNON from 'cannon-es';
import { handleCollide, beginContactFrame } from '../src/game/ContactSystem';
import type { Block } from '../src/entities/Block';
import type { Pig } from '../src/entities/Pig';

describe('pig crush contacts', () => {
  it('kills pig on heavy block impact without bot', () => {
    beginContactFrame();
    const onPigStrike = vi.fn();
    const pigBody = new CANNON.Body({ mass: 1, type: CANNON.Body.DYNAMIC });
    const blockBody = new CANNON.Body({ mass: 2, type: CANNON.Body.DYNAMIC });
    const pig = {
      dead: false,
      isAnchored: () => false,
      forceWake: vi.fn(),
      body: pigBody,
    } as unknown as Pig;
    const block = {
      dead: false,
      isAnchored: () => false,
      body: blockBody,
    } as unknown as Block;

    const ctx = {
      structureWarmup: 0,
      botBody: new CANNON.Body({ mass: 1 }),
      blocks: [block],
      pigs: [pig],
      onBotImpact: vi.fn(),
      onBotStrikeStructure: vi.fn(),
      onBlockDamage: vi.fn(),
      onPigStrike,
    };

    const contact = {
      getImpactVelocityAlongNormal: () => -8,
    } as CANNON.ContactEquation;

    handleCollide(pigBody, { body: blockBody, contact }, ctx);
    expect(onPigStrike).toHaveBeenCalled();
  });
});
