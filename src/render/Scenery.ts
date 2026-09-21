import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import { toon } from './toon';

export class Scenery {
  readonly group = new THREE.Group();
  private readonly background: THREE.Color;
  private readonly skyMat: THREE.MeshBasicMaterial;
  private readonly hillFar: THREE.MeshToonMaterial;
  private readonly hillMid: THREE.MeshToonMaterial;
  private readonly dirtMat: THREE.MeshToonMaterial;
  private readonly grassMat: THREE.MeshToonMaterial;

  constructor(scene: THREE.Scene) {
    this.background = new THREE.Color(PALETTE.sky.top);
    scene.background = this.background;

    this.skyMat = new THREE.MeshBasicMaterial({ color: PALETTE.sky.bottom });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(160, 80), this.skyMat);
    sky.position.set(8, 18, DEPTH.sky);
    this.group.add(sky);

    this.hillFar = toon(PALETTE.hills.far).clone();
    this.hillMid = toon(PALETTE.hills.mid).clone();
    this.addHill(-8, 1.2, 14, this.hillFar, DEPTH.hillsFar);
    this.addHill(10, 0.6, 16, this.hillFar, DEPTH.hillsFar + 1);
    this.addHill(4, 0.2, 11, this.hillMid, DEPTH.hillsFar + 4);
    this.addHill(22, 0.4, 13, this.hillMid, DEPTH.hillsFar + 3);

    this.dirtMat = toon(PALETTE.ground.dirt).clone();
    this.grassMat = toon(PALETTE.ground.grass).clone();
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(160, 10, 1.2), this.dirtMat);
    dirt.position.set(8, -5.15, DEPTH.ground);
    this.group.add(dirt);
    const dirtDark = new THREE.Mesh(
      new THREE.BoxGeometry(160, 0.5, 1.15),
      toon(PALETTE.ground.dirtDark).clone()
    );
    dirtDark.position.set(8, -0.4, DEPTH.ground + 0.02);
    this.group.add(dirtDark);
    const grass = new THREE.Mesh(new THREE.BoxGeometry(160, 0.38, 1.3), this.grassMat);
    grass.position.set(8, -0.12, DEPTH.ground + 0.04);
    this.group.add(grass);
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(160, 0.12, 1.35),
      toon(PALETTE.ground.grassLip).clone()
    );
    lip.position.set(8, 0.08, DEPTH.ground + 0.06);
    this.group.add(lip);

    scene.add(this.group);
  }

  setChapter(chapter: string): void {
    if (chapter === 'workshop') {
      this.background.set('#4f8fb8');
      this.skyMat.color.set('#f2d39a');
      this.hillFar.color.set('#c4a45a');
      this.hillMid.color.set('#a9843c');
      this.dirtMat.color.set('#8a5a32');
      this.grassMat.color.set('#8aad3a');
      return;
    }
    if (chapter === 'citadel') {
      this.background.set('#2d3a68');
      this.skyMat.color.set('#8ea4d8');
      this.hillFar.color.set('#6a7a9c');
      this.hillMid.color.set('#4f5d7a');
      this.dirtMat.color.set('#4a3a38');
      this.grassMat.color.set('#3d6a4a');
      return;
    }
    this.background.set(PALETTE.sky.top);
    this.skyMat.color.set(PALETTE.sky.bottom);
    this.hillFar.color.set(PALETTE.hills.far);
    this.hillMid.color.set(PALETTE.hills.mid);
    this.dirtMat.color.set(PALETTE.ground.dirt);
    this.grassMat.color.set(PALETTE.ground.grass);
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
