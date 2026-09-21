import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../../src/levels/chapters';
import { allLevels } from '../../src/levels/registry';
import type { LevelV2 } from '../../src/levels/schema';
import { validateStatic } from '../../src/levels/validate';
import { makeBotCharacter, makePigCharacter } from '../../src/render/characters';

function fingerprint(level: LevelV2): string {
  return JSON.stringify({
    terrain: level.terrain,
    blocks: level.blocks.map((b) => [b.kit, b.material, b.x, b.y, b.rot ?? 0]),
    pigs: level.pigs.map((p) => [p.size, p.x, p.y, p.helmet ?? '', p.king ?? false]),
  });
}

describe('campaign authorship', () => {
  const levels = allLevels();

  it('has 30 uniquely authored layouts across three chapters', () => {
    expect(levels).toHaveLength(30);
    expect(CHAPTERS.map((c) => c.id)).toEqual(['training', 'workshop', 'citadel']);
    const byChapter = {
      training: levels.filter((l) => l.chapter === 'training'),
      workshop: levels.filter((l) => l.chapter === 'workshop'),
      citadel: levels.filter((l) => l.chapter === 'citadel'),
    };
    expect(byChapter.training).toHaveLength(10);
    expect(byChapter.workshop).toHaveLength(10);
    expect(byChapter.citadel).toHaveLength(10);
    const prints = levels.map(fingerprint);
    expect(new Set(prints).size).toBe(30);
    expect(new Set(levels.map((l) => l.id)).size).toBe(30);
    expect(new Set(levels.map((l) => l.name)).size).toBe(30);
  });

  it('sorts unlock order as training then workshop then citadel', () => {
    expect(levels[0]?.id).toBe('first-flight');
    expect(levels[9]?.id).toBe('split-lesson');
    expect(levels[10]?.id).toBe('heavy-gate');
    expect(levels[20]?.id).toBe('king-court');
    expect(levels[29]?.id).toBe('last-stand');
  });

  it('teaches dash, split, heavy and blast as lead bots', () => {
    const leads = new Set(levels.map((l) => l.bots[0]));
    expect(leads.has('dash')).toBe(true);
    expect(leads.has('split')).toBe(true);
    expect(leads.has('heavy')).toBe(true);
    expect(leads.has('blast')).toBe(true);
  });

  it('includes a king pig after expand', () => {
    const kings = levels.flatMap((l) => l.pigs.filter((p) => p.king));
    expect(kings.length).toBeGreaterThan(0);
  });

  it('passes static validation for every level', () => {
    const errs = levels.flatMap((l) => validateStatic(l).map((e) => `${l.id}: ${e}`));
    expect(errs).toEqual([]);
  });
});

describe('character silhouettes', () => {
  it('builds distinct named bot and pig groups', () => {
    const kinds = ['grok', 'dash', 'split', 'heavy', 'blast'] as const;
    const names = kinds.map((k) => makeBotCharacter(k, 0.5).name);
    expect(new Set(names).size).toBe(5);
    expect(makePigCharacter(0.5, { helmet: 'helmet', king: false }).name).toBe('pig:helmet');
    expect(makePigCharacter(0.5, { helmet: 'none', king: true }).name).toBe('pig:king');
  });
});
