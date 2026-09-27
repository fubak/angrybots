/**
 * The HUD star bar maps score → a 0..1 fill across three equal segments, one
 * per star. Segment i runs from the previous threshold (0 for the first) to
 * thresholds[i], so each star sits exactly at the end of its third — 33.3%,
 * 66.7%, 100% — and a lit star always means the fill has reached it.
 */
export function starBarFill(score: number, thresholds: readonly [number, number, number]): number {
  const s = Math.max(0, score);
  for (let i = 0; i < 3; i++) {
    const prev = i === 0 ? 0 : thresholds[i - 1]!;
    const thr = thresholds[i]!;
    if (s < thr) return (i + Math.max(0, (s - prev) / Math.max(1, thr - prev))) / 3;
  }
  return 1;
}

/** The score needed for the next star, or null once the bar is maxed. */
export function nextStarTarget(
  score: number,
  thresholds: readonly [number, number, number]
): number | null {
  const s = Math.max(0, score);
  for (let i = 0; i < 3; i++) if (s < thresholds[i]!) return thresholds[i]!;
  return null;
}
