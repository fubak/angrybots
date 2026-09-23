import { CHAPTERS } from '../levels/chapters';
import type { LevelV2 } from '../levels/schema';

export class LevelSelect {
  readonly el: HTMLElement;
  private grid: HTMLElement;

  constructor(parent: HTMLElement, onPick: (id: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel';
    this.el.style.cssText =
      'position:fixed;inset:6% 8%;display:none;flex-direction:column;gap:8px;z-index:15;overflow:auto';
    this.grid = document.createElement('div');
    this.grid.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    const heading = document.createElement('h2');
    heading.textContent = 'Select a level';
    heading.style.margin = '0';
    this.el.append(heading, this.grid);
    parent.appendChild(this.el);
    this.onPick = onPick;
  }

  private onPick: (id: string) => void;

  populate(
    levels: readonly LevelV2[],
    unlocked: (id: string) => boolean,
    starsFor: (id: string) => number = () => 0
  ): void {
    this.grid.replaceChildren();
    let n = 0;
    for (const chapter of CHAPTERS) {
      const group = levels.filter((l) => l.chapter === chapter.id);
      if (!group.length) continue;
      const title = document.createElement('h3');
      title.textContent = chapter.name;
      title.style.cssText = `margin:0;padding:6px 4px;color:${chapter.color};font-size:1.05rem;position:sticky;top:0;background:#f6e2b0;z-index:1`;
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:repeat(10,minmax(48px,1fr));gap:6px';
      for (const l of group) {
        n += 1;
        const stars = starsFor(l.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ui-btn lvl-btn';
        const starText = unlocked(l.id) ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '···';
        btn.innerHTML = `<span class="lvl-n">${n}</span><span class="lvl-stars" aria-hidden="true">${starText}</span>`;
        btn.disabled = !unlocked(l.id);
        btn.dataset.levelId = l.id;
        btn.setAttribute('aria-label', `Level ${n} ${l.name}${stars ? `, ${stars} stars` : ''}`);
        btn.title = l.name;
        btn.addEventListener('click', () => this.onPick(l.id));
        row.appendChild(btn);
      }
      this.grid.append(title, row);
    }
  }

  show(): void {
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
