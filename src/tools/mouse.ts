import type { ToolDef } from '../core/types';
import { drawHand } from './shared';

/**
 * Slot 2 — MOUSE.
 * Hitscan "click": inspects the entity under the crosshair — reveals what it
 * is (phishing email, legit user, malware, suspicious item) and shows an
 * on-screen explanation of the indicator. Infinite ammo.
 */
export const mouseTool: ToolDef = {
  id: 'mouse',
  name: 'MOUSE',
  slot: 2,
  ammo: null,
  cooldown: 0.35,
  drawViewmodel(g, w, h, bob, gender, cd) {
    const cx = w / 2 + 20 + bob * 3;
    const base = h - 40 - bob * 2 + cd * 8;
    // mouse body
    g.fillStyle = '#c8ccd4';
    g.beginPath();
    g.ellipse(cx, base, 16, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#666';
    g.fillRect(cx - 1, base - 22, 2, 14);
    g.fillStyle = '#0af';
    g.fillRect(cx - 3, base - 18, 6, 6);
    // cable
    g.strokeStyle = '#555';
    g.beginPath();
    g.moveTo(cx, base - 22);
    g.quadraticCurveTo(cx + 14, base - 40, cx + 4, h);
    g.stroke();
    drawHand(g, cx - 10, base + 8, gender);
  },
  use(ctx) {
    const e = ctx.aimEntity(7, 0.28);
    ctx.bus.emit('tool-used', { toolId: 'mouse' });
    if (e) ctx.bus.emit('inspect', { entityId: e.def.id });
  },
};
