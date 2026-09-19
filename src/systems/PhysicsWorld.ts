import * as CANNON from 'cannon-es';
import { GRAVITY } from '../config';
import type { Block } from '../entities/Block';
import type { Pig } from '../entities/Pig';

export class PhysicsWorld {
  readonly world = new CANNON.World({
    gravity: new CANNON.Vec3(0, GRAVITY, 0),
  });
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
  }

  setupMaterials(blocks: Block[], _pigs: Pig[]) {
    const mats = new Map<string, CANNON.Material>();
    for (const b of blocks) {
      mats.set(b.materialType, b.body.material as CANNON.Material);
    }
    mats.set('grok', new CANNON.Material('grok'));
    mats.set('pig', new CANNON.Material('pig'));

    const contact = (
      a: string,
      b: string,
      friction: number,
      restitution: number
    ) => {
      const ma = mats.get(a)!;
      const mb = mats.get(b)!;
      this.world.addContactMaterial(
        new CANNON.ContactMaterial(ma, mb, { friction, restitution })
      );
    };

    contact('wood', 'wood', 0.5, 0.12);
    contact('wood', 'stone', 0.55, 0.1);
    contact('stone', 'stone', 0.65, 0.06);
    contact('glass', 'glass', 0.35, 0.25);
    contact('grok', 'wood', 0.45, 0.2);
    contact('grok', 'stone', 0.5, 0.15);
    contact('grok', 'pig', 0.4, 0.25);
    contact('pig', 'wood', 0.5, 0.15);
    contact('explosive', 'wood', 0.45, 0.18);
    contact('explosive', 'stone', 0.5, 0.12);
    contact('grok', 'explosive', 0.42, 0.22);
  }

  step(dt: number) {
    this.world.step(1 / 60, dt, 8);
  }
}
