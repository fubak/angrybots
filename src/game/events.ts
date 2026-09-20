import type { Material } from '../entities/types';
import type { GameStateId } from './states';

export type GameEvents = {
  'level:loaded': { levelId: string };
  'level:settled': Record<string, never>;
  'block:damaged': {
    id: string;
    material: Material;
    hpRatio: number;
    points: number;
    x: number;
    y: number;
  };
  'block:destroyed': {
    id: string;
    material: Material;
    x: number;
    y: number;
    angle: number;
    points: number;
  };
  'pig:damaged': { id: string; hpRatio: number; x: number; y: number };
  'pig:destroyed': { id: string; x: number; y: number; points: number };
  'explosion': { x: number; y: number; radius: number };
  'score:changed': { score: number; delta: number };
  'game:state': { from: GameStateId; to: GameStateId };
  'game:won': { score: number; stars: 0 | 1 | 2 | 3; bonus: number };
  'game:lost': { score: number };
  'shot:resolved': { pigsLeft: number; botsLeft: number };
  'bot:firstImpact': { id: string; x: number; y: number };
  'bot:ability': { kind: string; botId: string };
  'bot:launched': { kind: string; vx: number; vy: number };
  'sling:aimUpdate': { tension: number };
  'sling:cancel': Record<string, never>;
};
