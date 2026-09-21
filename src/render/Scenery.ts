import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import { toon } from './toon';

export class Scenery {
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color(PALETTE.sky.top);

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 80),
      new THREE.MeshBasicMaterial({ color: PALETTE.sky.bottom })
    );
    sky.position.set(8, 18, DEPTH.sky);
    this.group.add(sky);

    const far = toon(PALETTE.hills.far);
    const mid = toon(PALETTE.hills.mid);
    this.addHill(-8, 1.2, 14, far, DEPTH.hillsFar);
    this.addHill(10, 0.6, 16, far, DEPTH.hillsFar + 1);
    this.addHill(4, 0.2, 11, mid, DEPTH.hillsFar + 4);
    this.addHill(22, 0.4, 13, mid, DEPTH.hillsFar + 3);

    const dirt = new THREE.Mesh(new THREE.BoxGeometry(160, 10, 1.2), toon(PALETTE.ground.dirt));
    dirt.position.set(8, -5.15, DEPTH.ground);
    this.group.add(dirt);
    const dirtDark = new THREE.Mesh(
      new THREE.BoxGeometry(160, 0.5, 1.15),
      toon(PALETTE.ground.dirtDark)
    );
    dirtDark.position.set(8, -0.4, DEPTH.ground + 0.02);
    this.group.add(dirtDark);
    const grass = new THREE.Mesh(
      new THREE.BoxGeometry(160, 0.38, 1.3),
      toon(PALETTE.ground.grass)
    );
    grass.position.set(8, -0.12, DEPTH.ground + 0.04);
    this.group.add(grass);
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(160, 0.12, 1.35),
      toon(PALETTE.ground.grassLip)
    );
    lip.position.set(8, 0.08, DEPTH.ground + 0.06);
    this.group.add(lip);

    scene.add(this.group);
  }

  private addHill(
    x: number,
    y: number,
    r: number,
    mat: THREE.Material,
    z: number
  ): void {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
    hill.scale.set(1.6, 0.45, 0.4);
    hill.position.set(x, y, z);
    this.group.add(hill);
  }
}
