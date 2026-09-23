export class ResultsPanel {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement, onAction: (action: 'retry' | 'next' | 'levels') => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel results-panel';
    this.el.innerHTML = `
      <h2 id="results-title">Victory!</h2>
      <p id="results-score" aria-live="polite">0</p>
      <div id="results-stars"></div>
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

  show(won: boolean, score: number, stars: number): void {
    this.el.style.display = 'flex';
    this.el.querySelector('#results-title')!.textContent = won ? 'Victory!' : 'Defeat!';
    this.el.querySelector('#results-score')!.textContent = score.toLocaleString();
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
