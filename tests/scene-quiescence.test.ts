import { describe, expect, it } from 'vitest';
import * as CANNON from 'cannon-es';
import type { Block } from '../src/entities/Block';
import type { Pig } from '../src/entities/Pig';
import { sceneHasMeaningfulMotion } from '../src/game/SceneQuiescence';

function stubBlock(body: CANNON.Body, dead = false, anchored = false): Block {
  return {
    dead,
    body,
    isAnchored: () => anchored,
  } as Block;
}

function stubPig(body: CANNON.Body, dead = false, anchored = false): Pig {
  return {
    dead,
    body,
    isAnchored: () => anchored,
  } as Pig;
}

/** A03: resolving waits for motion to settle. */
describe('sceneHasMeaningfulMotion', () => {
  it('returns false when bodies are at rest', () => {
    const bot = new CANNON.Body({ mass: 1, type: CANNON.Body.DYNAMIC });
    bot.sleepState = CANNON.Body.SLEEPING;

    const blockBody = new CANNON.Body({ mass: 2, type: CANNON.Body.DYNAMIC });
    blockBody.sleepState = CANNON.Body.SLEEPING;

    const pigBody = new CANNON.Body({ mass: 1, type: CANNON.Body.DYNAMIC });
    pigBody.sleepState = CANNON.Body.SLEEPING;

    expect(
      sceneHasMeaningfulMotion(
        bot,
        [stubBlock(blockBody)],
        [stubPig(pigBody)],
        0
      )
    ).toBe(false);
  });

  it('returns true when a loose block is moving', () => {
    const bot = new CANNON.Body({ mass: 1, type: CANNON.Body.DYNAMIC });
    bot.sleepState = CANNON.Body.SLEEPING;

    const blockBody = new CANNON.Body({ mass: 2, type: CANNON.Body.DYNAMIC });
    blockBody.velocity.set(3.5, 0, 0);
    blockBody.sleepState = CANNON.Body.AWAKE;

    expect(
      sceneHasMeaningfulMotion(bot, [stubBlock(blockBody)], [], 0)
    ).toBe(true);
  });

  it('returns true while explosions are pending', () => {
    const bot = new CANNON.Body({ mass: 1, type: CANNON.Body.DYNAMIC });
    bot.sleepState = CANNON.Body.SLEEPING;
    expect(sceneHasMeaningfulMotion(bot, [], [], 2)).toBe(true);
  });
});
