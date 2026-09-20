import { describe, expect, it } from 'vitest';
import {
  firstUnseenBotInQueue,
  tutorialTipFor,
} from '../src/bots/tutorialTips';

describe('bot tutorial tips', () => {
  it('returns tips for special bots only', () => {
    expect(tutorialTipFor('grok')).toMatch(/pull back/i);
    expect(tutorialTipFor('dash')).toMatch(/speed/i);
    expect(tutorialTipFor('heavy')).toMatch(/stone/i);
    expect(tutorialTipFor('split')).toMatch(/impact/i);
  });

  it('finds first unseen non-grok bot in queue', () => {
    expect(
      firstUnseenBotInQueue(['grok', 'dash', 'heavy'], {})
    ).toBe('dash');
    expect(
      firstUnseenBotInQueue(['grok', 'dash', 'heavy'], { dash: true })
    ).toBe('heavy');
    expect(
      firstUnseenBotInQueue(['grok', 'grok'], { dash: true })
    ).toBeNull();
  });
});
