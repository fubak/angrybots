import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { JuiceSystem } from '../src/systems/JuiceSystem';

describe('JuiceSystem (F03)', () => {
  it('skips particles below impact strength threshold', () => {
    const scene = new THREE.Scene();
    const juice = new JuiceSystem(scene);
    const pos = new THREE.Vector3(1, 2, 0);
    juice.impact(pos, 0.02, 0xff0000);
    expect(scene.children.length).toBe(0);
  });

  it('spawns dust and debris for strong impacts', () => {
    const scene = new THREE.Scene();
    const juice = new JuiceSystem(scene);
    const pos = new THREE.Vector3(1, 2, 0);
    juice.impact(pos, 0.85, 0x884422);
    expect(scene.children.length).toBeGreaterThan(4);
  });
});
