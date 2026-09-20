export const CAT = {
  GROUND: 0x0001,
  TERRAIN: 0x0002,
  BLOCK: 0x0004,
  PIG: 0x0008,
  BOT: 0x0010,
  FRAGMENT: 0x0020,
} as const;

export const MASK = {
  GROUND: 0xffff,
  TERRAIN: 0xffff,
  BLOCK: CAT.GROUND | CAT.TERRAIN | CAT.BLOCK | CAT.PIG | CAT.BOT,
  PIG: CAT.GROUND | CAT.TERRAIN | CAT.BLOCK | CAT.PIG | CAT.BOT,
  BOT: CAT.GROUND | CAT.TERRAIN | CAT.BLOCK | CAT.PIG,
  FRAGMENT: CAT.GROUND | CAT.TERRAIN,
} as const;

export function filterBits(category: number, mask: number) {
  return { filterCategoryBits: category, filterMaskBits: mask };
}
