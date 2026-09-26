import { describe, expect, it } from 'vitest';
import { setAnalyticsSink, track, type AnalyticsName } from '../../src/analytics';

describe('analytics', () => {
  it('default sink is a no-op that does not throw', () => {
    setAnalyticsSink(null);
    expect(() => track('app_open', {})).not.toThrow();
  });

  it('forwards name and typed props to the installed sink', () => {
    const seen: { name: AnalyticsName; props: unknown }[] = [];
    setAnalyticsSink((name, props) => seen.push({ name, props }));
    track('app_open', {});
    track('level_start', { levelId: 'first-flight' });
    track('level_end', {
      levelId: 'first-flight',
      won: true,
      score: 42000,
      stars: 3,
      shotsUsed: 1,
      durationMs: 9100,
    });
    track('level_skip', { levelId: 'first-flight' });
    track('achievement_unlock', { id: 'first-blood' });
    track('daily_start', { levelId: 'hilltop', date: '2026-09-25' });
    track('daily_end', { levelId: 'hilltop', date: '2026-09-25', won: false, score: 0, durationMs: 4000 });
    expect(seen.map((e) => e.name)).toEqual([
      'app_open',
      'level_start',
      'level_end',
      'level_skip',
      'achievement_unlock',
      'daily_start',
      'daily_end',
    ]);
    expect(seen[2].props).toMatchObject({ won: true, shotsUsed: 1 });
    expect(seen[5].props).toMatchObject({ date: '2026-09-25' });
  });

  it('a throwing sink cannot crash the game', () => {
    setAnalyticsSink(() => {
      throw new Error('vendor blew up');
    });
    expect(() => track('app_open', {})).not.toThrow();
    setAnalyticsSink(null);
  });
});
