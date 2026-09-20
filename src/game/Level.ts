import planck, { type Body, type Vec2, Vec2 as PVec2 } from 'planck';
import { TUNING } from '../config/tuning';
import type { LevelV2, BotKind } from '../levels/schema';
import { expandLevel } from '../levels/expand';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { EntityRegistry } from '../entities/EntityRegistry';
import { createBlock, createPig, createTerrain } from '../entities/bodies';
import { spawnBot } from '../entities/Bot';
import { applyFragmentSpawnImpulse } from '../physics/fragments';
import { attachDamagePipeline } from '../physics/damage';
import { defaultTntExplosion } from '../physics/explosions';
import { isOutOfBounds, shouldRemoveOob } from '../physics/bounds';
import { isQuiet } from '../physics/quiet';
import {
  fragmentCountForMaterial,
  splitRect,
} from '../physics/fragments';
import { filterBits, CAT, MASK } from '../physics/categories';
import type { BlockEntity, BotEntity, FragmentEntity, PigEntity } from '../entities/types';
import { SCORE, damagePoints } from './Scoring';
import { rng as makeRng } from '../core/rng';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from './events';

const { Polygon } = planck;

export type LevelSimHooks = {
  score: number;
  log: string[];
  entityLog: string[];
};

export class Level {
  readonly def: LevelV2;
  readonly pw: PhysicsWorld;
  readonly registry = new EntityRegistry();
  readonly bus = new EventBus<GameEvents>();
  damageEnabled = false;
  /** Headless validation matches reference/sim.mjs (no fragment bodies). */
  fragmentsEnabled = false;
  readonly hooks: LevelSimHooks;
  private tntNextStep: BlockEntity[] = [];
  private fragmentSeq = 0;
  private simTime = 0;
  private rngFn = makeRng(1);

  private constructor(def: LevelV2, pw: PhysicsWorld, hooks: LevelSimHooks) {
    this.def = def;
    this.pw = pw;
    this.hooks = hooks;
    const damage = attachDamagePipeline(pw.world, {
      damageEnabled: () => this.damageEnabled,
      onBlockDamaged: (e, hpRatio, points) => {
        this.hooks.score += points;
        this.bus.emit('block:damaged', {
          id: e.id,
          material: e.material,
          hpRatio,
          points,
          x: e.body!.getPosition().x,
          y: e.body!.getPosition().y,
        });
      },
      onPigDamaged: (e, hpRatio) => {
        this.bus.emit('pig:damaged', {
          id: e.id,
          hpRatio,
          x: e.body!.getPosition().x,
          y: e.body!.getPosition().y,
        });
      },
      onDestroy: (e) => this.destroyEntity(e, 'impact'),
      onImpact: () => {},
    });
    pw.setContactFlush(() => damage.flushContacts());
  }

  static load(def: LevelV2, hooks?: Partial<LevelSimHooks>): Level {
    const pw = new PhysicsWorld();
    const h: LevelSimHooks = {
      score: hooks?.score ?? 0,
      log: hooks?.log ?? [],
      entityLog: hooks?.entityLog ?? [],
    };
    const level = new Level(def, pw, h);
    level.buildBodies();
    return level;
  }

  private buildBodies() {
    const expanded = expandLevel(this.def);
    expanded.terrain.forEach((t, i) => this.registry.add(createTerrain(this.pw.world, t, i)));
    for (const b of expanded.blocks) this.registry.add(createBlock(this.pw.world, b));
    for (const p of expanded.pigs) this.registry.add(createPig(this.pw.world, p));
  }

  settle(): { maxMove: number; maxRotDeg: number } {
    this.damageEnabled = false;
    const start = this.registry.all().map((e) => ({
      e,
      p: e.body?.getPosition().clone(),
      a: e.body?.getAngle() ?? 0,
    }));
    const n = Math.round(TUNING.settleSeconds / TUNING.dt);
    for (let i = 0; i < n; i++) this.stepInternal(false);
    let maxMove = 0;
    let maxRot = 0;
    for (const s of start) {
      if (!s.e.alive || !s.e.body || !s.p) continue;
      maxMove = Math.max(maxMove, PVec2.distance(s.p, s.e.body.getPosition()));
      if (s.e.kind === 'block') {
        maxRot = Math.max(maxRot, Math.abs(s.e.body.getAngle() - s.a));
      }
    }
    this.damageEnabled = true;
    this.bus.emit('level:settled', {});
    return { maxMove, maxRotDeg: (maxRot * 180) / Math.PI };
  }

  idle(seconds: number): string[] {
    const before = this.hooks.log.length;
    const steps = Math.round(seconds / TUNING.dt);
    for (let i = 0; i < steps; i++) this.stepInternal(true);
    return this.hooks.log.slice(before);
  }

  step(): void {
    this.stepInternal(true);
  }

  private stepInternal(runOob: boolean) {
    this.processTntChain();
    this.pw.step();
    this.simTime += TUNING.dt;
    this.trimFragments();
    if (runOob) this.checkOutOfBounds();
  }

  private processTntChain() {
    for (const tnt of this.tntNextStep) {
      if (tnt.alive) this.destroyEntity(tnt, 'impact');
    }
    this.tntNextStep = [];
  }

  private checkOutOfBounds() {
    for (const e of [...this.registry.all()]) {
      if (!e.alive || !e.body || !shouldRemoveOob(e)) continue;
      const p = e.body.getPosition();
      if (!isOutOfBounds(this.def, p.x, p.y)) continue;
      if (e.kind === 'pig') {
        this.destroyEntity(e, 'oob');
      } else if (e.kind === 'block') {
        this.silentRemoveBlock(e);
      } else if (e.kind === 'bot') {
        e.alive = false;
        this.pw.queueRemoval(e.body);
        e.body = null;
      }
    }
  }

  destroyEntity(entity: BlockEntity | PigEntity, reason: 'impact' | 'oob' | 'blast') {
    if (!entity.alive) return;
    entity.alive = false;
    const body = entity.body;
    if (!body) return;
    const pos = body.getPosition();
    const angle = body.getAngle();
    this.hooks.entityLog.push(`${entity.kind}:${entity.id}`);
    this.hooks.log.push(`${entity.kind}:${entity.id}`);
    if (entity.kind === 'pig') {
      const pts = entity.king ? SCORE.kingPig : SCORE.pig;
      this.hooks.score += pts;
      this.bus.emit('pig:destroyed', { id: entity.id, x: pos.x, y: pos.y, points: pts });
    } else if (entity.kind === 'block') {
      if (reason !== 'oob') {
        const pts = SCORE.destroy[entity.material];
        this.hooks.score += pts;
        this.bus.emit('block:destroyed', {
          id: entity.id,
          material: entity.material,
          x: pos.x,
          y: pos.y,
          angle,
          points: pts,
        });
      }
    }
    this.pw.queueRemoval(body);
    entity.body = null;
    if (entity.kind === 'block' && reason !== 'oob') {
      if (entity.material === 'tnt') {
        defaultTntExplosion(this.pw, pos, this.explosionHooks());
      } else if (this.fragmentsEnabled) {
        this.spawnFragments(entity, pos, angle, body);
      }
    }
  }

  private silentRemoveBlock(entity: BlockEntity) {
    entity.alive = false;
    if (entity.body) {
      this.pw.queueRemoval(entity.body);
      entity.body = null;
    }
  }

  private explosionHooks() {
    return {
      onExplosion: (x: number, y: number, radius: number) => {
        this.bus.emit('explosion', { x, y, radius });
      },
      onBlastDamage: (entity: BlockEntity | PigEntity, damage: number) => {
        if (!entity.alive) return;
        const dealt = Math.min(damage, Math.max(entity.hp, 0));
        entity.hp -= damage;
        if (entity.kind === 'block') {
          this.hooks.score += damagePoints(dealt);
        }
        if (entity.hp <= 0) {
          if (entity.kind === 'block' && entity.material === 'tnt') {
            this.tntNextStep.push(entity);
          } else {
            this.destroyEntity(entity, 'blast');
          }
        }
      },
      queueTntChain: (entity: BlockEntity) => {
        this.tntNextStep.push(entity);
      },
    };
  }

  private spawnFragments(parent: BlockEntity, pos: Vec2, angle: number, body: Body) {
    const n = fragmentCountForMaterial(parent.material);
    if (n <= 0) return;
    const polys = splitRect(parent.w, parent.h, n, this.rngFn);
    const lv = body.getLinearVelocity();
    const av = body.getAngularVelocity();
    const m = TUNING.materials[parent.material];
    for (const local of polys) {
      let cx = 0;
      let cy = 0;
      for (const p of local) {
        cx += p.x;
        cy += p.y;
      }
      cx /= local.length;
      cy /= local.length;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const wx = pos.x + cos * cx - sin * cy;
      const wy = pos.y + sin * cx + cos * cy;
      const fb = this.pw.world.createBody({
        type: 'dynamic',
        position: PVec2(wx, wy),
        angle,
      });
      fb.setAngularDamping(0.3);
      const verts = local.map((p) => PVec2(p.x, p.y));
      fb.createFixture(Polygon(verts), {
        density: m.density * 0.5,
        friction: m.friction,
        restitution: m.restitution,
        ...filterBits(CAT.FRAGMENT, MASK.FRAGMENT),
      });
      const lifetime = 3.5 + (this.rngFn() * 2 - 1) * 0.5;
      const frag: FragmentEntity = {
        kind: 'fragment',
        id: `frag-${this.fragmentSeq++}`,
        material: parent.material,
        body: fb,
        alive: true,
        spawnTime: this.simTime,
        lifetime,
      };
      fb.setUserData(frag);
      this.registry.add(frag);
      applyFragmentSpawnImpulse(fb, lv, av, wx - pos.x, wy - pos.y);
    }
  }

  private trimFragments() {
    const frags = this.registry.all().filter((e): e is FragmentEntity => e.kind === 'fragment' && e.alive);
    const expired = frags.filter((f) => this.simTime - f.spawnTime >= f.lifetime);
    for (const f of expired) this.removeFragment(f);
    let live = this.registry.all().filter((e): e is FragmentEntity => e.kind === 'fragment' && e.alive);
    if (live.length > 120) {
      live.sort((a, b) => a.spawnTime - b.spawnTime);
      for (let i = 0; i < live.length - 120; i++) this.removeFragment(live[i]!);
    }
  }

  private removeFragment(f: FragmentEntity) {
    f.alive = false;
    if (f.body) {
      this.pw.queueRemoval(f.body);
      f.body = null;
    }
  }

  pigsAlive(): number {
    return this.registry.all().filter((e) => e.kind === 'pig' && e.alive).length;
  }

  bodyCount(): number {
    let n = 0;
    for (let b = this.pw.world.getBodyList(); b; b = b.getNext()) n++;
    return n;
  }

  launchBot(angleDeg: number, speed: number, kind: BotKind = 'grok'): BotEntity {
    const bot = spawnBot(
      this.pw.world,
      angleDeg,
      speed,
      kind,
      `bot-${kind}-${this.simTime}`
    );
    this.registry.add(bot);
    return bot;
  }

  runShot(angleDeg: number, speed: number, kind: BotKind = 'grok'): number {
    const bot = this.launchBot(angleDeg, speed, kind);
    let t = 0;
    let quiet = 0;
    while (t < 14) {
      this.step();
      t += TUNING.dt;
      let moving = false;
      for (let b = this.pw.world.getBodyList(); b; b = b.getNext()) {
        if (b.isDynamic() && b.isAwake() && b.getLinearVelocity().length() > 0.15) {
          moving = true;
          break;
        }
      }
      if (bot.body) {
        const bp = bot.body.getPosition();
        if (bp.x > 40 || bp.x < -15) {
          bot.alive = false;
          this.pw.queueRemoval(bot.body);
          bot.body = null;
          break;
        }
      }
      quiet = moving ? 0 : quiet + TUNING.dt;
      if (quiet > 0.6 && t > 1) break;
    }
    if (bot.body) {
      bot.alive = false;
      this.pw.queueRemoval(bot.body);
      bot.body = null;
    }
    return t;
  }

  isWorldQuiet(): boolean {
    return isQuiet(this.pw.world);
  }

  setSeed(seed: number) {
    this.rngFn = makeRng(seed);
  }
}

export function replayLevel(def: LevelV2, shots: [number, number, BotKind?][]): Level {
  const level = Level.load(def);
  level.settle();
  for (const [a, v, kind] of shots) {
    if (level.pigsAlive() === 0) break;
    level.runShot(a, v, kind ?? def.bots[0] ?? 'grok');
  }
  return level;
}
