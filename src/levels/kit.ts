export const KIT_IDS = [
  'plankL',
  'plankM',
  'plankS',
  'postL',
  'postM',
  'postS',
  'cube',
  'cubeS',
  'slab',
  'wheel',
  'wheelS',
  'triR',
  'triL',
] as const;

export type KitId = (typeof KIT_IDS)[number];

export type KitDef =
  | { kind: 'box'; w: number; h: number; depth: number }
  | { kind: 'circle'; r: number; depth: number }
  | { kind: 'triangle'; w: number; h: number; depth: number; mirror: boolean };

export const KIT: Record<KitId, KitDef> = {
  plankL: { kind: 'box', w: 4.0, h: 0.4, depth: 0.9 },
  plankM: { kind: 'box', w: 2.0, h: 0.4, depth: 0.9 },
  plankS: { kind: 'box', w: 1.0, h: 0.4, depth: 0.9 },
  postL: { kind: 'box', w: 0.4, h: 2.0, depth: 0.9 },
  postM: { kind: 'box', w: 0.4, h: 1.2, depth: 0.9 },
  postS: { kind: 'box', w: 0.4, h: 0.8, depth: 0.9 },
  cube: { kind: 'box', w: 0.8, h: 0.8, depth: 0.9 },
  cubeS: { kind: 'box', w: 0.4, h: 0.4, depth: 0.9 },
  slab: { kind: 'box', w: 2.0, h: 0.8, depth: 0.9 },
  wheel: { kind: 'circle', r: 0.4, depth: 0.9 },
  wheelS: { kind: 'circle', r: 0.2, depth: 0.9 },
  triR: { kind: 'triangle', w: 0.8, h: 0.8, depth: 0.9, mirror: false },
  triL: { kind: 'triangle', w: 0.8, h: 0.8, depth: 0.9, mirror: true },
};

export function isKitId(v: unknown): v is KitId {
  return typeof v === 'string' && (KIT_IDS as readonly string[]).includes(v);
}
