import type { ToolDef } from '../core/types';
import { drawHand } from './shared';

/**
 * Slot 4 — BADGE / CREDENTIAL.
 * Least-privilege access: only opens doors whose accessRole the player is
 * authorized for. Badge-ing a door outside your role logs a least-privilege
 * violation and costs points (handled by the mission runtime).
 */
export const badgeTool: ToolDef = {
  id: 'badge',
  name: 'BADGE',
  slot: 4,
  ammo: null,
  cooldown: 0.6,
  drawViewmodel(g, w, h, bob, gender, cd) {
    const cx = w / 2 + bob * 3;
    const base = h - 60 - bob * 2 + cd * 10;
    // lanyard
    g.strokeStyle = '#c33';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - 8, base - 12);
    g.lineTo(cx, base + 6);
    g.lineTo(cx + 8, base - 12);
    g.stroke();
    // badge card
    g.fillStyle = '#e8ecf4';
    g.fillRect(cx - 14, base + 6, 28, 34);
    g.fillStyle = '#27407a';
    g.fillRect(cx - 14, base + 6, 28, 8);
    g.fillStyle = '#e8b98a';
    g.fillRect(cx - 10, base + 17, 8, 10);
    g.fillStyle = '#333';
    g.fillRect(cx + 1, base + 18, 10, 2);
    g.fillRect(cx + 1, base + 22, 10, 2);
    g.fillRect(cx + 1, base + 26, 7, 2);
    drawHand(g, cx - 4, base + 34, gender);
  },
  use(ctx) {
    ctx.bus.emit('tool-used', { toolId: 'badge' });
    const door = ctx.isDoorAhead();
    if (!door) return;
    const allowed =
      door.accessRole === undefined || ctx.authorizedRoles.includes(door.accessRole);
    ctx.bus.emit('badge-door', {
      doorId: door.doorId,
      accessRole: door.accessRole,
      allowed,
    });
  },
};
