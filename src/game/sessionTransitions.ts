import type { GameStateId } from './states';

/** Legal transitions for play states (GameSession FSM). */
export const SESSION_TRANSITIONS: Record<GameStateId, GameStateId[]> = {
  boot: ['title'],
  title: ['levelSelect'],
  levelSelect: ['intro', 'title'],
  intro: ['aim'],
  aim: ['flight'],
  flight: ['resolve'],
  resolve: ['nextBot', 'bonus', 'won', 'lost'],
  nextBot: ['aim'],
  bonus: ['won'],
  won: ['intro', 'levelSelect'],
  lost: ['intro', 'levelSelect'],
};
