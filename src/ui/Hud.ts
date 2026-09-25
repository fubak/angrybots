import { iconButton, iconSvg } from './icons';

export class Hud {
  readonly root: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly bestEl: HTMLElement;
  private readonly targetsEl: HTMLElement;
  private readonly starFill: HTMLElement;
  private readonly starNotches: HTMLElement[] = [];
  private shownScore = 0;
  private targetScore = 0;
  private raf = 0;
  private tipTimer = 0;
  private tipEl: HTMLElement | null = null;

  constructor(parent: HTMLElement, onPause: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud-top';
    const pause = iconButton('pause', 'Pause');
    pause.addEventListener('click', onPause);
    this.root.innerHTML = `
      <div class="hud-starbar"><div class="fill"></div></div>
      <div class="hud-cluster hud-right">
        <div class="hud-score" aria-live="polite">0</div>
        <div class="hud-best">Best: 0</div>
        <div class="hud-targets">${iconSvg('target', 18)}<span>0</span></div>
      </div>`;
    this.root.prepend(pause);
    parent.appendChild(this.root);
    this.scoreEl = this.root.querySelector('.hud-score')!;
    this.bestEl = this.root.querySelector('.hud-best')!;
    this.targetsEl = this.root.querySelector('.hud-targets span')!;
    this.starFill = this.root.querySelector('.hud-starbar .fill')!;
    const bar = this.root.querySelector('.hud-starbar')!;
    for (let i = 0; i < 3; i++) {
      const n = document.createElement('span');
      n.className = 'notch';
      n.innerHTML = iconSvg('star', 22);
      bar.appendChild(n);
      this.starNotches.push(n);
    }
  }

  /** Star notches sit at each threshold's share of the 3-star score. */
  setStarThresholds(thresholds: [number, number, number]): void {
    const top = Math.max(1, thresholds[2]);
    this.starNotches.forEach((n, i) => {
      n.style.left = `${Math.min(97, (thresholds[i]! / top) * 100)}%`;
    });
  }

  setScore(score: number, best: number, starsTop: number): void {
    this.targetScore = score;
    if (score > this.shownScore) {
      this.scoreEl.classList.remove('bump');
      void this.scoreEl.offsetWidth;
      this.scoreEl.classList.add('bump');
    }
    if (!this.raf) this.raf = requestAnimationFrame(this.step);
    this.bestEl.textContent = `Best: ${Math.max(best, score).toLocaleString()}`;
    const top = Math.max(1, starsTop);
    this.starFill.style.width = `${Math.min(100, (score / top) * 100)}%`;
  }

  private step = (): void => {
    this.raf = 0;
    const diff = this.targetScore - this.shownScore;
    if (Math.abs(diff) < 1) {
      this.shownScore = this.targetScore;
    } else {
      this.shownScore += diff * 0.22;
      this.raf = requestAnimationFrame(this.step);
    }
    this.scoreEl.textContent = Math.round(this.shownScore).toLocaleString();
  };

  setStars(stars: number): void {
    this.starNotches.forEach((n, i) => n.classList.toggle('lit', i < stars));
  }

  setTargetsLeft(n: number): void {
    this.targetsEl.textContent = String(n);
  }

  /** Bottom-center toast, once per level per session. Auto-hides after 4s, tap dismisses. */
  showTip(text: string): void {
    this.tipEl?.remove();
    window.clearTimeout(this.tipTimer);
    const el = document.createElement('div');
    el.className = 'ui-toast hud-tip';
    el.textContent = text;
    el.setAttribute('role', 'status');
    el.addEventListener('click', () => {
      window.clearTimeout(this.tipTimer);
      el.remove();
      if (this.tipEl === el) this.tipEl = null;
    });
    this.root.parentElement?.appendChild(el);
    this.tipEl = el;
    this.tipTimer = window.setTimeout(() => {
      el.remove();
      if (this.tipEl === el) this.tipEl = null;
    }, 4000);
  }

  clearTip(): void {
    window.clearTimeout(this.tipTimer);
    this.tipEl?.remove();
    this.tipEl = null;
  }

  hide(): void {
    this.root.style.display = 'none';
    this.clearTip();
  }

  show(): void {
    this.root.style.display = 'flex';
  }
}
