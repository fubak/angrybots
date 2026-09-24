import planck, { type Body, type World, Vec2 } from 'planck';
import { TUNING } from '../config/tuning';
import { filterBits, CAT, MASK } from '../physics/categories';
import type { ExpandedBlock, ExpandedPig } from '../levels/expand';
import type { BlockEntity, PigEntity, TerrainEntity } from './types';
import type { TerrainV2 } from '../levels/schema';

const { Box, Circle, Polygon } = planck;

const mat = (density: number, friction: number, restitution: number, cat: number, mask: number) => ({
  density,
  friction,
  restitution,
  ...filterBits(cat, mask),
});

export function createGround(world: World): Body {
  const ground = world.createBody({ type: 'static' });
  ground.createFixture(Box(60, 1, Vec2(10, -1), 0), { friction: 0.8 });
  ground.setUserData({ kind: 'ground', id: 'ground', body: ground, alive: true });
  return ground;
}

export function createTerrain(world: World, t: TerrainV2, index: number): TerrainEntity {
  const id = `terrain-${index}`;
  let body: Body;
  const tFix = mat(0, 0.8, 0, CAT.TERRAIN, MASK.TERRAIN);
  if (t.kind === 'plateau') {
    body = world.createBody({ type: 'static' });
    body.createFixture(
      Box((t.x1 - t.x0) / 2, t.top / 2, Vec2((t.x0 + t.x1) / 2, t.top / 2), 0),
      tFix
    );
  } else if (t.kind === 'ledge') {
    body = world.createBody({ type: 'static' });
    const cy = t.top - t.thickness / 2;
    body.createFixture(
      Box((t.x1 - t.x0) / 2, t.thickness / 2, Vec2((t.x0 + t.x1) / 2, cy), 0),
      tFix
    );
  } else {
    body = world.createBody({ type: 'static' });
    const verts = [Vec2(t.x0, t.y0), Vec2(t.x1, t.y1), Vec2(t.x1, 0), Vec2(t.x0, 0)];
    body.createFixture(Polygon(verts), tFix);
  }
  const entity: TerrainEntity = { kind: 'terrain', id, terrainId: id, body, alive: true };
  body.setUserData(entity);
  return entity;
}

export function createBlock(world: World, b: ExpandedBlock): BlockEntity {
  const m = TUNING.materials[b.material];
  const body = world.createBody({
    type: 'dynamic',
    position: Vec2(b.cx, b.cy),
    angle: b.rot === 90 ? Math.PI / 2 : 0,
  });
  const fix = mat(m.density, m.friction, m.restitution, CAT.BLOCK, MASK.BLOCK);
  if (b.shape === 'circle') {
    body.createFixture(Circle(b.r!), fix);
    body.setAngularDamping(0.6);
  } else if (b.shape === 'triangle') {
    const w = b.w;
    const h = b.h;
    const apexX = b.triMirror ? w / 2 : -w / 2;
    const verts = [Vec2(-w / 2, -h / 2), Vec2(w / 2, -h / 2), Vec2(apexX, h / 2)];
    body.createFixture(Polygon(verts), fix);
  } else {
    body.createFixture(Box(b.w / 2, b.h / 2), fix);
  }
  const entity: BlockEntity = {
    kind: 'block',
    id: b.id,
    material: b.material,
    shape: b.shape,
    w: b.w,
    h: b.h,
    r: b.r,
    triMirror: b.triMirror,
    rot: b.rot,
    depth: 0.9,
    body,
    hp: m.hp,
    maxHp: m.hp,
    alive: true,
  };
  body.setUserData(entity);
  return entity;
}

export function createPig(world: World, p: ExpandedPig): PigEntity {
  const body = world.createBody({ type: 'dynamic', position: Vec2(p.cx, p.cy) });
  body.setAngularDamping(0.8);
  body.createFixture(
    Circle(p.r),
    mat(TUNING.pig.density, TUNING.pig.friction, TUNING.pig.restitution, CAT.PIG, MASK.PIG)
  );
  let hpMult = 1;
  let helmet: PigEntity['helmet'] = 'none';
  if (p.helmet === 'helmet') {
    hpMult = TUNING.pig.helmetMultiplier;
    helmet = 'helmet';
  } else if (p.helmet === 'hat') {
    hpMult = TUNING.pig.hatMultiplier;
    helmet = 'hat';
  }
  const baseHp = TUNING.pig.sizes[p.size].hp;
  const hp = baseHp * hpMult;
  const entity: PigEntity = {
    kind: 'pig',
    id: p.id,
    size: p.size,
    helmet,
    king: p.king === true,
    r: p.r,
    body,
    hp,
    maxHp: hp,
    alive: true,
    airborne: false,
    rollTime: 0,
  };
  body.setUserData(entity);
  return entity;
}
