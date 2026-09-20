import * as CANNON from 'cannon-es';
import {
  GRAVITY,
  GROUND_CONTACT_Y,
  GROK_BOT_MASS,
  GROK_BOT_RADIUS,
  SLING_LINEAR_DAMPING,
  WORLD_BOUNDS,
} from '../config';

/** Fixed step for trajectory preview (match PhysicsWorld.step). */
export const PREVIEW_TRAJ_DT = 1 / 60;
export const PREVIEW_TRAJ_STEPS = 90;
const PHYS_SUBSTEPS = 10;

export type ArcSample = { x: number; y: number; t: number };

function makeProjectileBody(x0: number, y0: number, vx: number, vy: number) {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, GRAVITY, 0),
  });
  const body = new CANNON.Body({
    mass: GROK_BOT_MASS,
    shape: new CANNON.Sphere(GROK_BOT_RADIUS),
    linearDamping: SLING_LINEAR_DAMPING,
  });
  body.position.set(x0, y0, 0);
  body.velocity.set(vx, vy, 0);
  world.addBody(body);
  return { world, body };
}

/** Full step history (unfiltered) — used for preview/live parity tests. */
export function integrateProjectileHistory(
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  opts: { dt?: number; steps?: number } = {}
): ArcSample[] {
  const dt = opts.dt ?? PREVIEW_TRAJ_DT;
  const steps = opts.steps ?? PREVIEW_TRAJ_STEPS;
  const { world, body } = makeProjectileBody(x0, y0, vx, vy);
  const out: ArcSample[] = [{ x: x0, y: y0, t: 0 }];
  for (let i = 1; i <= steps; i++) {
    world.step(dt, dt, PHYS_SUBSTEPS);
    out.push({
      x: body.position.x,
      y: body.position.y,
      t: i * dt,
    });
    if (body.position.y < GROUND_CONTACT_Y && body.velocity.y < 0) break;
    if (body.position.x > WORLD_BOUNDS.maxX + 2) break;
  }
  return out;
}

/** Physics-matched arc for trajectory dots (same integrator as live bot). */
export function sampleBallisticArc(
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  opts: { dt?: number; steps?: number } = {}
): ArcSample[] {
  return integrateProjectileHistory(x0, y0, vx, vy, opts).filter(
    (p) =>
      p.y >= GROUND_CONTACT_Y &&
      p.x >= WORLD_BOUNDS.minX &&
      p.x <= WORLD_BOUNDS.maxX
  );
}

export function arcPointAtTime(samples: ArcSample[], time: number): ArcSample | null {
  if (samples.length === 0) return null;
  if (time <= samples[0]!.t) return samples[0]!;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (time <= b.t) {
      const u = (time - a.t) / (b.t - a.t || 1);
      return {
        t: time,
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
      };
    }
  }
  return samples[samples.length - 1]!;
}
