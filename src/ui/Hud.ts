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
  private readonly muteBtn: HTMLButtonElement;
  private readonly bannerEl: HTMLElement;
  private bannerTimer = 0;

  constructor(parent: HTMLElement, onPause: () => void, onMute: () => void = () => {}) {
    this.root = document.createElement('div');
    this.root.className = 'hud-top';
    const pause = iconButton('pause', 'Pause');
    pause.addEventListener('click', onPause);
    this.muteBtn = iconButton('sound', 'Mute');
    this.muteBtn.setAttribute('aria-pressed', 'false');
    this.muteBtn.addEventListener('click', onMute);
    this.root.innerHTML = `
      <div class="hud-starbar"><div class="fill"></div></div>
      <div class="hud-cluster hud-right">
        <div class="hud-score" aria-live="polite">0</div>
        <div class="hud-best">Best: 0</div>
        <div class="hud-targets">${iconSvg('target', 18)}<span>0</span></div>
      </div>`;
    this.root.prepend(pause);
    this.root.prepend(this.muteBtn);
    parent.appendChild(this.root);
    this.bannerEl = document.createElement('div');
    this.bannerEl.className = 'hud-banner';
    this.bannerEl.setAttribute('aria-live', 'polite');
    parent.appendChild(this.bannerEl);
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

  setMuted(muted: boolean): void {
    this.muteBtn.setAttribute('aria-pressed', String(muted));
    this.muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    this.muteBtn.title = muted ? 'Unmute (M)' : 'Mute (M)';
    this.muteBtn.innerHTML = iconSvg(muted ? 'mute' : 'sound');
  }

  /** Level title card that slides in on load and fades on its own. */
  banner(kicker: string, title: string): void {
    window.clearTimeout(this.bannerTimer);
    this.bannerEl.replaceChildren();
    const k = document.createElement('span');
    k.className = 'hud-banner-kicker';
    k.textContent = kicker;
    const t = document.createElement('span');
    t.className = 'hud-banner-title';
    t.textContent = title;
    this.bannerEl.append(k, t);
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.remove('show'), 2200);
  }

  clearTip(): void {
    window.clearTimeout(this.tipTimer);
    this.tipEl?.remove();
    this.tipEl = null;
  }

  hide(): void {
    this.root.style.display = 'none';
    this.bannerEl.classList.remove('show');
    this.clearTip();
  }

  show(): void {
    this.root.style.display = 'flex';
  }
}
