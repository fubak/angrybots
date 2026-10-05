import type { ToolDef } from '../core/types';
import { drawHand } from './shared';

/**
 * Slot 3 — USB STICK (antimalware scanner).
 * Fires a scanner charge projectile that cleans infected nodes on hit.
 * Uses "usb-charge" ammo; charges are found as pickups.
 * NOTE: plain USB sticks found lying in the level are suspicious items —
 * inspecting them warns the player not to plug unknown media (SY0-701).
 */
export const usbTool: ToolDef = {
  id: 'usb',
  name: 'USB SCANNER',
  slot: 3,
  ammo: { resource: 'usb-charge', start: 8, max: 20 },
  cooldown: 0.5,
  drawViewmodel(g, w, h, bob, gender, cd) {
    const cx = w / 2 - 14 + bob * 3;
    const base = h - 56 - bob * 3 + cd * 14;
    // usb stick held upright, connector up
    g.fillStyle = '#2b6cf0';
    g.fillRect(cx - 9, base + 12, 18, 30);
    g.fillStyle = '#9aa4b2';
    g.fillRect(cx - 6, base, 12, 12);
    g.fillStyle = '#0f0';
    g.fillRect(cx - 5, base + 20, 10, 8);
    g.fillStyle = '#123';
    g.fillRect(cx - 9, base + 38, 18, 4);
    drawHand(g, cx - 9, base + 34, gender);
  },
  use(ctx) {
    ctx.fireProjectile({
      x: ctx.playerX,
      y: ctx.playerY,
      dx: Math.cos(ctx.playerAngle),
      dy: Math.sin(ctx.playerAngle),
      speed: 8,
      range: 10,
      source: 'usb-scanner',
    });
    ctx.bus.emit('tool-used', { toolId: 'usb' });
  },
};
