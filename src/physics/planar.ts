import * as CANNON from 'cannon-es';

const ZERO = new CANNON.Vec3(0, 0, 0);

/** Gameplay plane: XY motion, rotation about Z only. */
export function enforcePlanarMotion(body: CANNON.Body) {
  body.position.z = 0;
  body.velocity.z = 0;
  body.angularVelocity.x = 0;
  body.angularVelocity.y = 0;
  const e = body.quaternion;
  const yaw = Math.atan2(
    2 * (e.w * e.z + e.x * e.y),
    1 - 2 * (e.y * e.y + e.z * e.z)
  );
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), yaw);
}

export function applyImpulseAtCenter(
  body: CANNON.Body,
  impulse: CANNON.Vec3
) {
  body.applyImpulse(impulse, ZERO);
}
