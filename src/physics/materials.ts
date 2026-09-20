import * as CANNON from 'cannon-es';
import type { BlockMaterial } from '../config';

/** Shared Cannon material instances — contact pairs must reference these. */
export class MaterialRegistry {
  readonly grok: CANNON.Material;
  readonly pig: CANNON.Material;
  private readonly blocks = new Map<BlockMaterial, CANNON.Material>();

  constructor() {
    this.grok = new CANNON.Material('grok');
    this.pig = new CANNON.Material('pig');
    for (const t of ['wood', 'stone', 'glass', 'explosive'] as const) {
      this.blocks.set(t, new CANNON.Material(t));
    }
  }

  forBlock(type: BlockMaterial) {
    return this.blocks.get(type)!;
  }

  wireContactMaterials(world: CANNON.World) {
    const contact = (
      a: CANNON.Material,
      b: CANNON.Material,
      friction: number,
      restitution: number
    ) => {
      world.addContactMaterial(
        new CANNON.ContactMaterial(a, b, { friction, restitution })
      );
    };

    const w = this.forBlock('wood');
    const s = this.forBlock('stone');
    const g = this.forBlock('glass');
    const e = this.forBlock('explosive');

    contact(w, w, 0.5, 0.12);
    contact(w, s, 0.55, 0.1);
    contact(s, s, 0.65, 0.06);
    contact(g, g, 0.35, 0.25);
    contact(this.grok, w, 0.45, 0.2);
    contact(this.grok, s, 0.5, 0.15);
    contact(this.grok, g, 0.42, 0.28);
    contact(this.grok, e, 0.42, 0.22);
    contact(this.grok, this.pig, 0.4, 0.25);
    contact(this.pig, w, 0.5, 0.15);
    contact(this.pig, s, 0.55, 0.12);
    contact(e, w, 0.45, 0.18);
    contact(e, s, 0.5, 0.12);
    contact(e, g, 0.4, 0.22);
    contact(w, g, 0.45, 0.18);
    contact(s, g, 0.5, 0.15);
  }
}
