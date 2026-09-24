const ICON = {
  pause:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor"/></svg>',
  restart:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
  sound:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a9 9 0 0 1 0 12"/></svg>',
  muted:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 5"/><path d="M22 9l-5 5"/></svg>',
};

export class Hud {
  readonly root: HTMLElement;
  private scoreEl: HTMLElement;
  private shotsEl: HTMLElement;
  private bestEl: HTMLElement;
  private tipEl: HTMLElement;
  private muteBtn: HTMLButtonElement;
  private bannerEl: HTMLElement;
  private bannerTimer = 0;
  private lastScore = -1;
  private lastShots = -1;

  constructor(
    parent: HTMLElement,
    onPause: () => void,
    onRestart: () => void,
    onMute: () => void = () => {}
  ) {
    this.root = document.createElement('div');
    this.root.className = 'hud-top';
    this.root.innerHTML = `
      <div class="hud-left">
        <button type="button" class="ui-btn ui-icon" aria-label="Pause" title="Pause (Esc)">${ICON.pause}</button>
        <button type="button" class="ui-btn ui-icon" aria-label="Restart" title="Restart (R)">${ICON.restart}</button>
        <button type="button" class="ui-btn ui-icon" aria-label="Mute" aria-pressed="false" title="Mute (M)">${ICON.sound}</button>
      </div>
      <div class="hud-cluster">
        <div class="hud-score" aria-live="polite">0</div>
        <div class="hud-shots" aria-live="polite" aria-label="Shots: 0"><span class="hud-shots-label">Shots: 0</span><span class="hud-shots-dots" aria-hidden="true"></span></div>
        <div class="hud-best">Best: 0</div>
        <div class="hud-tip"></div>
      </div>
    `;
    parent.appendChild(this.root);
    this.bannerEl = document.createElement('div');
    this.bannerEl.className = 'hud-banner';
    this.bannerEl.setAttribute('aria-live', 'polite');
    parent.appendChild(this.bannerEl);
    this.scoreEl = this.root.querySelector('.hud-score')!;
    this.shotsEl = this.root.querySelector('.hud-shots')!;
    this.bestEl = this.root.querySelector('.hud-best')!;
    this.tipEl = this.root.querySelector('.hud-tip')!;
    this.muteBtn = this.root.querySelector('[aria-label="Mute"]')!;
    this.root.querySelector('[aria-label="Pause"]')!.addEventListener('click', onPause);
    this.root.querySelector('[aria-label="Restart"]')!.addEventListener('click', onRestart);
    this.muteBtn.addEventListener('click', onMute);
  }

  setScore(score: number, best: number): void {
    const s = Math.round(score);
    if (s !== this.lastScore) {
      if (this.lastScore >= 0 && s > this.lastScore) {
        this.scoreEl.classList.remove('bump');
        void this.scoreEl.offsetWidth;
        this.scoreEl.classList.add('bump');
      }
      this.lastScore = s;
      this.scoreEl.textContent = s.toLocaleString();
    }
    this.bestEl.textContent = `Best: ${Math.round(best).toLocaleString()}`;
  }

  setShots(n: number): void {
    if (n === this.lastShots) return;
    this.lastShots = n;
    this.shotsEl.setAttribute('aria-label', `Shots: ${n}`);
    this.shotsEl.querySelector('.hud-shots-label')!.textContent = `Shots: ${n}`;
    const dots = this.shotsEl.querySelector('.hud-shots-dots')!;
    dots.replaceChildren();
    for (let i = 0; i < Math.min(n, 6); i++) {
      const d = document.createElement('span');
      d.className = 'hud-dot';
      dots.appendChild(d);
    }
  }

  setTip(text: string): void {
    if (this.tipEl.textContent !== text) this.tipEl.textContent = text;
  }

  setMuted(muted: boolean): void {
    this.muteBtn.setAttribute('aria-pressed', String(muted));
    this.muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    this.muteBtn.title = muted ? 'Unmute (M)' : 'Mute (M)';
    this.muteBtn.innerHTML = muted ? ICON.muted : ICON.sound;
  }

  /** Level title card that slides in on load and fades on its own. */
  banner(kicker: string, title: string): void {
    window.clearTimeout(this.bannerTimer);
    this.bannerEl.innerHTML = '';
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

  hide(): void {
    this.root.style.display = 'none';
    this.bannerEl.classList.remove('show');
  }

  show(): void {
    this.root.style.display = 'flex';
  }
}
