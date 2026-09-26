import { describe, expect, it } from 'vitest';
import { STICKERS } from '../../src/render/botArt.generated';
import { yawEyeTransforms } from '../../src/render/botArt';

// The look-around cycle sweeps yaw over ±0.35 (lookAroundYaw amplitude).
// The reference keeps two clearly separate eyes the whole time — the pair
// slides as a group, so the transformed eye boxes must never merge into one.
const LOOK_RANGE = 0.35;

function transformedGap(
  art: (typeof STICKERS)[number],
  yaw: number
): number {
  const sorted = [...art.eyes].sort((a, b) => a.box[0] - b.box[0]);
  const poses = yawEyeTransforms(art, yaw);
  const i1 = art.eyes.indexOf(sorted[0]!);
  const i2 = art.eyes.indexOf(sorted[1]!);
  const p1 = poses[i1]!;
  const p2 = poses[i2]!;
  const c1 = sorted[0]!.box[0] + sorted[0]!.box[2] / 2 + p1.dx;
  const c2 = sorted[1]!.box[0] + sorted[1]!.box[2] / 2 + p2.dx;
  const right1 = c1 + (sorted[0]!.box[2] * p1.sx) / 2;
  const left2 = c2 - (sorted[1]!.box[2] * p2.sx) / 2;
  return left2 - right1;
}

describe('yawEyeTransforms look-around layout', () => {
  for (const art of STICKERS) {
    if (art.eyes.length < 2) continue;
    it(`sticker ${art.id} never merges its eyes over the look-around range`, () => {
      const sorted = [...art.eyes].sort((a, b) => a.box[0] - b.box[0]);
      const restGap = sorted[1]!.box[0] - (sorted[0]!.box[0] + sorted[0]!.box[2]);
      let minGap = Infinity;
      for (let i = 0; i <= 200; i++) {
        const yaw = -LOOK_RANGE + (2 * LOOK_RANGE * i) / 200;
        minGap = Math.min(minGap, transformedGap(art, yaw));
      }
      if (restGap > 0) {
        expect(minGap).toBeGreaterThanOrEqual(restGap * 0.4);
      } else {
        // Sticker 02's blob eyes overlap in bbox terms even at rest; the look
        // must not let them merge further than that resting overlap.
        expect(minGap).toBeGreaterThanOrEqual(restGap - 0.5);
      }
    });
  }

  it('keeps both eyes visible and the far eye ≥ ~0.75× at the look extremes', () => {
    for (const art of STICKERS) {
      if (art.eyes.length < 2) continue;
      for (const yaw of [-LOOK_RANGE, LOOK_RANGE]) {
        for (const pose of yawEyeTransforms(art, yaw)) {
          expect(pose.visible).toBe(true);
          expect(pose.sx).toBeGreaterThanOrEqual(0.74);
        }
      }
    }
  });
});
