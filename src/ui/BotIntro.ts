import type { BotKind } from '../levels/schema';
import { botTipFor } from '../bots/tutorialTips';

export class BotIntro {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private visible = false;
  private onDone: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap';
    this.el.style.zIndex = '45';
    const card = document.createElement('div');
    card.className = 'ui-panel bot-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'New bot');
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = 512;
    card.innerHTML = `
      <div class="bot-name"></div>
      <p class="bot-tip"></p>
      <p class="bot-tip" style="font-weight:800;color:#8a5a24"></p>
      <div class="btn-row"><button type="button" class="ui-btn ui-primary">Got it!</button></div>`;
    card.insertBefore(this.canvas, card.firstChild);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    this.el.append(backdrop, card);
    parent.appendChild(this.el);
    const dismiss = () => this.close();
    card.querySelector('button')!.addEventListener('click', dismiss);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el || e.target === backdrop) dismiss();
    });
  }

  /** Draw the bot's painted face into the card canvas. */
  show(kind: BotKind, faceImage: CanvasImageSource, onDone: () => void): void {
    const tip = botTipFor(kind);
    this.el.querySelector('.bot-name')!.textContent = tip.name;
    const lines = this.el.querySelectorAll('.bot-tip');
    lines[0]!.textContent = tip.desc;
    lines[1]!.textContent = tip.hint;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(faceImage, 0, 0, 512, 512);
    }
    this.onDone = onDone;
    this.visible = true;
    this.el.classList.add('open');
    this.el.querySelector<HTMLElement>('button')?.focus();
  }

  private close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.el.classList.remove('open');
    this.onDone?.();
    this.onDone = null;
  }

  isVisible(): boolean {
    return this.visible;
  }
}
