import { isKitId, type KitId } from './kit';

export type BotKind = 'grok' | 'dash' | 'split' | 'heavy' | 'blast';

const BOT_KINDS: BotKind[] = ['grok', 'dash', 'split', 'heavy', 'blast'];

export type TerrainV2 =
  | { kind: 'plateau'; x0: number; x1: number; top: number }
  | { kind: 'ramp'; x0: number; x1: number; y0: number; y1: number }
  | { kind: 'ledge'; x0: number; x1: number; top: number; thickness: number };

export type BlockV2 = {
  id: string;
  material: 'wood' | 'stone' | 'glass' | 'tnt';
  kit: KitId;
  x: number;
  y: number;
  rot?: 0 | 90;
};

export type PigV2 = {
  id: string;
  size: 'S' | 'M' | 'L';
  helmet?: 'hat' | 'helmet';
  king?: boolean;
  x: number;
  y: number;
};

export type LevelV2 = {
  version: 2;
  id: string;
  name: string;
  chapter: string;
  order: number;
  bots: BotKind[];
  stars: [number, number, number];
  camera: { minX: number; maxX: number; minY: number; maxY: number };
  sling: { x: number };
  terrain: TerrainV2[];
  blocks: BlockV2[];
  pigs: PigV2[];
  hint?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isBotKind(v: unknown): v is BotKind {
  return typeof v === 'string' && BOT_KINDS.includes(v as BotKind);
}

function isTerrain(v: unknown): v is TerrainV2 {
  if (!isRecord(v) || typeof v.kind !== 'string') return false;
  if (v.kind === 'plateau') {
    return (
      typeof v.x0 === 'number' &&
      typeof v.x1 === 'number' &&
      typeof v.top === 'number'
    );
  }
  if (v.kind === 'ramp') {
    return (
      typeof v.x0 === 'number' &&
      typeof v.x1 === 'number' &&
      typeof v.y0 === 'number' &&
      typeof v.y1 === 'number'
    );
  }
  if (v.kind === 'ledge') {
    return (
      typeof v.x0 === 'number' &&
      typeof v.x1 === 'number' &&
      typeof v.top === 'number' &&
      typeof v.thickness === 'number'
    );
  }
  return false;
}

function isBlock(v: unknown): v is BlockV2 {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string') return false;
  if (v.material !== 'wood' && v.material !== 'stone' && v.material !== 'glass' && v.material !== 'tnt') {
    return false;
  }
  if (!isKitId(v.kit)) return false;
  if (typeof v.x !== 'number' || typeof v.y !== 'number') return false;
  if (v.rot !== undefined && v.rot !== 0 && v.rot !== 90) return false;
  return true;
}

function isPig(v: unknown): v is PigV2 {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string') return false;
  if (v.size !== 'S' && v.size !== 'M' && v.size !== 'L') return false;
  if (v.helmet !== undefined && v.helmet !== 'hat' && v.helmet !== 'helmet') return false;
  if (v.king !== undefined && typeof v.king !== 'boolean') return false;
  return typeof v.x === 'number' && typeof v.y === 'number';
}

export function isLevelV2(v: unknown): v is LevelV2 {
  if (!isRecord(v)) return false;
  if (v.version !== 2) return false;
  if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.chapter !== 'string') {
    return false;
  }
  if (typeof v.order !== 'number') return false;
  if (!Array.isArray(v.bots) || !v.bots.every(isBotKind)) return false;
  if (
    !Array.isArray(v.stars) ||
    v.stars.length !== 3 ||
    !v.stars.every((n) => typeof n === 'number')
  ) {
    return false;
  }
  if (!isRecord(v.camera)) return false;
  const cam = v.camera;
  if (
    typeof cam.minX !== 'number' ||
    typeof cam.maxX !== 'number' ||
    typeof cam.minY !== 'number' ||
    typeof cam.maxY !== 'number'
  ) {
    return false;
  }
  if (!isRecord(v.sling) || typeof v.sling.x !== 'number') return false;
  if (!Array.isArray(v.terrain) || !v.terrain.every(isTerrain)) return false;
  if (!Array.isArray(v.blocks) || !v.blocks.every(isBlock)) return false;
  if (!Array.isArray(v.pigs) || !v.pigs.every(isPig)) return false;
  if (v.hint !== undefined && typeof v.hint !== 'string') return false;
  return true;
}

export type LevelParseError = { field: string; message: string };

export function parseLevelV2(raw: unknown): { ok: true; level: LevelV2 } | { ok: false; error: LevelParseError } {
  if (!isRecord(raw)) {
    return { ok: false, error: { field: 'root', message: 'Expected an object' } };
  }
  if (raw.version !== 2) {
    return { ok: false, error: { field: 'version', message: 'Expected version 2' } };
  }
  if (Array.isArray(raw.blocks)) {
    for (let i = 0; i < raw.blocks.length; i++) {
      const b = raw.blocks[i];
      if (isRecord(b) && b.kit !== undefined && !isKitId(b.kit)) {
        return {
          ok: false,
          error: { field: `blocks[${i}].kit`, message: `Unknown kit "${String(b.kit)}"` },
        };
      }
    }
  }
  if (!isLevelV2(raw)) {
    return { ok: false, error: { field: 'schema', message: 'Level failed LevelV2 type guard' } };
  }
  return { ok: true, level: raw };
}
