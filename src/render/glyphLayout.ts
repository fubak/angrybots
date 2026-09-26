/** Per-glyph atlas metric: UV slice plus ink width in atlas pixels. */
export type GlyphMetric = {
  u0: number;
  uw: number;
  advancePx: number;
};

export type LaidOutGlyph = {
  ch: string;
  x0: number;
  x1: number;
  u0: number;
  u1: number;
};

/** Slight glyph overlap so chunky outlined text reads as one word. */
const TRACKING = 0.88;

/**
 * Lay out a string as left-to-right glyph quads.
 * Positions are string-local world units starting at x = 0; `unitPerPx`
 * converts atlas pixels to world units (cellH / atlas cell height).
 */
export function layoutText(
  text: string,
  metrics: ReadonlyMap<string, GlyphMetric>,
  unitPerPx: number,
  spaceW: number
): { glyphs: LaidOutGlyph[]; width: number } {
  const glyphs: LaidOutGlyph[] = [];
  let x = 0;
  for (const ch of text) {
    const m = metrics.get(ch);
    if (!m) {
      x += spaceW;
      continue;
    }
    const w = m.advancePx * unitPerPx;
    glyphs.push({ ch, x0: x, x1: x + w, u0: m.u0, u1: m.u0 + m.uw });
    x += w * TRACKING;
  }
  return { glyphs, width: glyphs.length ? glyphs[glyphs.length - 1]!.x1 : 0 };
}
