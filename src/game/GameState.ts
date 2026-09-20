export type GameState =
  | 'loading'
  | 'title'
  | 'ready'
  | 'aiming'
  | 'coiling'
  | 'flying'
  | 'resolving'
  | 'won'
  | 'lost'
  | 'paused';

export function canAim(state: GameState, shotsLeft: number): boolean {
  return (
    shotsLeft > 0 &&
    (state === 'ready' || state === 'aiming' || state === 'coiling')
  );
}

export function canLaunch(state: GameState): boolean {
  return state === 'coiling' || state === 'flying';
}

export function isTerminal(state: GameState): boolean {
  return state === 'won' || state === 'lost';
}
