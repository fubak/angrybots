import { describe, expect, it } from 'vitest';
import { SoundBank } from '../../src/audio/SoundBank';

describe('SoundBank', () => {
  it('records real play calls instead of staying silent', () => {
    const bank = new SoundBank();
    void bank.preload();
    bank.play('launch');
    bank.play('break:wood');
    bank.play('victory');
    expect(bank.lastPlayed).toEqual(['launch', 'break:wood', 'victory']);
  });
});
