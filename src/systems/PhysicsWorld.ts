import * as CANNON from 'cannon-es';
import { GRAVITY } from '../config';
import { MaterialRegistry } from '../physics/materials';

export class PhysicsWorld {
  readonly world = new CANNON.World({
    gravity: new CANNON.Vec3(0, GRAVITY, 0),
  });
  readonly materials = new MaterialRegistry();

  constructor() {
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;

    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(ground);

    const left = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 20, 5)),
    });
    left.position.set(-14, 10, 0);
    this.world.addBody(left);

    const right = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 20, 5)),
    });
    right.position.set(18, 10, 0);
    this.world.addBody(right);

    this.materials.wireContactMaterials(this.world);
  }

  step(dt: number) {
    this.world.step(1 / 60, dt, 10);
  }
}
