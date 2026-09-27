import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { allLevels } from '../../src/levels/registry';
import {
  CameraDirector,
  contentRect,
  structureRect,
} from '../../src/camera/CameraDirector';
import { Scenery } from '../../src/render/Scenery';

// The whole level — sling, full queue, structure, terrain — must stay inside
// the aim frame at every browser size, with the HUD strip reserved and only a
// sliver of dirt below the ground line. Before this, framing assumed 16:9 and
// queued bots / the moon clipped off-screen on narrower or shorter windows.
const CASES = [
  { w: 1280, h: 720, hud: 0 }, // 16:9 desktop
  { w: 1024, h: 768, hud: 0 }, // 4:3 tablet
  { w: 2520, h: 1080, hud: 0 }, // 21:9 ultrawide
  { w: 844, h: 390, hud: 0 }, // phone landscape
  { w: 1920, h: 1080, hud: 56 }, // desktop with HUD inset
  { w: 1024, h: 768, hud: 56 }, // 4:3 with HUD inset
];

const EPS = 1e-6;

describe('camera framing', () => {
  const levels = allLevels();
  it('covers all 30 campaign levels', () => {
    expect(levels.length).toBe(30);
  });

  for (const c of CASES) {
    const aspect = c.w / c.h;
    const label = `${c.w}x${c.h}${c.hud ? ` hud${c.hud}` : ''}`;
    it(`aim frame contains the whole level at ${label}`, () => {
      const cam = new CameraDirector();
      const f = c.hud / c.h;
      for (const level of levels) {
        const v = cam.slingView(level, 0, aspect, c.hud, c.h);
        const halfW = (v.h * aspect) / 2;
        // The HUD overlaps the top f·h of the view — content must fit below it.
        const vis = {
          x0: v.cx - halfW,
          x1: v.cx + halfW,
          y0: v.cy - v.h / 2,
          y1: v.cy + v.h / 2 - v.h * f,
        };
        const r = contentRect(level);
        expect(
          r.x0 >= vis.x0 - EPS && r.x1 <= vis.x1 + EPS,
          `${level.id} x: [${r.x0.toFixed(1)},${r.x1.toFixed(1)}] vs view [${vis.x0.toFixed(1)},${vis.x1.toFixed(1)}]`
        ).toBe(true);
        expect(
          r.y0 >= vis.y0 - EPS && r.y1 <= vis.y1 + EPS,
          `${level.id} y: [${r.y0.toFixed(1)},${r.y1.toFixed(1)}] vs view [${vis.y0.toFixed(1)},${vis.y1.toFixed(1)}]`
        ).toBe(true);
        // Ground line sits in the bottom 15% of the screen — no dirt ocean.
        const groundFrac = (0 - vis.y0) / v.h;
        expect(groundFrac, `${level.id} dirt ${(groundFrac * 100).toFixed(1)}%`).toBeLessThanOrEqual(
          0.15
        );
      }
    });

    it(`intro structure view contains the castle with margin at ${label}`, () => {
      const cam = new CameraDirector();
      const f = c.hud / c.h;
      for (const level of levels) {
        const v = cam.structureView(level, aspect, c.hud, c.h);
        const halfW = (v.h * aspect) / 2;
        const vis = {
          x0: v.cx - halfW,
          x1: v.cx + halfW,
          y0: v.cy - v.h / 2,
          y1: v.cy + v.h / 2 - v.h * f,
        };
        const r = structureRect(level)!;
        expect(
          r.x0 >= vis.x0 - EPS && r.x1 <= vis.x1 + EPS && r.y0 >= vis.y0 - EPS && r.y1 <= vis.y1 + EPS,
          `${level.id} structure [${r.x0.toFixed(1)}..${r.x1.toFixed(1)},${r.y0.toFixed(1)}..${r.y1.toFixed(1)}] vs view`
        ).toBe(true);
        // ~70% fill target — allow slack for tiny structures that need the
        // floor pinned, but never wall-to-wall.
        const fillX = (r.x1 - r.x0) / (vis.x1 - vis.x0);
        const fillY = (r.y1 - r.y0) / (vis.y1 - vis.y0);
        expect(fillX, `${level.id} fillX ${(fillX * 100).toFixed(0)}%`).toBeLessThanOrEqual(0.8);
        expect(fillY, `${level.id} fillY ${(fillY * 100).toFixed(0)}%`).toBeLessThanOrEqual(0.8);
      }
    });
  }

  // setParallaxAnchor clamps the celestial into the aim view — the disc plus
  // its eyes must be fully on screen for every level at every aspect.
  for (const c of CASES) {
    const aspect = c.w / c.h;
    it(`sun/moon stays fully on screen at ${c.w}x${c.h}${c.hud ? ` hud${c.hud}` : ''}`, () => {
      const cam = new CameraDirector();
      const scenery = new Scenery(new THREE.Scene());
      for (const level of levels) {
        scenery.setChapter(level.chapter);
        const v = cam.slingView(level, 0, aspect, c.hud, c.h);
        scenery.setParallaxAnchor(v, aspect);
        // At the anchor view the parallax layer offset is 0 → local == world.
        const p = scenery.celestial.position;
        const scale = level.chapter === 'citadel' ? 0.62 : 1;
        const r = 2.1 * scale; // disc radius (eyes sit inside)
        const halfW = (v.h * aspect) / 2;
        expect(
          p.x - r >= v.cx - halfW - EPS && p.x + r <= v.cx + halfW + EPS,
          `${level.id} sun x ${p.x.toFixed(1)} ± ${r.toFixed(1)} vs [${(v.cx - halfW).toFixed(1)},${(v.cx + halfW).toFixed(1)}]`
        ).toBe(true);
        expect(
          p.y - r >= v.cy - v.h / 2 - EPS && p.y + r <= v.cy + v.h / 2 + EPS,
          `${level.id} sun y ${p.y.toFixed(1)} ± ${r.toFixed(1)} vs [${(v.cy - v.h / 2).toFixed(1)},${(v.cy + v.h / 2).toFixed(1)}]`
        ).toBe(true);
      }
    });
  }
});
