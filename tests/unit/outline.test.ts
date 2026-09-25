import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addOutline } from '../../src/render/outline';

describe('outline rendering', () => {
  it('addOutline produces a BackSide mesh sized +2·width for boxes', () => {
    const width = 0.035;
    const w = 1;
    const h = 2;
    const d = 0.9;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: '#d9974f' })
    );
    const outline = addOutline(mesh, 'box', width);
    expect(outline.material).toMatchObject({ side: THREE.BackSide });
    const op = outline.geometry.parameters as {
      width: number;
      height: number;
      depth: number;
    };
    expect(op.width).toBeCloseTo(w + 2 * width);
    expect(op.height).toBeCloseTo(h + 2 * width);
    expect(op.depth).toBeCloseTo(d + 2 * width);
  });
});
