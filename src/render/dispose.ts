import * as THREE from 'three';

/** Disposes geometries and materials under root. Shared textures (ILL/TEX) are never disposed;
 *  only per-instance clones stashed on userData.ownedMap are. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const owned = m.userData.ownedMap as THREE.Texture | undefined;
    owned?.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) for (const mm of mat) mm.dispose();
    else mat?.dispose();
  });
}
