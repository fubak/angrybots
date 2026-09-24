export class ResultsPanel {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement, onAction: (action: 'retry' | 'next' | 'levels') => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel results-panel';
    this.el.innerHTML = `
      <div id="results-stars"></div>
      <h2 id="results-title">Victory!</h2>
      <p id="results-sub" class="results-sub"></p>
      <div class="results-score-row">
        <span class="results-label">Score</span>
        <span id="results-score" aria-live="polite">0</span>
      </div>
      <p id="results-best" class="results-best"></p>
      <div class="results-actions">
        <button type="button" class="ui-btn" data-a="levels">Levels</button>
        <button type="button" class="ui-btn" data-a="retry">Retry</button>
        <button type="button" class="ui-btn ui-primary" data-a="next">Next</button>
      </div>
    `;
    parent.appendChild(this.el);
    for (const btn of this.el.querySelectorAll<HTMLButtonElement>('button[data-a]')) {
      btn.addEventListener('click', () =>
        onAction(btn.dataset.a as 'retry' | 'next' | 'levels')
      );
    }
  }

  isVisible(): boolean {
    return this.el.style.display === 'flex';
  }

  show(won: boolean, score: number, stars: number, best = 0, levelName = ''): void {
    this.el.style.display = 'flex';
    this.el.classList.toggle('lost', !won);
    this.el.querySelector('#results-title')!.textContent = won ? 'Victory!' : 'Defeat!';
    this.el.querySelector('#results-sub')!.textContent = won
      ? levelName
        ? `${levelName} cleared`
        : 'Yard cleared'
      : 'Out of bots — targets still standing';
    this.el.querySelector('#results-score')!.textContent = score.toLocaleString();
    const bestEl = this.el.querySelector('#results-best')!;
    bestEl.textContent =
      score > 0 && score >= best ? 'New best!' : best > 0 ? `Best: ${best.toLocaleString()}` : '';
    const starHost = this.el.querySelector('#results-stars')!;
    starHost.replaceChildren();
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.className = i < stars ? 'star on' : 'star';
      star.style.animationDelay = `${i * 0.16}s`;
      star.textContent = i < stars ? '★' : '☆';
      starHost.appendChild(star);
    }
    const next = this.el.querySelector('[data-a="next"]') as HTMLButtonElement;
    next.style.display = won ? 'block' : 'none';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
