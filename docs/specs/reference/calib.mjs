import planck from 'planck';
import { TUNING, buildWorld, settle, step } from './sim.mjs';
const { Vec2, Circle } = planck;
function fire(s, x, y, vx, vy, kind = 'grok') { const p = TUNING.bots[kind];
  const b = s.world.createBody({ type: 'dynamic', position: Vec2(x, Math.max(y, p.r)), bullet: true });
  b.createFixture({ shape: Circle(p.r), density: p.density, friction: 0.5, restitution: 0.25 });
  b.setLinearVelocity(Vec2(vx, vy)); b.setUserData({ kind: 'bot', body: b }); for (let i = 0; i < 240; i++) step(s); }
const res = (s) => s.ents.map((e) => `${e.def.id}:${e.dead ? 'DEAD' : (e.hp / e.maxHp).toFixed(2)}`).join(' ');
const run = (n, L, f) => { const s = buildWorld(L); settle(s); f(s); console.log(n.padEnd(40), res(s)); };
const pig = (size, helmet) => ({ pigs: [{ x: 5, y: 0, size, helmet }], blocks: [] });
for (const h of [0.6, 1.0, 1.2, 2.0, 3.0]) run(`M pig falls ${h}`, pig('M'), (s) => { const p = s.ents[0].body; p.setPosition(Vec2(5, 0.55 + h)); p.setAwake(true); for (let i = 0; i < 180; i++) step(s); });
for (const v of [8, 10, 12, 14, 16]) run(`bot ${v} -> M pig`, pig('M'), (s) => fire(s, 3.5, 0.6, v, 0));
for (const v of [14, 18, 20]) run(`bot ${v} -> S pig`, pig('S'), (s) => fire(s, 3.5, 0.6, v, 0));
for (const v of [18, 20, 23]) run(`bot ${v} -> L pig`, pig('L'), (s) => fire(s, 3.2, 0.6, v, 0));
run('heavy 23 -> L helmet', pig('L', true), (s) => fire(s, 3.0, 0.72, 23, 0, 'heavy'));
for (const v of [8, 10, 12, 14]) run(`bot ${v} -> glass cube`, { pigs: [], blocks: [{ material: 'glass', kit: 'cube', x: 5, y: 0 }] }, (s) => fire(s, 3.5, 0.4, v, 0));
for (const v of [16, 18, 20, 23]) run(`bot ${v} -> wood cube`, { pigs: [], blocks: [{ material: 'wood', kit: 'cube', x: 5, y: 0 }] }, (s) => fire(s, 3.5, 0.4, v, 0));
run('grok 23 -> stone cube', { pigs: [], blocks: [{ material: 'stone', kit: 'cube', x: 5, y: 0 }] }, (s) => fire(s, 3.5, 0.4, 23, 0));
run('heavy 23 -> stone cube', { pigs: [], blocks: [{ material: 'stone', kit: 'cube', x: 5, y: 0 }] }, (s) => fire(s, 3.0, 0.72, 23, 0, 'heavy'));
// static load: tall heavy stack 10s must take zero damage
run('static heavy stack 10s', { pigs: [{ x: 5, y: 2.8, size: 'M' }], blocks: [
  { id: 'a', material: 'wood', kit: 'postL', x: 3.2, y: 0 }, { id: 'b', material: 'wood', kit: 'postL', x: 6.8, y: 0 },
  { id: 'c', material: 'stone', kit: 'plankL', x: 5, y: 2 }, { id: 'd', material: 'stone', kit: 'cube', x: 3.6, y: 2.4 },
  { id: 'e', material: 'stone', kit: 'cube', x: 6.4, y: 2.4 }, { id: 'f', material: 'stone', kit: 'cube', x: 3.6, y: 3.2 }, { id: 'g', material: 'stone', kit: 'cube', x: 6.4, y: 3.2 } ] },
  (s) => { for (let i = 0; i < 600; i++) step(s); });
for (const d of [1.0, 2.0, 2.8]) run(`TNT pig at ${d}`, { pigs: [{ x: 5 + d, y: 0, size: 'M' }], blocks: [{ material: 'tnt', kit: 'cube', x: 5, y: 0 }] }, (s) => fire(s, 3.3, 0.4, 16, 0));
run('C14 dash 20 -> wood cube (no affinity)', { pigs: [], blocks: [{ material: 'wood', kit: 'cube', x: 5, y: 0 }] }, (s) => fire(s, 3.3, 0.5, 20, 0, 'dash'));
run('C16 split child r.38 14 -> glass postL (no affinity)', { pigs: [], blocks: [{ material: 'glass', kit: 'postL', x: 5, y: 0 }] }, (s) => { TUNING.bots.child = { r: 0.38, density: 1.0 }; fire(s, 3.2, 0.8, 14, 0, 'child'); });
