/**
 * Deterministic, DOM-free sim for the title-screen playground: the 12 sticker
 * bots roam a strip along the bottom of the title screen — waddling, hopping,
 * chasing, leapfrogging, napping, bumping. Stepped at a fixed 1/60 s by the
 * caller; all randomness comes from a seeded LCG so behavior is reproducible
 * and unit-testable.
 *
 * Geometry: x is a pixel position on the stage (screen px), y is height above
 * the ground line (px, ≥ 0). Bots are confined to a list of x-zones — the
 * full-width strip below the title card on tall screens, or the left/right
 * gutters beside the card on short ones. A bot never leaves its zone, so it
 * can never pass under the card's buttons.
 */

export type Zone = { x0: number; x1: number };

export type BotSpec = { id: string; w: number };

export type Behavior =
  | 'idle'
  | 'walk'
  | 'bounce'
  | 'chase'
  | 'flee'
  | 'bump'
  | 'leapfrog'
  | 'duck'
  | 'nap'
  | 'dance'
  | 'surprise'
  | 'watch';

export type SimBot = {
  id: string;
  /** Collision width in px (rendered sticker width). */
  w: number;
  x: number;
  /** Height above the ground line, px. */
  y: number;
  vx: number;
  vy: number;
  /** Facing: -1 left, +1 right — drives lean and eye yaw while traveling. */
  dir: 1 | -1;
  /** Zone index this bot is confined to. */
  zone: number;
  /** Render state for the DOM layer. */
  yaw: number;
  pitch: number;
  lid: number;
  eyeW: number;
  tilt: number;
  sx: number;
  sy: number;
  /** Behavior state machine. */
  kind: Behavior;
  t: number;
  dur: number;
  /** Index of the other bot this behavior interacts with, or -1. */
  target: number;
  /** Walk destination x. */
  spotX: number;
  blinkIn: number;
  blinkT: number;
  /** Next nap "z" puff spawn. */
  zIn: number;
  /** Cooldown before this bot can be bumped again. */
  bumpIn: number;
  /** Remaining hops for bounce/leapfrog. */
  hops: number;
  /** Landing-squash clock (negative = inactive). */
  squashT: number;
};

export type ZPuff = { x: number; y: number; age: number };

export type Playground = {
  bots: SimBot[];
  zones: Zone[];
  time: number;
  seed: number;
  zs: ZPuff[];
  pointerX: number | null;
  /** How many times each behavior has been entered — test observability. */
  counts: Partial<Record<Behavior, number>>;
};

const GRAV = 2100;
const WALK_V = 62;
const CHASE_V = 150;
const FLEE_V = 185;
const HOP_V = 330;
const BIG_HOP_V = 470;
const LEAP_V = 640;
const SURPRISE_V = 560;

function rand(pg: Playground): number {
  pg.seed = (pg.seed * 1664525 + 1013904223) >>> 0;
  return pg.seed / 4294967296;
}

function randRange(pg: Playground, lo: number, hi: number): number {
  return lo + rand(pg) * (hi - lo);
}

function enter(pg: Playground, b: SimBot, kind: Behavior, dur: number, target = -1): void {
  b.kind = kind;
  b.t = 0;
  b.dur = dur;
  b.target = target;
  pg.counts[kind] = (pg.counts[kind] ?? 0) + 1;
}

function pickSpot(pg: Playground, b: SimBot): number {
  const z = pg.zones[b.zone]!;
  const pad = b.w / 2 + 4;
  return randRange(pg, z.x0 + pad, z.x1 - pad);
}

function zoneIndex(pg: Playground, x: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < pg.zones.length; i++) {
    const z = pg.zones[i]!;
    if (x >= z.x0 && x <= z.x1) return i;
    const d = Math.min(Math.abs(x - z.x0), Math.abs(x - z.x1));
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function clampToZone(pg: Playground, b: SimBot): void {
  const z = pg.zones[b.zone]!;
  const pad = b.w / 2;
  if (z.x1 - z.x0 < b.w) {
    b.x = (z.x0 + z.x1) / 2;
  } else {
    b.x = Math.max(z.x0 + pad, Math.min(z.x1 - pad, b.x));
  }
}

export function createPlayground(seed: number, zones: Zone[], specs: BotSpec[]): Playground {
  const pg: Playground = {
    bots: [],
    zones,
    time: 0,
    seed: seed >>> 0 || 1,
    zs: [],
    pointerX: null,
    counts: {},
  };
  specs.forEach((s, i) => {
    const zone = i % Math.max(1, zones.length);
    const z = zones[zone] ?? zones[0]!;
    const b: SimBot = {
      id: s.id,
      w: s.w,
      x: (z.x0 + z.x1) / 2,
      y: 0,
      vx: 0,
      vy: 0,
      dir: i % 2 === 0 ? 1 : -1,
      zone,
      yaw: 0,
      pitch: 0,
      lid: 1,
      eyeW: 1,
      tilt: 0,
      sx: 1,
      sy: 1,
      kind: 'idle',
      t: 0,
      dur: randRange(pg, 0.4, 2.2),
      target: -1,
      spotX: 0,
      blinkIn: randRange(pg, 0.6, 4),
      blinkT: 0,
      zIn: 0.8,
      bumpIn: 0,
      hops: 0,
      squashT: -1,
    };
    // Spread without overlap: grid placement with a deterministic jitter.
    const span = Math.max(s.w + 14, (z.x1 - z.x0) / Math.ceil(specs.length / zones.length));
    const slot = Math.floor(i / zones.length);
    b.x = z.x0 + s.w / 2 + 6 + slot * span + randRange(pg, 0, Math.min(18, span * 0.2));
    clampToZone(pg, b);
    // De-overlap against already-placed bots in the same zone.
    for (const o of pg.bots) {
      if (o.zone !== b.zone) continue;
      const sep = (o.w + b.w) / 2 + 8;
      if (Math.abs(o.x - b.x) < sep) b.x = o.x + sep * Math.sign(b.x - o.x || 1);
    }
    clampToZone(pg, b);
    b.spotX = b.x;
    pg.bots.push(b);
  });
  return pg;
}

/** Recompute allowed areas on resize; bots are re-zoned and clamped. */
export function setZones(pg: Playground, zones: Zone[]): void {
  pg.zones = zones;
  for (const b of pg.bots) {
    b.zone = zoneIndex(pg, b.x);
    const z = pg.zones[b.zone]!;
    if (z.x1 - z.x0 < b.w) b.zone = zoneIndex(pg, (z.x0 + z.x1) / 2);
    clampToZone(pg, b);
    b.spotX = b.x;
  }
}

export function setPointer(pg: Playground, x: number | null): void {
  pg.pointerX = x;
}

/** Tap/click: the bot does a surprised spin-jump; neighbors look at it. */
export function tapBot(pg: Playground, i: number): void {
  const b = pg.bots[i];
  if (!b) return;
  enter(pg, b, 'surprise', 1.1);
  b.vy = SURPRISE_V;
  b.squashT = -1;
  for (let j = 0; j < pg.bots.length; j++) {
    const o = pg.bots[j]!;
    if (j === i || o.zone !== b.zone) continue;
    if (Math.abs(o.x - b.x) < 240 && (o.kind === 'idle' || o.kind === 'walk' || o.kind === 'watch')) {
      enter(pg, o, 'watch', 1.5, i);
    }
  }
}

function pickBehavior(pg: Playground, b: SimBot): void {
  // Neighbor-aware options: chase needs anyone in the same zone, leapfrog
  // wants one close by.
  let nearest = -1;
  let nearestD = Infinity;
  for (let j = 0; j < pg.bots.length; j++) {
    const o = pg.bots[j]!;
    if (o === b || o.zone !== b.zone) continue;
    const d = Math.abs(o.x - b.x);
    if (d < nearestD) {
      nearestD = d;
      nearest = j;
    }
  }
  const canChase = nearest >= 0;
  const canLeap = nearest >= 0 && nearestD < (b.w + pg.bots[nearest]!.w) * 1.6;
  const r = rand(pg);
  if (canLeap && r < 0.16) {
    const o = pg.bots[nearest]!;
    enter(pg, b, 'leapfrog', 1.4, nearest);
    b.dir = o.x >= b.x ? 1 : -1;
    b.vx = b.dir * Math.min(160, (Math.abs(o.x - b.x) + b.w * 0.8) * 1.6);
    b.vy = LEAP_V;
    enter(pg, o, 'duck', 0.9);
    return;
  }
  if (canChase && r < 0.3) {
    enter(pg, b, 'chase', randRange(pg, 2.2, 4), nearest);
    const o = pg.bots[nearest]!;
    if (o.kind === 'idle' || o.kind === 'walk' || o.kind === 'nap') {
      enter(pg, o, 'flee', 4, -1);
      o.target = pg.bots.indexOf(b);
      o.dir = Math.sign(o.x - b.x) >= 0 ? 1 : -1;
    }
    return;
  }
  if (r < 0.48) {
    enter(pg, b, 'bounce', 3.5);
    b.hops = 2 + Math.floor(rand(pg) * 3); // 2–4 hops
    b.vy = BIG_HOP_V * randRange(pg, 0.75, 1);
    return;
  }
  if (r < 0.62) {
    enter(pg, b, 'nap', randRange(pg, 3, 6));
    b.zIn = 0.5;
    return;
  }
  if (r < 0.76) {
    enter(pg, b, 'dance', randRange(pg, 1.2, 1.8));
    // Occasionally a nearby idle bot joins in.
    if (nearest >= 0 && rand(pg) < 0.3 && pg.bots[nearest]!.kind === 'idle' && nearestD < b.w * 3) {
      enter(pg, pg.bots[nearest]!, 'dance', b.dur);
    }
    return;
  }
  if (r < 0.94) {
    enter(pg, b, 'walk', 8);
    b.spotX = pickSpot(pg, b);
    b.dir = b.spotX >= b.x ? 1 : -1;
    return;
  }
  enter(pg, b, 'idle', randRange(pg, 1.5, 5));
}

/** Contact resolution: same-zone, grounded bots that overlap get bumped apart. */
function separate(pg: Playground): void {
  for (let i = 0; i < pg.bots.length; i++) {
    const a = pg.bots[i]!;
    for (let j = i + 1; j < pg.bots.length; j++) {
      const c = pg.bots[j]!;
      if (a.zone !== c.zone || a.y > 10 || c.y > 10) continue;
      const sep = (a.w + c.w) / 2;
      const d = c.x - a.x;
      if (Math.abs(d) >= sep) continue;
      const push = (sep - Math.abs(d)) / 2 + 1;
      const s = d >= 0 ? 1 : -1;
      a.x -= s * push;
      c.x += s * push;
      clampToZone(pg, a);
      clampToZone(pg, c);
      // A real collision (one or both moving in) becomes a bump interaction.
      if (a.bumpIn <= 0 && c.bumpIn <= 0) {
        const closing = Math.abs(a.vx) + Math.abs(c.vx) > 40;
        if (closing || (a.kind !== 'walk' && c.kind !== 'walk')) {
          enter(pg, a, 'bump', 0.55, j);
          enter(pg, c, 'bump', 0.55, i);
          a.bumpIn = 1.4;
          c.bumpIn = 1.4;
          a.vx = -s * randRange(pg, 70, 110);
          c.vx = s * randRange(pg, 70, 110);
          a.vy = HOP_V * 0.55;
          c.vy = HOP_V * 0.55;
          a.squashT = 0;
          c.squashT = 0;
        } else {
          a.spotX = pickSpot(pg, a);
          c.spotX = pickSpot(pg, c);
        }
      }
    }
  }
}

function land(b: SimBot): void {
  if (b.y <= 0 && b.vy < 0) {
    const impact = -b.vy;
    b.y = 0;
    b.vy = 0;
    // Only a real landing squashes — on the ground gravity re-enters below
    // this threshold every step, which would pin the squash clock at 0.
    if (impact > 60) b.squashT = 0;
  }
}

function stepBot(pg: Playground, b: SimBot, dt: number): void {
  b.t += dt;
  b.bumpIn -= dt;
  // Blink: quick lid dip; nappers keep lids shut.
  if (b.kind !== 'nap' && b.kind !== 'duck') {
    b.blinkIn -= dt;
    if (b.blinkIn <= 0) {
      b.blinkIn = randRange(pg, 2.2, 5.2);
      b.blinkT = 0.16;
    }
    if (b.blinkT > 0) {
      b.blinkT -= dt;
      b.lid = 0.1;
    } else {
      b.lid = 1;
    }
  }
  // Landing squash decays back to 1.
  if (b.squashT >= 0) {
    b.squashT += dt;
    const e = Math.exp(-7 * b.squashT);
    b.sy = 1 - 0.28 * e * Math.cos(11 * b.squashT);
    b.sx = 1 + 0.22 * e * Math.cos(11 * b.squashT);
    if (b.squashT > 0.9) {
      b.squashT = -1;
      b.sx = 1;
      b.sy = 1;
    }
  }

  switch (b.kind) {
    case 'idle': {
      // Eyes: watch the pointer if it hovers the stage, else the nearest bot.
      if (pg.pointerX !== null) {
        b.yaw += ((Math.sign(pg.pointerX - b.x) * 0.42) - b.yaw) * Math.min(1, dt * 8);
      } else if (b.target >= 0 && pg.bots[b.target]) {
        const o = pg.bots[b.target]!;
        b.yaw += ((Math.sign(o.x - b.x) * 0.4) - b.yaw) * Math.min(1, dt * 6);
      } else {
        // Pick a nearest bot to watch occasionally.
        let nd = Infinity;
        let ni = -1;
        for (let j = 0; j < pg.bots.length; j++) {
          if (pg.bots[j] === b || pg.bots[j]!.zone !== b.zone) continue;
          const d = Math.abs(pg.bots[j]!.x - b.x);
          if (d < nd) {
            nd = d;
            ni = j;
          }
        }
        b.target = ni;
        b.yaw *= 1 - Math.min(1, dt * 4);
        b.yaw += Math.sin(pg.time * 0.8 + b.x * 0.01) * 0.004;
      }
      b.tilt *= 1 - Math.min(1, dt * 6);
      if (b.t >= b.dur) pickBehavior(pg, b);
      break;
    }
    case 'walk': {
      b.dir = b.spotX >= b.x ? 1 : -1;
      b.vx = b.dir * WALK_V * (56 / Math.max(30, b.w));
      b.x += b.vx * dt;
      // Little hop every step cycle + waddle tilt.
      const stepT = b.t * (WALK_V / 34);
      const ph = stepT % 1;
      if (ph < 0.35 && b.y === 0) b.vy = HOP_V * 0.4;
      b.tilt = Math.sin(stepT * Math.PI * 2) * 0.14 * b.dir;
      b.yaw += (b.dir * 0.45 - b.yaw) * Math.min(1, dt * 8);
      const z = pg.zones[b.zone]!;
      const pad = b.w / 2 + 2;
      if ((b.dir > 0 && b.x >= Math.min(b.spotX, z.x1 - pad)) || (b.dir < 0 && b.x <= Math.max(b.spotX, z.x0 + pad))) {
        b.vx = 0;
        enter(pg, b, 'idle', randRange(pg, 1.2, 3.4));
      }
      break;
    }
    case 'bounce': {
      b.tilt *= 1 - Math.min(1, dt * 8);
      if (b.y === 0 && b.vy === 0) {
        if (b.hops > 0) {
          b.hops--;
          b.vy = BIG_HOP_V * randRange(pg, 0.8, 1);
          b.sy = 1.22;
          b.sx = 0.86;
          b.squashT = -1;
        } else {
          enter(pg, b, 'idle', randRange(pg, 1, 2.6));
        }
      }
      break;
    }
    case 'chase': {
      const o = pg.bots[b.target];
      if (!o || b.t >= b.dur || o.zone !== b.zone) {
        enter(pg, b, 'idle', randRange(pg, 0.8, 2));
        break;
      }
      b.dir = o.x >= b.x ? 1 : -1;
      b.vx = b.dir * CHASE_V;
      b.x += b.vx * dt;
      b.tilt = 0.1 * b.dir;
      b.yaw += (b.dir * 0.5 - b.yaw) * Math.min(1, dt * 10);
      const stepT = b.t * (CHASE_V / 30);
      if (stepT % 1 < 0.3 && b.y === 0) b.vy = HOP_V * 0.45;
      // Contact is resolved into a bump by the separation pass.
      break;
    }
    case 'flee': {
      const o = pg.bots[b.target];
      if (!o || o.kind !== 'chase' || b.t >= b.dur) {
        enter(pg, b, 'idle', randRange(pg, 0.8, 2));
        break;
      }
      b.dir = Math.sign(b.x - o.x) >= 0 ? 1 : -1;
      const z = pg.zones[b.zone]!;
      const pad = b.w / 2 + 2;
      // Cornered? Cut back under the chaser.
      if ((b.dir > 0 && b.x > z.x1 - pad - 6) || (b.dir < 0 && b.x < z.x0 + pad + 6)) b.dir *= -1;
      b.vx = b.dir * FLEE_V;
      b.x += b.vx * dt;
      b.eyeW = 1.25;
      b.tilt = 0.12 * b.dir;
      b.yaw += (b.dir * 0.55 - b.yaw) * Math.min(1, dt * 10);
      const stepT = b.t * (FLEE_V / 30);
      if (stepT % 1 < 0.3 && b.y === 0) b.vy = HOP_V * 0.5;
      break;
    }
    case 'bump': {
      b.x += b.vx * dt;
      b.vx *= 1 - Math.min(1, dt * 5);
      // Face each other during the recoil.
      const o = pg.bots[b.target];
      if (o) b.yaw += ((Math.sign(o.x - b.x) * 0.5) - b.yaw) * Math.min(1, dt * 10);
      if (b.t >= b.dur) {
        // Sometimes a happy little hop afterward.
        if (rand(pg) < 0.3) {
          b.vy = BIG_HOP_V * 0.7;
          enter(pg, b, 'bounce', 2);
          b.hops = 1;
        } else {
          enter(pg, b, 'idle', randRange(pg, 0.8, 2.2));
        }
      }
      break;
    }
    case 'leapfrog': {
      b.x += b.vx * dt;
      b.tilt = b.dir * 0.35 * Math.min(1, b.t * 4);
      b.yaw = b.dir * 0.55;
      if (b.y === 0 && b.vy === 0 && b.t > 0.15) {
        b.tilt = 0;
        b.vx = 0;
        enter(pg, b, 'idle', randRange(pg, 0.8, 2));
      }
      break;
    }
    case 'duck': {
      const k = Math.sin(Math.min(1, b.t / b.dur) * Math.PI);
      b.sy = 1 - 0.35 * k;
      b.sx = 1 + 0.25 * k;
      b.lid = 1 - 0.7 * k;
      b.yaw += (0 - b.yaw) * Math.min(1, dt * 6);
      b.pitch = -0.5 * k; // look up at the hopper
      if (b.t >= b.dur) {
        b.pitch = 0;
        enter(pg, b, 'idle', randRange(pg, 0.8, 2));
      }
      break;
    }
    case 'nap': {
      b.lid = 0.08;
      const br = Math.sin(b.t * 1.8) * 0.04;
      b.sy = 1 + br;
      b.sx = 1 - br * 0.6;
      b.tilt *= 1 - Math.min(1, dt * 4);
      b.zIn -= dt;
      if (b.zIn <= 0) {
        b.zIn = randRange(pg, 0.7, 1.2);
        pg.zs.push({ x: b.x + b.w * 0.3, y: b.y + b.w * 0.9, age: 0 });
      }
      if (b.t >= b.dur) enter(pg, b, 'idle', randRange(pg, 0.6, 1.6));
      break;
    }
    case 'dance': {
      const p = b.t / b.dur;
      // Twirl on the first half, wiggle on the second, hop at the end.
      if (p < 0.55) {
        b.tilt = Math.sin(p * Math.PI * 2) * 0.6;
        b.yaw = Math.sin(p * Math.PI * 4) * 0.9;
      } else {
        b.tilt = Math.sin(p * Math.PI * 8) * 0.2;
        b.yaw = Math.sin(p * Math.PI * 6) * 0.5;
      }
      if (p > 0.8 && b.y === 0 && b.vy === 0) b.vy = BIG_HOP_V * 0.6;
      if (b.t >= b.dur) {
        b.tilt = 0;
        enter(pg, b, 'idle', randRange(pg, 0.8, 2));
      }
      break;
    }
    case 'surprise': {
      b.tilt = b.dir * (b.t / b.dur) * Math.PI * 2; // full spin
      b.yaw = b.dir * 0.6;
      b.eyeW = 1.3;
      b.lid = 1;
      if (b.t >= b.dur) {
        b.tilt = 0;
        enter(pg, b, 'idle', randRange(pg, 0.8, 2));
      }
      break;
    }
    case 'watch': {
      const o = pg.bots[b.target];
      if (o) b.yaw += ((Math.sign(o.x - b.x) * 0.5) - b.yaw) * Math.min(1, dt * 10);
      if (b.t >= b.dur) enter(pg, b, 'idle', randRange(pg, 0.8, 2));
      break;
    }
  }

  // Gravity + ground.
  b.y += b.vy * dt;
  b.vy -= GRAV * dt;
  land(b);
  clampToZone(pg, b);
  if (b.kind !== 'flee' && b.kind !== 'surprise' && b.kind !== 'duck') b.eyeW += (1 - b.eyeW) * Math.min(1, dt * 8);
  if (b.kind !== 'duck') b.pitch *= 1 - Math.min(1, dt * 4);
}

export function step(pg: Playground, dt: number): void {
  pg.time += dt;
  separate(pg);
  for (const b of pg.bots) stepBot(pg, b, dt);
  // Age and expire z puffs (rise + fade handled by the renderer via age).
  for (let i = pg.zs.length - 1; i >= 0; i--) {
    pg.zs[i]!.age += dt;
    if (pg.zs[i]!.age > 1.4) pg.zs.splice(i, 1);
  }
}
