/** Release bot roles (I02). */
export type BotKind = 'grok' | 'dash' | 'split' | 'heavy';

export type BotProfile = {
  kind: BotKind;
  displayName: string;
  /** Launch speed scale applied to sling impulse. */
  speedScale: number;
  /** Dynamic mass multiplier vs Grok baseline. */
  massScale: number;
  /** Visual scale on the Grok shell. */
  visualScale: number;
  shellColor: number;
  emissive: number;
  /** Short HUD pip class suffix. */
  pipClass: string;
};
