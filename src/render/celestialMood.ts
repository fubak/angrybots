export type ShotReaction = 'great' | 'good' | 'miss';

/**
 * The sun/moon's verdict on a finished shot. `kills` is the number of pigs the
 * shot dropped, `shotScore` the points it earned, `won` whether it ended the
 * level. Returns null when the shot was unremarkable — the face just keeps
 * watching instead of reacting.
 */
export function shotReaction(r: {
  kills: number;
  shotScore: number;
  won: boolean;
}): ShotReaction | null {
  if (r.won || r.kills >= 2) return 'great';
  if (r.kills >= 1 || r.shotScore >= 3000) return 'good';
  if (r.kills === 0 && r.shotScore < 500) return 'miss';
  return null;
}
