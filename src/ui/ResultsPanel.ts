export class ResultsPanel {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement, onAction: (action: 'retry' | 'next' | 'levels') => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel';
    this.el.style.cssText =
      'position:fixed;inset:15% 20%;display:none;flex-direction:column;gap:12px;z-index:25';
    this.el.innerHTML = `
      <h2 id="results-title" style="margin:0;font-size:28px">Victory!</h2>
      <p id="results-score" aria-live="polite">0</p>
      <div id="results-stars">★★★</div>
      <button type="button" class="ui-btn" data-a="levels">Levels</button>
      <button type="button" class="ui-btn" data-a="retry">Retry</button>
      <button type="button" class="ui-btn ui-primary" data-a="next">Next</button>
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
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.el.querySelector('#results-stars')!.textContent = starStr;
    const next = this.el.querySelector('[data-a="next"]') as HTMLButtonElement;
    next.style.display = won ? 'block' : 'none';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
