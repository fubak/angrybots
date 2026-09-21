import * as THREE from 'three';
import { PALETTE } from '../config/render';
import type { BotKind } from '../levels/schema';
import { toon } from './toon';
import { addOutline } from './outline';

export type PigLook = {
  helmet: 'none' | 'hat' | 'helmet';
  king: boolean;
};

function eyePair(r: number, y: number, z: number, spread: number): THREE.Group {
  const g = new THREE.Group();
  const eyeMat = toon(PALETTE.bot.eye);
  const pupilMat = toon(PALETTE.bot.visor);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 10, 8), eyeMat);
    eye.position.set(side * spread, y, z);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 8, 6), pupilMat);
    pupil.position.set(0, 0, r * 0.13);
    eye.add(pupil);
    g.add(eye);
  }
  return g;
}

export function makeBotCharacter(kind: BotKind, r: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `bot:${kind}`;
  const color = PALETTE.bot[kind];
  if (kind === 'dash') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.72, r * 0.9, 6, 10), toon(color));
    body.rotation.z = Math.PI / 2;
    addOutline(body, 'capsule');
    g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, r * 0.7, 8), toon(PALETTE.bot.accent));
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(r * 0.95, 0, 0);
    g.add(nose);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(r * 0.35, r * 0.7, 0.12), toon(color));
    fin.position.set(-r * 0.55, r * 0.35, 0);
    g.add(fin);
  } else if (kind === 'split') {
    for (const side of [-1, 1]) {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(r * 0.72, 14, 10),
        toon(side < 0 ? color : PALETTE.bot.accent)
      );
      lobe.position.set(side * r * 0.38, 0, 0);
      addOutline(lobe, 'sphere');
      g.add(lobe);
    }
    const seam = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 1.35, r * 1.1), toon(PALETTE.bot.visor));
    g.add(seam);
  } else if (kind === 'heavy') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(r * 1.7, r * 1.35, r * 1.5), toon(color));
    addOutline(body, 'box');
    g.add(body);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(r * 1.2, r * 0.18, r * 0.3), toon(PALETTE.bot.visor));
    brow.position.set(0, r * 0.28, r * 0.72);
    g.add(brow);
  } else if (kind === 'blast') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), toon(color));
    addOutline(body, 'sphere');
    g.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, r * 0.1, 8, 16), toon(PALETTE.tnt.base));
    band.rotation.x = Math.PI / 2;
    g.add(band);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, r * 0.55, 6), toon('#c9a36a'));
    fuse.position.set(0, r * 1.05, 0);
    g.add(fuse);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), toon(PALETTE.tnt.text, { emissive: '#ffaa22' }));
    spark.position.set(0, r * 1.38, 0);
    g.add(spark);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), toon(color));
    addOutline(body, 'sphere');
    g.add(body);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(r * 1.15, r * 0.28, r * 0.22), toon(PALETTE.bot.visor));
    visor.position.set(0, r * 0.12, r * 0.78);
    g.add(visor);
  }
  g.add(eyePair(r, r * 0.16, r * 0.78, r * 0.3));
  return g;
}

export function makePigCharacter(r: number, look: PigLook): THREE.Group {
  const g = new THREE.Group();
  g.name = look.king ? 'pig:king' : `pig:${look.helmet}`;
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), toon(PALETTE.pig.skin));
  addOutline(body, 'sphere');
  g.add(body);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 10, 8), toon(PALETTE.pig.snout));
  snout.position.set(0, -r * 0.04, r * 0.82);
  g.add(snout);
  const nostrilMat = toon(PALETTE.pig.nostril);
  for (const side of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(r * 0.07, 6, 5), nostrilMat);
    n.position.set(side * r * 0.12, -r * 0.02, r * 1.12);
    g.add(n);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 8, 6), toon(PALETTE.pig.ear));
    ear.scale.set(1, 1.25, 0.55);
    ear.position.set(side * r * 0.42, r * 0.72, r * 0.12);
    g.add(ear);
  }
  g.add(eyePair(r, r * 0.2, r * 0.78, r * 0.26));
  if (look.helmet === 'helmet') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(r * 0.78, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), toon(PALETTE.pig.helmet));
    helm.position.set(0, r * 0.18, 0);
    g.add(helm);
  } else if (look.helmet === 'hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, r * 0.08, 12), toon(PALETTE.pig.hat));
    brim.position.set(0, r * 0.55, 0);
    g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.62, r * 0.45, 10), toon(PALETTE.pig.hat));
    crown.position.set(0, r * 0.8, 0);
    g.add(crown);
  }
  if (look.king) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, r * 0.08, 8, 16), toon(PALETTE.pig.crown));
    band.rotation.x = Math.PI / 2;
    band.position.set(0, r * 0.72, 0);
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.1, r * 0.32, 6), toon(PALETTE.pig.crown));
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * r * 0.55, r * 0.95, Math.sin(a) * r * 0.55);
      g.add(spike);
    }
  }
  return g;
}

export function decorateBlock(mesh: THREE.Mesh, material: string, w: number, h: number, depth: number): void {
  if (material !== 'tnt') return;
  const band = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.22, depth * 1.05), toon(PALETTE.tnt.band));
  band.position.set(0, 0, 0);
  mesh.add(band);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h * 0.12, depth * 1.08), toon(PALETTE.tnt.text));
  mark.position.set(0, 0, 0);
  mesh.add(mark);
}
