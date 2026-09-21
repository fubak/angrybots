export class Hud {
  readonly root: HTMLElement;
  private scoreEl: HTMLElement;
  private shotsEl: HTMLElement;
  private bestEl: HTMLElement;
  constructor(parent: HTMLElement, onPause: () => void, onRestart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud-top';
    this.root.innerHTML = `
      <div class="hud-left" style="display:flex;gap:8px">
        <button type="button" class="ui-btn" aria-label="Pause">⏸</button>
        <button type="button" class="ui-btn" aria-label="Restart">↻</button>
      </div>
      <div>
        <div class="hud-score" aria-live="polite">0</div>
        <div class="hud-shots" aria-live="polite">Shots: 0</div>
        <div class="hud-best" style="font-size:14px">Best: 0</div>
      </div>
    `;
    parent.appendChild(this.root);
    this.scoreEl = this.root.querySelector('.hud-score')!;
    this.shotsEl = this.root.querySelector('.hud-shots')!;
    this.bestEl = this.root.querySelector('.hud-best')!;
    this.root.querySelector('[aria-label="Pause"]')!.addEventListener('click', onPause);
    this.root.querySelector('[aria-label="Restart"]')!.addEventListener('click', onRestart);
  }

  setScore(score: number, best: number): void {
    this.scoreEl.textContent = Math.round(score).toLocaleString();
    this.bestEl.textContent = `Best: ${Math.round(best).toLocaleString()}`;
  }

  setShots(n: number): void {
    this.shotsEl.textContent = `Shots: ${n}`;
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  show(): void {
    this.root.style.display = 'flex';
  }
}
