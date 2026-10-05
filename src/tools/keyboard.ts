import type { ToolDef } from '../core/types';
import { drawHand } from './shared';

/**
 * Slot 1 — KEYBOARD.
 * Melee-range "terminal command": patches/locks a workstation in front of you,
 * interacts with consoles, and is how you report an insider at a terminal.
 * Infinite ammo.
 */
export const keyboardTool: ToolDef = {
  id: 'keyboard',
  name: 'KEYBOARD',
  slot: 1,
  ammo: null,
  cooldown: 0.4,
  drawViewmodel(g, w, h, bob, gender, cd) {
    const cx = w / 2 + bob * 3;
    const base = h - 46 - bob * 2 + cd * 6;
    // chunky keyboard
    g.fillStyle = '#1c1f26';
    g.fillRect(cx - 52, base, 104, 26);
    g.fillStyle = '#3a4250';
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 12; k++) g.fillRect(cx - 48 + k * 8, base + 4 + r * 7, 6, 5);
    drawHand(g, cx - 30, base - 4, gender);
    drawHand(g, cx + 16, base - 2, gender);
  },
  use(ctx) {
    const e = ctx.aimEntity(1.4, 0.5);
    if (e) ctx.bus.emit('interact', { entityId: e.def.id });
    ctx.bus.emit('tool-used', { toolId: 'keyboard' });
  },
};
