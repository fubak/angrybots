import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Pig } from '../src/entities/Pig';
import { MaterialRegistry } from '../src/physics/materials';

describe('entity disposal (Gate 4)', () => {
  it('removes pig bodies and group from scene on dispose', () => {
    const world = new CANNON.World();
    const scene = new THREE.Scene();
    const materials = new MaterialRegistry();
    const pig = new Pig(world, scene, 5, 2, materials);
    expect(world.bodies.length).toBe(1);
    expect(scene.children.length).toBe(1);
    pig.dispose(world, scene);
    expect(world.bodies.length).toBe(0);
    expect(scene.children.length).toBe(0);
  });
});
