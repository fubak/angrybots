import { CHAPTERS } from '../levels/chapters';
import type { LevelV2 } from '../levels/schema';

export class LevelSelect {
  readonly el: HTMLElement;
  private grid: HTMLElement;
  private total: HTMLElement;

  constructor(parent: HTMLElement, onPick: (id: string) => void, onBack?: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel level-select';
    this.el.style.display = 'none';
    const head = document.createElement('div');
    head.className = 'level-head';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'ui-btn ui-ghost';
    back.textContent = '\u2039 Title';
    back.setAttribute('aria-label', 'Back to title');
    back.addEventListener('click', () => onBack?.());
    const heading = document.createElement('h2');
    heading.textContent = 'Select a level';
    this.total = document.createElement('span');
    this.total.className = 'level-total';
    head.append(back, heading, this.total);
    this.grid = document.createElement('div');
    this.grid.className = 'level-groups';
    this.el.append(head, this.grid);
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
    let earned = 0;
    for (const chapter of CHAPTERS) {
      const group = levels.filter((l) => l.chapter === chapter.id);
      if (!group.length) continue;
      const title = document.createElement('h3');
      title.className = 'level-chapter';
      title.textContent = chapter.name;
      title.style.color = chapter.color;
      const row = document.createElement('div');
      row.className = 'level-row';
      for (const l of group) {
        n += 1;
        const stars = starsFor(l.id);
        earned += stars;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ui-btn lvl-btn';
        if (stars > 0) btn.classList.add('cleared');
        btn.style.setProperty('--chapter', chapter.color);
        const starText = unlocked(l.id) ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '···';
        btn.innerHTML = `<span class="lvl-n">${n}</span><span class="lvl-name">${l.name}</span><span class="lvl-stars" aria-hidden="true">${starText}</span>`;
        btn.disabled = !unlocked(l.id);
        btn.dataset.levelId = l.id;
        btn.setAttribute('aria-label', `Level ${n} ${l.name}${stars ? `, ${stars} stars` : ''}`);
        btn.title = l.name;
        btn.addEventListener('click', () => this.onPick(l.id));
        row.appendChild(btn);
      }
      this.grid.append(title, row);
    }
    this.total.textContent = `\u2605 ${earned} / ${n * 3}`;
  }

  show(): void {
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
