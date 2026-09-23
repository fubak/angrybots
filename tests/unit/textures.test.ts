import { describe, expect, it } from 'vitest';
import { TEX } from '../../src/render/textures';

describe('procedural textures', () => {
  it('exposes shared wrap-ready maps', () => {
    expect(TEX.wood.wrapS).toBeDefined();
    expect(TEX.stone.image).toBeTruthy();
    expect(TEX.grass.repeat.x).toBeGreaterThan(1);
  });
});
