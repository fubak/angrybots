// Reference headless simulation for AngryBots v2 (Planck.js).
// Used to validate level layouts (overlap, support, settle) and to calibrate tuning.
import planck from 'planck';
const { World, Vec2, Box, Circle, Polygon } = planck;

export const TUNING = {
  gravity: -18,
  dt: 1 / 60,
  velIters: 10,
  posIters: 8,
  settleSeconds: 2.0, // structures settle with damage disabled before play
  minApproachSpeed: 0.8, // m/s; contacts closing slower than this deal no damage
  materials: {
    wood:  { density: 0.6, friction: 0.6, restitution: 0.1, hp: 16, minImpulse: 0.6, damageScale: 1.0 },
    stone: { density: 2.4, friction: 0.8, restitution: 0.05, hp: 60, minImpulse: 1.5, damageScale: 1.0 },
    glass: { density: 0.5, friction: 0.25, restitution: 0.1, hp: 6, minImpulse: 0.3, damageScale: 1.0 },
    tnt:   { density: 0.5, friction: 0.6, restitution: 0.1, hp: 3, minImpulse: 0.5, damageScale: 1.0 },
  },
  pig: {
    density: 0.8, friction: 0.6, restitution: 0.15,
    sizes: { S: { r: 0.4, hp: 3 }, M: { r: 0.55, hp: 6 }, L: { r: 0.75, hp: 12 } },
    minImpulse: 1.0, helmetMultiplier: 2.5,
  },
  bot: { r: 0.58, density: 1.0, friction: 0.5, restitution: 0.25, damageScale: 1.0 },
  // Per-kind bodies, matching 04-slingshot-and-bots.md (abilities and affinity are not simulated here).
  bots: { grok: { r: 0.58, density: 1.0 }, dash: { r: 0.5, density: 1.0 }, split: { r: 0.5, density: 1.0 },
          heavy: { r: 0.72, density: 1.1 }, blast: { r: 0.62, density: 1.0 } },
  tnt: { radius: 3.0, impulse: 14, damage: 40 },
  sling: { x: -7.5, y: 2.2, maxSpeed: 23 },
};

export const SCORE = { pig: 5000, unusedBot: 10000, destroy: { glass: 300, wood: 500, stone: 800, tnt: 500 }, damagePerHp: 10 };

export const BLOCK_KIT = {
  plankL: [4.0, 0.4], plankM: [2.0, 0.4], plankS: [1.0, 0.4],
  postL: [0.4, 2.0], postM: [0.4, 1.2], postS: [0.4, 0.8],
  cube: [0.8, 0.8], cubeS: [0.4, 0.4], slab: [2.0, 0.8],
};

/** Level v2: all y values are BOTTOM edges. Boxes are axis-aligned. */
export function expandLevel(level) {
  const blocks = level.blocks.map((b, i) => {
    const [w, h] = b.kit ? BLOCK_KIT[b.kit] : [b.w, b.h];
    return { id: b.id ?? `b${i}`, material: b.material, shape: b.shape ?? 'box', w, h,
      r: b.r, cx: b.x, cy: b.shape === 'circle' ? b.y + b.r : b.y + h / 2 };
  });
  const pigs = level.pigs.map((p, i) => {
    const r = TUNING.pig.sizes[p.size].r;
    return { id: `p${i}`, size: p.size, helmet: !!p.helmet, r, cx: p.x, cy: p.y + r };
  });
  return { ...level, blocks, pigs, terrain: level.terrain ?? [] };
}

function aabb(b) {
  if (b.shape === 'circle') return [b.cx - b.r, b.cy - b.r, b.cx + b.r, b.cy + b.r];
  return [b.cx - b.w / 2, b.cy - b.h / 2, b.cx + b.w / 2, b.cy + b.h / 2];
}

/** Static checks: returns array of error strings. EPS allows touching. */
export function validateStatic(levelRaw) {
  const L = expandLevel(levelRaw); const EPS = 0.002; const errs = [];
  const boxes = L.blocks;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = aabb(boxes[i]), b = aabb(boxes[j]);
    const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
    const oy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    if (ox > EPS && oy > EPS) errs.push(`overlap ${boxes[i].id} x ${boxes[j].id}`);
  }
  for (const p of L.pigs) for (const b of boxes) {
    const [x0, y0, x1, y1] = aabb(b);
    const qx = Math.max(x0 - p.cx, 0, p.cx - x1), qy = Math.max(y0 - p.cy, 0, p.cy - y1);
    if (Math.hypot(qx, qy) < p.r - EPS) errs.push(`pig ${p.id} inside ${b.id}`);
  }
  for (let i = 0; i < L.pigs.length; i++) for (let j = i + 1; j < L.pigs.length; j++) {
    const a = L.pigs[i], b = L.pigs[j];
    if (Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r - EPS) errs.push(`pig ${a.id} x ${b.id}`);
  }
  // support: every body's bottom touches ground (y=0), terrain top, or another body's top with x-overlap
  const tops = boxes.map((b) => ({ id: b.id, y: aabb(b)[3], x0: aabb(b)[0], x1: aabb(b)[2] }));
  for (const t of L.terrain) tops.push({ id: 'terrain', y: t.top, x0: t.x0, x1: t.x1 });
  const supported = (bottom, x0, x1, selfId) => bottom < 0.003 || tops.some((t) => t.id !== selfId &&
    Math.abs(t.y - bottom) < 0.003 && Math.min(x1, t.x1) - Math.max(x0, t.x0) > 0.05);
  for (const b of boxes) { const a = aabb(b); if (!supported(a[1], a[0], a[2], b.id)) errs.push(`unsupported ${b.id}`); }
  for (const p of L.pigs) if (!supported(p.cy - p.r, p.cx - 0.05, p.cx + 0.05, p.id)) errs.push(`unsupported ${p.id}`);
  return errs;
}

export function buildWorld(levelRaw) {
  const L = expandLevel(levelRaw); const T = TUNING;
  const world = new World({ gravity: Vec2(0, T.gravity), allowSleep: true });
  const ground = world.createBody({ type: 'static' });
  ground.createFixture({ shape: Box(60, 1, Vec2(10, -1), 0), friction: 0.8 });
  for (const t of L.terrain) {
    const g = world.createBody({ type: 'static' });
    g.createFixture({ shape: Box((t.x1 - t.x0) / 2, t.top / 2, Vec2((t.x0 + t.x1) / 2, t.top / 2), 0), friction: 0.8 });
  }
  const ents = [];
  for (const b of L.blocks) {
    const m = T.materials[b.material];
    const body = world.createBody({ type: 'dynamic', position: Vec2(b.cx, b.cy) });
    const shape = b.shape === 'circle' ? Circle(b.r) : Box(b.w / 2, b.h / 2);
    body.createFixture({ shape, density: m.density, friction: m.friction, restitution: m.restitution });
    const e = { kind: 'block', def: b, body, hp: m.hp, maxHp: m.hp, dead: false, mat: m, material: b.material };
    body.setUserData(e); ents.push(e);
  }
  for (const p of L.pigs) {
    const body = world.createBody({ type: 'dynamic', position: Vec2(p.cx, p.cy) });
    body.createFixture({ shape: Circle(p.r), density: T.pig.density, friction: T.pig.friction, restitution: T.pig.restitution });
    const hp = T.pig.sizes[p.size].hp * (p.helmet ? T.pig.helmetMultiplier : 1);
    const e = { kind: 'pig', def: p, body, hp, maxHp: hp, dead: false };
    body.setUserData(e); ents.push(e);
  }
  const state = { world, ents, damageOn: false, queue: [], log: [], score: 0, bot: null };
  // Approach speed is measured BEFORE the solver runs. Resting contacts have ~0 approach
  // speed, so static load never counts as damage (only impacts do).
  const approach = new WeakMap();
  world.on('pre-solve', (contact) => {
    const wm = contact.getWorldManifold(null); if (!wm || !wm.points.length) return;
    const bA = contact.getFixtureA().getBody(), bB = contact.getFixtureB().getBody();
    let maxV = 0;
    for (const p of wm.points) {
      const vA = bA.getLinearVelocityFromWorldPoint(p), vB = bB.getLinearVelocityFromWorldPoint(p);
      const vn = -((vB.x - vA.x) * wm.normal.x + (vB.y - vA.y) * wm.normal.y);
      maxV = Math.max(maxV, vn);
    }
    approach.set(contact, maxV);
  });
  world.on('post-solve', (contact, impulse) => {
    if (!state.damageOn) return;
    if ((approach.get(contact) ?? 0) < TUNING.minApproachSpeed) return;
    const I = impulse.normalImpulses.reduce((a, b) => a + b, 0);
    const a = contact.getFixtureA().getBody().getUserData();
    const b = contact.getFixtureB().getBody().getUserData();
    for (const e of [a, b]) if (e && !e.dead) state.queue.push([e, I]);
  });
  return state;
}

function applyDamage(state, e, I) {
  if (e.dead || e.kind === 'bot') return;
  const min = e.kind === 'pig' ? TUNING.pig.minImpulse : e.mat.minImpulse;
  if (I <= min) return;
  const dmg = (I - min) * (e.kind === 'pig' ? 1 : e.mat.damageScale);
  if (e.kind === 'block') state.score += SCORE.damagePerHp * Math.round(Math.min(dmg, Math.max(e.hp, 0)));
  e.hp -= dmg;
  if (e.hp <= 0) kill(state, e);
}

function kill(state, e) {
  if (e.dead) return; e.dead = true;
  const pos = e.body.getPosition().clone();
  state.log.push(`${e.kind}:${e.def.id}`);
  state.score += e.kind === 'pig' ? SCORE.pig : SCORE.destroy[e.material];
  state.world.destroyBody(e.body);
  if (e.kind === 'block' && e.material === 'tnt') explode(state, pos);
}

function explode(state, c) {
  const { radius, impulse, damage } = TUNING.tnt;
  for (const e of state.ents) {
    if (e.dead) continue;
    const p = e.body.getWorldCenter(); const d = Vec2.sub(p, c); const dist = d.length();
    if (dist > radius) continue;
    const f = 1 - dist / radius; if (dist > 1e-4) d.mul(1 / dist); else d.set(0, 1);
    e.body.applyLinearImpulse(Vec2.mul(d, impulse * f), p, true);
    state.pendingBlast = state.pendingBlast ?? [];
    state.pendingBlast.push([e, damage * f]);
  }
}

export function step(state) {
  state.world.step(TUNING.dt, TUNING.velIters, TUNING.posIters);
  const q = state.queue; state.queue = [];
  // aggregate per entity per step (a body may have many contacts)
  const agg = new Map();
  for (const [e, I] of q) agg.set(e, Math.max(agg.get(e) ?? 0, I));
  for (const [e, I] of agg) applyDamage(state, e, I);
  const pb = state.pendingBlast ?? []; state.pendingBlast = [];
  for (const [e, d] of pb) if (!e.dead) {
    if (e.kind === 'block') state.score += SCORE.damagePerHp * Math.round(Math.min(d, Math.max(e.hp, 0)));
    e.hp -= d; if (e.hp <= 0) kill(state, e); }
}

export function settle(state) {
  const n = Math.round(TUNING.settleSeconds / TUNING.dt);
  const start = state.ents.map((e) => ({ e, p: e.body.getPosition().clone(), a: e.body.getAngle() }));
  for (let i = 0; i < n; i++) step(state);
  let maxMove = 0, maxRot = 0;
  for (const s of start) { if (s.e.dead) continue;
    maxMove = Math.max(maxMove, Vec2.distance(s.p, s.e.body.getPosition()));
    if (s.e.kind === 'block') maxRot = Math.max(maxRot, Math.abs(s.e.body.getAngle() - s.a)); }
  state.damageOn = true;
  return { maxMove, maxRotDeg: maxRot * 180 / Math.PI };
}

/** Continue settled world with damage on, no input: nothing may die. */
export function idle(state, seconds = 3) {
  const before = state.log.length;
  for (let i = 0; i < seconds / TUNING.dt; i++) step(state);
  return state.log.slice(before);
}

export function shoot(state, angleDeg, speed, kind = 'grok') {
  const T = TUNING; const prof = T.bots[kind] ?? T.bots.grok;
  const body = state.world.createBody({ type: 'dynamic', position: Vec2(T.sling.x, T.sling.y), bullet: true });
  body.createFixture({ shape: Circle(prof.r), density: prof.density, friction: T.bot.friction, restitution: T.bot.restitution });
  const a = angleDeg * Math.PI / 180;
  body.setLinearVelocity(Vec2(Math.cos(a) * speed, Math.sin(a) * speed));
  const e = { kind: 'bot', body, dead: false }; body.setUserData(e); state.bot = e;
  let t = 0; let quiet = 0;
  while (t < 14) {
    step(state); t += T.dt;
    let moving = false;
    for (let b = state.world.getBodyList(); b; b = b.getNext()) {
      if (b.isDynamic() && b.isAwake() && b.getLinearVelocity().length() > 0.15) { moving = true; break; }
    }
    const bp = body.getPosition();
    if (bp.x > 40 || bp.x < -15) { state.world.destroyBody(body); state.bot = null; break; }
    quiet = moving ? 0 : quiet + T.dt;
    if (quiet > 0.6 && t > 1) break;
  }
  if (state.bot) { state.world.destroyBody(state.bot.body); state.bot = null; }
  return t;
}

export function pigsAlive(state) { return state.ents.filter((e) => e.kind === 'pig' && !e.dead).length; }

/** Planck can't deep-copy a world; rebuild and replay shots instead. shots: [angleDeg, speed, botKind][] */
export function replay(level, shots) {
  const s = buildWorld(level); settle(s);
  for (const [a, v, kind] of shots) { if (pigsAlive(s) === 0) break; shoot(s, a, v, kind); }
  return s;
}
