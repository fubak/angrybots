import { describe, expect, it } from 'vitest';
import { SLING } from '../../src/sling/launch';
import { TUNING, type BotKind } from '../../src/config/tuning';
import {
  SLING_ARM_W,
  SLING_FORK,
  SLING_JOINT_Y,
  SLING_TIP_Y,
  slingArmClearance,
} from '../../src/render/SlingView';

// The loaded bot's center sits on SLING.anchor. The fork must be wide and deep
// enough that the perpendicular distance from the anchor to each arm's
// centerline exceeds r + armHalfWidth + margin for every bot kind — otherwise
// the wood reads as running through the bot instead of cradling it.
describe('sling fork clearance', () => {
  const ARM_HALF = SLING_ARM_W / 2;
  const MARGIN = 0.08;

  it('centerline distance clears every bot kind plus margin', () => {
    for (const side of [-1, 1] as const) {
      const d = slingArmClearance(side);
      for (const kind of Object.keys(TUNING.bots) as BotKind[]) {
        const r = TUNING.bots[kind].r;
        expect(
          d - ARM_HALF - r,
          `side ${side} vs ${kind} (r=${r})`
        ).toBeGreaterThanOrEqual(MARGIN);
      }
    }
  });

  it('tips flank the biggest bot with room to spare', () => {
    // Tips sit above the anchor so the bot nests inside the Y opening, and the
    // joint drops below the largest bot's underside.
    const rMax = Math.max(...Object.values(TUNING.bots).map((b) => b.r));
    expect(SLING_TIP_Y).toBeGreaterThan(SLING.anchor.y);
    expect(SLING_JOINT_Y).toBeLessThan(SLING.anchor.y - rMax);
    expect(SLING_FORK * 2).toBeGreaterThan(rMax * 2 + SLING_ARM_W);
  });
});
