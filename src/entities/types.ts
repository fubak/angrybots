import type { Body } from 'planck';
import type { BotKind } from '../levels/schema';

export type Material = 'wood' | 'stone' | 'glass' | 'tnt';

export interface EntityBase {
  id: string;
  body: Body | null;
  alive: boolean;
}

export interface BlockEntity extends EntityBase {
  kind: 'block';
  material: Material;
  shape: 'box' | 'circle' | 'triangle';
  w: number;
  h: number;
  r?: number;
  triMirror?: boolean;
  rot?: 0 | 90;
  depth: number;
  hp: number;
  maxHp: number;
}

export interface PigEntity extends EntityBase {
  kind: 'pig';
  size: 'S' | 'M' | 'L';
  helmet: 'none' | 'hat' | 'helmet';
  king: boolean;
  r: number;
  hp: number;
  maxHp: number;
  /** True once the target has been clearly above the grass. A later ground hit removes it. */
  airborne: boolean;
  /** Seconds spent tumbling along the grass; a target that keeps rolling is finished off. */
  rollTime: number;
}

export interface BotEntity extends EntityBase {
  kind: 'bot';
  botKind: BotKind;
  r: number;
  abilityUsed: boolean;
  firstImpactAt: number | null;
  spawnedFrom?: string;
}

export interface FragmentEntity extends EntityBase {
  kind: 'fragment';
  material: Material;
  spawnTime: number;
  lifetime: number;
  w: number;
  h: number;
}

export interface TerrainEntity extends EntityBase {
  kind: 'terrain';
  terrainId: string;
}

export interface GroundEntity extends EntityBase {
  kind: 'ground';
}

export type GameEntity =
  | BlockEntity
  | PigEntity
  | BotEntity
  | FragmentEntity
  | TerrainEntity
  | GroundEntity;

export function entityUserData(body: Body): GameEntity | null {
  const u = body.getUserData();
  return u && typeof u === 'object' && 'kind' in u ? (u as GameEntity) : null;
}
