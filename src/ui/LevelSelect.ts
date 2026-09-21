import type { LevelV2 } from '../levels/schema';

export class LevelSelect {
  readonly el: HTMLElement;
  private grid: HTMLElement;

  constructor(parent: HTMLElement, onPick: (id: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel';
    this.el.style.cssText =
      'position:fixed;inset:10% 15%;display:none;flex-direction:column;gap:12px;z-index:15';
    this.grid = document.createElement('div');
    this.grid.style.cssText =
      'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;overflow:auto';
    const heading = document.createElement('h2');
    heading.textContent = 'Select a level';
    heading.style.margin = '0';
    this.el.append(heading, this.grid);
    parent.appendChild(this.el);
    this.onPick = onPick;
  }

  private onPick: (id: string) => void;

  populate(levels: readonly LevelV2[], unlocked: (id: string) => boolean): void {
    this.grid.replaceChildren();
    for (const l of levels) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-btn';
      btn.textContent = String(l.order);
      btn.disabled = !unlocked(l.id);
      btn.dataset.levelId = l.id;
      btn.setAttribute('aria-label', `Level ${l.order} ${l.name}`);
      btn.addEventListener('click', () => this.onPick(l.id));
      this.grid.appendChild(btn);
    }
  }

  show(): void {
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
