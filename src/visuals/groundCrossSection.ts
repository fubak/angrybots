import * as THREE from 'three';
import { grassMaterial } from './abTextures';

/** Side-view ground: grass rim + earth body (not an edge-on plane). */
export function buildGroundCrossSection(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ground-cross-section';

  const earth = new THREE.Mesh(
    new THREE.BoxGeometry(36, 2.6, 0.65),
    new THREE.MeshStandardMaterial({
      color: 0x5c3d22,
      roughness: 1,
      metalness: 0,
    })
  );
  earth.position.set(1.5, -1.15, -0.08);
  earth.receiveShadow = true;
  root.add(earth);

  const subsoil = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.45, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 })
  );
  subsoil.position.set(1.5, 0.02, -0.06);
  root.add(subsoil);

  const grassCap = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.2, 0.7),
    grassMaterial()
  );
  grassCap.position.set(1.5, 0.28, 0);
  grassCap.receiveShadow = true;
  root.add(grassCap);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.06, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x3d8a32, roughness: 0.85 })
  );
  rim.position.set(1.5, 0.4, 0.02);
  root.add(rim);

  return root;
}
