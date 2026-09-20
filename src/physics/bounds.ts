import type { LevelV2 } from '../levels/schema';
import { TUNING } from '../config/tuning';
import type { BlockEntity, BotEntity, GameEntity, PigEntity } from '../entities/types';

export function isOutOfBounds(
  level: LevelV2,
  x: number,
  y: number
): boolean {
  const ex = TUNING.boundsExpand;
  const cam = level.camera;
  if (x < cam.minX - ex || x > cam.maxX + ex) return true;
  if (y < cam.minY - ex || y > cam.maxY + ex) return true;
  if (y < TUNING.minYDestroy) return true;
  return false;
}

export function shouldRemoveOob(entity: GameEntity): entity is BlockEntity | PigEntity | BotEntity {
  return entity.kind === 'block' || entity.kind === 'pig' || entity.kind === 'bot';
}
