export const GRAVITY = -18;
/** Structural fork center (bands attach here visually). */
export const SLING_ANCHOR = { x: -7.5, y: 2.2, z: 0 };
/** Bird perch in the sling cup (left of fork, toward -X / away from structure). */
export const SLING_PERCH_OFFSET = { x: -0.55, y: 0.05 };
/** Max stretch beyond perch (world units). */
export const SLING_MAX_PULL = 3.15;
/** Base impulse scale; combined with tension curve at launch. */
/** Target launch speed scale at full draw (m/s before curve/snap). */
export const SLING_POWER = 40;
/** Exponent >1 = more punch at full draw (Angry Birds late curve). */
/** Lower = more punch on quarter/half draws (AB mid-ladder). */
export const SLING_POWER_EXPONENT = 0.88;
/** Extra multiplier when releasing near max tension quickly. */
export const SLING_SNAP_BOOST = 1.14;
/** AB-style perch hold after release before the bird launches (s). */
export const SLING_COIL_HOLD_SEC = 0.055;
/** Launch speed ceiling at full draw (m/s). */
export const SLING_MAX_LAUNCH_SPEED = 20.5;
/** Speed floor at minimal draw; cap interpolates between floor and max by pull depth. */
export const SLING_LAUNCH_SPEED_FLOOR = 11;
/** Trim cap for shallow-mid screen quarter (t ≈ 0.38–0.52). */
export const SLING_QUARTER_MID_CAP_TRIM = 0.975;
/** Trim cap for half-draw band (t ≈ 0.52–0.68) — keeps maxX in ~4.4–4.7. */
export const SLING_HALF_DRAW_CAP_TRIM = 0.993;
/** Trim deep-mid (t ≈ 0.69–0.84) — separates saturated 65% from true max (t≥0.85). */
export const SLING_UPPER_MID_CAP_TRIM = 0.962;
/** Screen stretch curve (>1 = max pixel drag earns extra tension vs mid drag). */
export const SLING_SCREEN_PULL_CURVE = 1.22;
/** Cap screen-space along for sub-max drags (65% AB pull stays below max saturation). */
export const SLING_SCREEN_MID_ALONG_CAP = 2.28;
/** Max effective stretch for 65% screen tier (peak NDC below full threshold). */
export const SLING_SCREEN_MID_LEN_FRAC = 0.88;
/** Max stretch for quarter-tier screen drags (peak NDC ≲ 0.45). */
export const SLING_SCREEN_SHALLOW_LEN_FRAC = 0.892;
/** Extra along for quarter-tier screen drags (peak NDC ≲ 0.45). */
export const SLING_SHALLOW_ALONG_BONUS = 0.262;
/** Launch cap trim when peak screen drag stayed shallow (separates 35% from 65%). */
export const SLING_SHALLOW_TIER_CAP_TRIM = 0.984;
/** Extra along-units only on deep (100%) screen drags. */
export const SLING_MAX_DRAG_ALONG_BONUS = 1.08;
/** NDC drag magnitude that counts as AB full screen pull. */
export const SLING_MAX_DRAG_NDC_MIN = 0.72;
/** Speed boost only at true max tension (t ≥ 0.89). */
export const SLING_TRUE_MAX_DRAW_BOOST = 1.06;
export const SLING_SOFT_CLAMP_START = 0.8;
export const SLING_MIN_EFFECTIVE_PULL = 0.32;
/** Max stretch downward (world Y) so the bot stays above ground while aiming. */
export const SLING_MAX_PULL_DOWN = 1.55;
/** Extra down-clamp headroom for true max screen drags (65% stays tighter). */
export const SLING_MAX_PULL_DOWN_DEEP_MUL = 1.22;
export const GROK_BOT_RADIUS = 0.58;
/** Bot center Y when resting on terrain (trajectory + settle). */
export const GROUND_CONTACT_Y = GROK_BOT_RADIUS + 0.14;
export const GROK_BOT_MASS = 1.2;
export const SLING_LINEAR_DAMPING = 0.02;
export const SLING_GRAB_RADIUS = 2.4;
/** NDC drag (bottom-left AB pull) → effective stretch length. */
export const SLING_SCREEN_PULL_GAIN = 8.1;
export const SLING_AIM_CONE_DEG = 165;
/** Minimum upward launch fraction so flat pulls still reach the fort yard. */
export const SLING_MIN_LAUNCH_LIFT = 0.38;
export const WORLD_BOUNDS = { minX: -12, maxX: 18, minY: -2, maxY: 14 };

/** Side-on POC framing (camera on +Z, gameplay in XY). */
export const SIDE_VIEW = {
  /** Frames slingshot full pull (~x−11) through fort (~x+7). */
  centerX: -2,
  centerY: 2.35,
  cameraZ: 42,
  /** Ortho height in world units (was 9 — too tight for AB-style pull). */
  frustumHeight: 12.5,
} as const;

export type BlockMaterial = 'wood' | 'stone' | 'glass' | 'explosive';

/** Per-material destruction tuning (impulse ≈ impact speed along contact normal). */
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
    /** Secondary splinters + dust on break. */
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
