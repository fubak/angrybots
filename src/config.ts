export const GRAVITY = -18;
/** Structural fork center (bands attach here visually). */
export const SLING_ANCHOR = { x: -7.5, y: 2.2, z: 0 };
/** Bird perch in the sling cup (left of fork, toward -X / away from structure). */
export const SLING_PERCH_OFFSET = { x: -0.55, y: 0.05 };
/** Max stretch beyond perch (world units). */
export const SLING_MAX_PULL = 3.15;
/** Launch speed scale at full draw (m/s before direction). */
export const SLING_POWER = 40;
export const SLING_POWER_EXPONENT = 0.88;
export const SLING_SNAP_BOOST = 1.08;
export const SLING_COIL_HOLD_SEC = 0.055;
export const SLING_MAX_LAUNCH_SPEED = 20.5;
export const SLING_LAUNCH_SPEED_FLOOR = 11;
export const GROK_BOT_RADIUS = 0.58;
export const GROUND_CONTACT_Y = GROK_BOT_RADIUS + 0.14;
export const GROK_BOT_MASS = 1.2;
export const SLING_LINEAR_DAMPING = 0.02;
export const SLING_GRAB_RADIUS = 2.4;
export const SLING_MIN_EFFECTIVE_PULL = 0.32;
export const SLING_MAX_PULL_DOWN = 1.55;
export const SLING_AIM_CONE_DEG = 165;
export const SLING_MIN_LAUNCH_LIFT = 0.38;
export const SLING_SCREEN_PULL_GAIN = 7.2;
export const WORLD_BOUNDS = { minX: -12, maxX: 18, minY: -2, maxY: 14 };

/** Side-on framing (camera on +Z, gameplay in XY). */
export const SIDE_VIEW = {
  centerX: -2,
  centerY: 2.35,
  cameraZ: 42,
  frustumHeight: 12.5,
} as const;

/** Portrait: wider vertical frustum so sling + fort fit on phones. */
export const PORTRAIT_FRUSTUM_HEIGHT = 18.5;

export type BlockMaterial = 'wood' | 'stone' | 'glass' | 'explosive';

export const MATERIAL = {
  wood: {
    color: 0xc68a4a,
    splinterColor: 0x8b5a2b,
    hp: 40,
    mass: 0.8,
    restitution: 0.15,
    damageScale: 1.05,
    minImpulse: 2.8,
    minDamage: 5,
    breakDebris: 26,
    chainRadius: 1.35,
    chainDamageScale: 0.42,
    fallSpeedThreshold: 9,
    fallDamageScale: 2.2,
    blastRadius: 0,
    blastImpulse: 0,
    blastDamage: 0,
  },
  stone: {
    color: 0x888888,
    splinterColor: 0x555555,
    hp: 120,
    mass: 2.5,
    restitution: 0.08,
    damageScale: 0.55,
    minImpulse: 4.5,
    minDamage: 8,
    breakDebris: 14,
    chainRadius: 1.1,
    chainDamageScale: 0.28,
    fallSpeedThreshold: 11,
    fallDamageScale: 3.5,
    blastRadius: 0,
    blastImpulse: 0,
    blastDamage: 0,
  },
  glass: {
    color: 0xaeefff,
    splinterColor: 0xd8f8ff,
    hp: 25,
    mass: 0.5,
    restitution: 0.35,
    damageScale: 2.6,
    minImpulse: 1.6,
    minDamage: 3,
    breakDebris: 34,
    chainRadius: 1.55,
    chainDamageScale: 0.65,
    fallSpeedThreshold: 6,
    fallDamageScale: 4.5,
    blastRadius: 0,
    blastImpulse: 0,
    blastDamage: 0,
  },
  explosive: {
    color: 0xff6622,
    splinterColor: 0xffcc00,
    hp: 22,
    mass: 0.65,
    restitution: 0.2,
    damageScale: 1.4,
    minImpulse: 1.8,
    minDamage: 4,
    breakDebris: 48,
    chainRadius: 1.2,
    chainDamageScale: 0.35,
    fallSpeedThreshold: 7,
    fallDamageScale: 3,
    blastRadius: 3.1,
    blastImpulse: 26,
    blastDamage: 55,
  },
} as const;
