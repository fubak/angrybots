import type { Gender, ToolDef } from '../core/types';
import { VIEW_H, VIEW_W } from '../render/renderer';
import { sortedTools } from '../tools';

/**
 * LOOK: Doom-style bottom status bar + message ticker + tool viewmodel.
 * Drawn each frame on a 2D canvas overlay at 320x200.
 */
export class Hud {
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private messages: { text: string; kind: string; t: number }[] = [];

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hud';
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.g = this.canvas.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    container.appendChild(this.canvas);
  }

  pushMessage(text: string, kind = 'info'): void {
    this.messages.push({ text, kind, t: 6 });
    if (this.messages.length > 3) this.messages.shift();
  }

  tick(dt: number): void {
    for (const m of this.messages) m.t -= dt;
    this.messages = this.messages.filter((m) => m.t > 0);
  }

  draw(opts: {
    integrity: number;
    ammo: number | null;
    ammoName: string;
    tool: ToolDef;
    bob: number;
    cooldownFrac: number;
    gender: Gender;
    credentials: string;
    objectives: { text: string; done: boolean; failed: boolean }[];
  }): void {
    const g = this.g;
    g.clearRect(0, 0, VIEW_W, VIEW_H);

    // viewmodel (tool sprite)
    opts.tool.drawViewmodel(g, VIEW_W, VIEW_H, Math.sin(opts.bob) * 2, opts.gender, opts.cooldownFrac);

    // messages top-left
    let my = 6;
    for (const m of this.messages) {
      g.font = '6px monospace';
      g.fillStyle =
        m.kind === 'bad' ? '#e0301e' : m.kind === 'good' ? '#39d353' : m.kind === 'warn' ? '#ffb000' : '#b8c4d8';
      const lines = wrap(m.text, 62);
      for (const line of lines) {
        g.fillText(line, 4, my);
        my += 7;
      }
      my += 2;
    }

    // objectives top-right (compact)
    g.font = '6px monospace';
    let oy = 6;
    for (const o of opts.objectives) {
      g.fillStyle = o.failed ? '#e0301e' : o.done ? '#39d353' : '#887';
      const mark = o.failed ? '✗' : o.done ? '✓' : '·';
      g.fillText(`${mark} ${o.text.slice(0, 34)}`, VIEW_W - 4 - g.measureText(`${mark} ${o.text.slice(0, 34)}`).width, oy);
      oy += 7;
    }

    // status bar
    const barH = 26;
    const by = VIEW_H - barH;
    g.fillStyle = '#101218';
    g.fillRect(0, by, VIEW_W, barH);
    g.fillStyle = '#2a2f40';
    g.fillRect(0, by, VIEW_W, 2);

    // integrity
    g.fillStyle = '#e0301e';
    g.font = 'bold 14px monospace';
    g.fillText(`${Math.ceil(opts.integrity)}`, 8, by + 18);
    g.font = '5px monospace';
    g.fillStyle = '#a66';
    g.fillText('INTEGRITY', 6, by + 24);

    // face portrait (procedural, gendered)
    this.drawFace(120, by + 13, opts.gender, opts.integrity);

    // ammo
    g.font = 'bold 12px monospace';
    g.fillStyle = '#ffb000';
    g.fillText(opts.ammo === null ? '—' : `${opts.ammo}`, 160, by + 17);
    g.font = '5px monospace';
    g.fillStyle = '#887';
    g.fillText(opts.ammo === null ? 'NO AMMO' : opts.ammoName.toUpperCase(), 156, by + 24);

    // tool name
    g.font = '6px monospace';
    g.fillStyle = '#9ab';
    g.fillText(`[${opts.tool.slot}] ${opts.tool.name}`, 205, by + 12);

    // credentials slot
    g.fillStyle = '#3a3f55';
    g.fillRect(268, by + 5, 46, 16);
    g.fillStyle = '#39d353';
    g.font = '5px monospace';
    g.fillText('CRED', 272, by + 11);
    g.fillStyle = '#fff';
    g.fillText(opts.credentials.toUpperCase().slice(0, 8), 272, by + 18);
  }

  private drawFace(cx: number, cy: number, gender: Gender, integrity: number): void {
    const g = this.g;
    const s = 22;
    const x = cx - s / 2;
    const y = cy - s / 2;
    const hurt = integrity < 40;
    g.fillStyle = hurt ? '#5a2020' : '#1c2030';
    g.fillRect(x - 2, y - 2, s + 4, s + 4);
    const skin = gender === 'female' ? '#f0c8a0' : '#e8b98a';
    g.fillStyle = skin;
    g.fillRect(x + 5, y + 6, 12, 12);
    g.fillStyle = gender === 'female' ? '#620' : '#432';
    g.fillRect(x + 4, y + 4, 14, 4);
    if (gender === 'female') {
      g.fillRect(x + 3, y + 6, 3, 12);
      g.fillRect(x + 16, y + 6, 3, 12);
    }
    g.fillStyle = '#111';
    g.fillRect(x + 7, y + 10, 3, 3);
    g.fillRect(x + 12, y + 10, 3, 3);
    g.fillRect(x + 8, y + 15, 6, hurt ? 1 : 2);
    if (hurt) {
      g.fillStyle = '#c33';
      g.fillRect(x + 5, y + 8, 3, 2);
    }
  }
}

function wrap(text: string, n: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) {
      lines.push(cur.trim());
      cur = w;
    } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 4);
}

export { sortedTools };
