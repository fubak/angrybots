import planck, { type Body, Vec2 } from 'planck';
import { TUNING } from '../config/tuning';

const { World, Box } = planck;

export class PhysicsWorld {
  readonly world = new World({
    gravity: Vec2(0, TUNING.gravity),
    allowSleep: true,
  });

  private removalQueue: Body[] = [];
  private contactFlush: (() => void) | null = null;
  private stepCount = 0;

  constructor() {
    this.createGround();
  }

  setContactFlush(fn: () => void) {
    this.contactFlush = fn;
  }

  private createGround() {
    const ground = this.world.createBody({ type: 'static' });
    ground.createFixture({
      shape: Box(60, 1, Vec2(10, -1), 0),
      friction: 0.8,
    });
    ground.setUserData({ kind: 'ground' });
  }

  step(): void {
    this.world.step(TUNING.dt, TUNING.velIters, TUNING.posIters);
    this.stepCount++;
    this.contactFlush?.();
    this.flushRemovals();
  }

  get steps(): number {
    return this.stepCount;
  }

  queueRemoval(body: Body): void {
    if (!this.removalQueue.includes(body)) {
      this.removalQueue.push(body);
    }
  }

  private flushRemovals(): void {
    for (const body of this.removalQueue) {
      if (body.isActive()) {
        this.wakeTouching(body);
        this.world.destroyBody(body);
      }
    }
    this.removalQueue.length = 0;
  }

  private wakeTouching(removed: Body): void {
    const fixture = removed.getFixtureList();
    if (!fixture) return;
    const aabb = fixture.getAABB(0);
    this.world.queryAABB(aabb, (fx) => {
      const b = fx.getBody();
      if (b !== removed && b.isDynamic()) b.setAwake(true);
      return true;
    });
  }

  get dt(): number {
    return TUNING.dt;
  }
}
