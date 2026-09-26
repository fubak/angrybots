import { describe, expect, it } from 'vitest';
import { layoutText, type GlyphMetric } from '../../src/render/glyphLayout';

/**
 * Score popups render one quad per glyph from a shared atlas. Garbled output
 * (out-of-order or mirrored glyphs, blown-out spacing) is a layout bug, so the
 * pure string → quads mapping is tested directly.
 */
const metricsFor = (chars: string, advancePx = 30): Map<string, GlyphMetric> => {
  const m = new Map<string, GlyphMetric>();
  [...chars].forEach((ch, i) => {
    m.set(ch, { u0: i / chars.length, uw: 1 / chars.length, advancePx });
  });
  return m;
};

const ATLAS = metricsFor('0123456789+,kxCOMB');
const U_PER_PX = 0.6 / 72; // cellH 0.6 / cell 72px

describe('layoutText', () => {
  it('preserves glyph order', () => {
    const { glyphs } = layoutText('COMB', ATLAS, U_PER_PX, 0.2);
    expect(glyphs.map((g) => g.ch)).toEqual(['C', 'O', 'M', 'B']);
    const { glyphs: digits } = layoutText('+5,000', ATLAS, U_PER_PX, 0.2);
    expect(digits.map((g) => g.ch)).toEqual(['+', '5', ',', '0', '0', '0']);
  });

  it('produces monotonically increasing x positions', () => {
    const { glyphs } = layoutText('COMBO x7', ATLAS, U_PER_PX, 0.2);
    for (let i = 1; i < glyphs.length; i++) {
      expect(glyphs[i]!.x0).toBeGreaterThan(glyphs[i - 1]!.x0);
    }
  });

  it('keeps kerning tight: quads overlap slightly, never gap', () => {
    const { glyphs } = layoutText('COMBO', ATLAS, U_PER_PX, 0.2);
    for (let i = 1; i < glyphs.length; i++) {
      expect(glyphs[i]!.x0).toBeLessThan(glyphs[i - 1]!.x1);
    }
  });

  it('maps UV rects to each glyph atlas slice, unflipped (u0 < u1)', () => {
    const { glyphs } = layoutText('12', ATLAS, U_PER_PX, 0.2);
    const one = ATLAS.get('1')!;
    const two = ATLAS.get('2')!;
    expect(glyphs[0]!.u0).toBeCloseTo(one.u0);
    expect(glyphs[0]!.u1).toBeCloseTo(one.u0 + one.uw);
    expect(glyphs[1]!.u0).toBeCloseTo(two.u0);
    for (const g of glyphs) expect(g.u1).toBeGreaterThan(g.u0);
    for (const g of glyphs) {
      expect(g.u0).toBeGreaterThanOrEqual(0);
      expect(g.u1).toBeLessThanOrEqual(1);
    }
  });

  it('sizes quads from measured advance widths, not a fixed cell', () => {
    const m = new Map<string, GlyphMetric>([
      ['W', { u0: 0, uw: 0.1, advancePx: 60 }],
      ['1', { u0: 0.5, uw: 0.05, advancePx: 20 }],
    ]);
    const { glyphs } = layoutText('W1', m, U_PER_PX, 0.2);
    const wW = glyphs[0]!.x1 - glyphs[0]!.x0;
    const w1 = glyphs[1]!.x1 - glyphs[1]!.x0;
    expect(wW / w1).toBeCloseTo(60 / 20);
  });

  it('returns total width equal to the last glyph edge, handles empty', () => {
    const { glyphs, width } = layoutText('+9', ATLAS, U_PER_PX, 0.2);
    expect(width).toBeCloseTo(glyphs[glyphs.length - 1]!.x1);
    expect(layoutText('', ATLAS, U_PER_PX, 0.2).width).toBe(0);
  });

  it('advances spaces and skips unknown glyphs', () => {
    const { glyphs, width } = layoutText('x 3', ATLAS, U_PER_PX, 0.2);
    expect(glyphs.map((g) => g.ch)).toEqual(['x', '3']);
    expect(glyphs[1]!.x0).toBeGreaterThan(glyphs[0]!.x1);
    expect(width).toBeGreaterThan(0);
  });
});
