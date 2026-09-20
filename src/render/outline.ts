import * as THREE from 'three';
import { OUTLINE, PALETTE } from '../config/render';

export type OutlineKind = 'box' | 'sphere' | 'capsule' | 'extrude';

export function addOutline(
  mesh: THREE.Mesh,
  kind: OutlineKind,
  width = OUTLINE.width
): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  const src = mesh.geometry;
  if (kind === 'box') {
    const p = (src as THREE.BoxGeometry).parameters;
    geometry = new THREE.BoxGeometry(
      p.width + 2 * width,
      p.height + 2 * width,
      p.depth + 2 * width
    );
  } else if (kind === 'sphere') {
    const p = (src as THREE.SphereGeometry).parameters;
    geometry = new THREE.SphereGeometry(p.radius + width, 16, 12);
  } else if (kind === 'capsule') {
    const p = (src as THREE.CapsuleGeometry).parameters;
    geometry = new THREE.CapsuleGeometry(
      p.radius + width,
      p.height + 2 * width,
      8,
      16
    );
  } else {
    geometry = src.clone();
    const pos = geometry.getAttribute('position');
    const norm = geometry.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + norm.getX(i) * width,
        pos.getY(i) + norm.getY(i) * width,
        pos.getZ(i) + norm.getZ(i) * width
      );
    }
    pos.needsUpdate = true;
  }

  const outline = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: PALETTE.outline,
      side: THREE.BackSide,
    })
  );
  outline.renderOrder = mesh.renderOrder - 1;
  mesh.add(outline);
  return outline;
}
