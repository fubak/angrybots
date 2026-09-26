/** Gameplay numbers — change only when a spec task allows tuning. */
export const TUNING = {
  gravity: -18,
  dt: 1 / 60,
  velIters: 10,
  posIters: 8,
  settleSeconds: 2.0,
  minApproachSpeed: 0.8,
  materials: {
    wood: { density: 0.6, friction: 0.6, restitution: 0.1, hp: 16, minImpulse: 0.6, damageScale: 1.0 },
    stone: { density: 2.4, friction: 0.8, restitution: 0.05, hp: 60, minImpulse: 1.5, damageScale: 1.0 },
    glass: { density: 0.5, friction: 0.25, restitution: 0.1, hp: 6, minImpulse: 0.3, damageScale: 1.0 },
    tnt: { density: 0.5, friction: 0.6, restitution: 0.1, hp: 3, minImpulse: 0.5, damageScale: 1.0 },
  },
  pig: {
    density: 0.8,
    friction: 0.6,
    restitution: 0.15,
    sizes: { S: { r: 0.4, hp: 3 }, M: { r: 0.55, hp: 6 }, L: { r: 0.75, hp: 12 } },
    minImpulse: 1.0,
    helmetMultiplier: 2.5,
    hatMultiplier: 1.5,
  },
  bot: { friction: 0.5, restitution: 0.25, damageScale: 1.0 },
  bots: {
    grok: { r: 0.58, density: 1.0 },
    dash: { r: 0.5, density: 1.0 },
    split: { r: 0.5, density: 1.0 },
    heavy: { r: 0.72, density: 1.1 },
    blast: { r: 0.62, density: 1.0 },
  },
  tnt: { radius: 3.0, impulse: 14, damage: 40 },
  sling: { x: -7.5, y: 2.2, maxSpeed: 23 },
  quiet: { lin: 0.12, ang: 0.2, holdSeconds: 0.5 },
  boundsExpand: 12, // OOB slack past camera bounds; must clear the max lob arc (~15)
  minYDestroy: -3,
} as const;

export type MaterialKey = keyof typeof TUNING.materials;
