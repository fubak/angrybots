import type { BotKind } from '../levels/schema';
import type { Material } from '../entities/types';

/** Material affinity multiplier for bot → block direct contact damage. */
export function affinity(botKind: BotKind, material: Material): number {
  switch (botKind) {
    case 'dash':
      if (material === 'wood') return 2.0;
      if (material === 'stone') return 0.7;
      return 1.0;
    case 'split':
      if (material === 'wood') return 0.8;
      if (material === 'stone') return 0.5;
      if (material === 'glass') return 2.5;
      return 1.0;
    case 'heavy':
      if (material === 'wood') return 1.2;
      if (material === 'stone') return 2.0;
      return 1.0;
    default:
      return 1.0;
  }
}
