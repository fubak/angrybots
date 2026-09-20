export type OverlaySettings = {
  masterVolume: number;
  reducedMotion: boolean;
};

export type OverlayActions = {
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSettingsChange?: (partial: Partial<OverlaySettings>) => void;
};

export class FlowOverlay {
  readonly root: HTMLElement;
  private actions: OverlayActions;

  constructor(container: HTMLElement, actions: OverlayActions) {
    this.actions = actions;
    this.root = document.createElement('div');
    this.root.id = 'flow-overlay';
    this.root.hidden = true;
    container.appendChild(this.root);
  }

  showTitle(settings: OverlaySettings) {
    this.root.hidden = false;
    this.root.dataset.mode = 'title';
    this.root.innerHTML = `
      <div class="flow-panel">
        <h1>Angry Bots</h1>
        <p>Grok Edition — pull, aim, clear the rival pigs.</p>
        <p class="flow-hint">Drag the Grok bot backward on the left to aim.</p>
        ${this.settingsMarkup(settings)}
        <button type="button" class="flow-btn primary" data-action="start">Play</button>
      </div>`;
    this.wire();
    this.root.onpointerdown = (e) => {
      if (e.target !== this.root) return;
      e.preventDefault();
      this.actions.onStart();
    };
  }

  showPaused(settings: OverlaySettings) {
    this.root.hidden = false;
    this.root.innerHTML = `
      <div class="flow-panel">
        <h2>Paused</h2>
        ${this.settingsMarkup(settings)}
        <button type="button" class="flow-btn primary" data-action="resume">Resume</button>
        <button type="button" class="flow-btn" data-action="menu">Level select</button>
      </div>`;
    this.wire();
  }

  showResults(opts: {
    won: boolean;
    score: number;
    stars: number;
    hasNext: boolean;
    breakdown?: { pigs: number; blocks: number; birdsLeft: number };
  }) {
    this.root.hidden = false;
    const stars = '★'.repeat(opts.stars) + '☆'.repeat(3 - opts.stars);
    const breakdown = opts.breakdown;
    const breakdownHtml = breakdown
      ? `<ul class="flow-breakdown" aria-label="Score breakdown">
          <li><span>Pigs cleared</span><span>${breakdown.pigs.toLocaleString()}</span></li>
          <li><span>Blocks broken</span><span>${breakdown.blocks.toLocaleString()}</span></li>
          <li><span>Bots remaining</span><span>${breakdown.birdsLeft.toLocaleString()}</span></li>
        </ul>`
      : '';
    this.root.innerHTML = `
      <div class="flow-panel ${opts.won ? 'win' : 'lose'}">
        <h2>${opts.won ? 'Victory!' : 'Out of bots'}</h2>
        <p class="flow-stars" aria-label="${opts.stars} stars">${stars}</p>
        <p class="flow-score">Score: ${opts.score.toLocaleString()}</p>
        ${breakdownHtml}
        <div class="flow-actions">
          <button type="button" class="flow-btn" data-action="retry">Retry</button>
          ${
            opts.won && opts.hasNext
              ? '<button type="button" class="flow-btn primary" data-action="next">Next level</button>'
              : ''
          }
          <button type="button" class="flow-btn" data-action="menu">Levels</button>
        </div>
      </div>`;
    this.wire();
  }

  showLevelSelect(levels: { id: string; name: string; unlocked: boolean; stars: number }[], currentId: string) {
    this.root.hidden = false;
    const items = levels
      .map(
        (l) =>
          `<button type="button" class="flow-level ${l.id === currentId ? 'current' : ''}" data-level="${l.id}" ${l.unlocked ? '' : 'disabled'}>
            ${l.name} ${l.unlocked ? '★'.repeat(l.stars) : '🔒'}
          </button>`
      )
      .join('');
    this.root.innerHTML = `
      <div class="flow-panel wide">
        <h2>Levels</h2>
        <div class="flow-level-list">${items}</div>
        <button type="button" class="flow-btn" data-action="menu-close">Back</button>
      </div>`;
    this.root.querySelectorAll('[data-level]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.level;
        if (!id) return;
        (this as unknown as { pickLevel?: (id: string) => void }).pickLevel?.(
          id
        );
      });
    });
    this.wire();
  }

  hide() {
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.root.onpointerdown = null;
    delete this.root.dataset.mode;
  }

  isVisible() {
    return !this.root.hidden;
  }

  private settingsMarkup(settings: OverlaySettings) {
    const pct = Math.round(settings.masterVolume * 100);
    return `
      <div class="flow-settings">
        <label class="flow-setting">Volume
          <input type="range" min="0" max="100" value="${pct}" data-setting="volume" />
        </label>
        <label class="flow-setting flow-check">
          <input type="checkbox" data-setting="reduced-motion" ${settings.reducedMotion ? 'checked' : ''} />
          Reduced motion
        </label>
      </div>`;
  }

  private wire() {
    const vol = this.root.querySelector('[data-setting="volume"]') as
      | HTMLInputElement
      | null;
    vol?.addEventListener('input', () => {
      this.actions.onSettingsChange?.({
        masterVolume: Number(vol.value) / 100,
      });
    });
    const motion = this.root.querySelector('[data-setting="reduced-motion"]') as
      | HTMLInputElement
      | null;
    motion?.addEventListener('change', () => {
      this.actions.onSettingsChange?.({ reducedMotion: motion.checked });
    });

    this.root.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const a = (el as HTMLElement).dataset.action;
        switch (a) {
          case 'start':
            this.actions.onStart();
            break;
          case 'retry':
            this.actions.onRetry();
            break;
          case 'next':
            this.actions.onNext();
            break;
          case 'menu':
            this.actions.onMenu();
            break;
          case 'resume':
            this.actions.onResume();
            break;
          case 'menu-close':
            this.hide();
            this.actions.onResume();
            break;
        }
      });
    });
  }
}
