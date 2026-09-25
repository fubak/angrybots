import { CHAPTERS } from '../levels/chapters';
import type { LevelV2 } from '../levels/schema';
import { iconButton, iconSvg } from './icons';

export type LevelSelectApi = {
  unlocked: (id: string) => boolean;
  starsFor: (id: string) => number;
  chapterUnlocked: (chapter: string) => boolean;
  chapterStars: (chapter: string) => number;
  /** e.g. "Clear Training Green 10 · 15★ needed" */
  chapterGateText: (chapter: string) => string;
  chapterArt: (chapter: string) => string;
  currentId: () => string | null;
};

export class LevelSelect {
  readonly el: HTMLElement;
  private readonly onPick: (id: string) => void;
  private readonly onBack: () => void;
  private levels: readonly LevelV2[] = [];
  private api: LevelSelectApi | null = null;
  private screen: 'chapters' | 'path' = 'chapters';
  private chapterId: string | null = null;

  constructor(parent: HTMLElement, onPick: (id: string) => void, onBack: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'map-screen';
    this.onPick = onPick;
    this.onBack = onBack;
    parent.appendChild(this.el);
  }

  populate(levels: readonly LevelV2[], api: LevelSelectApi): void {
    this.levels = levels;
    this.api = api;
    this.render();
  }

  /** Back within the map: path → chapters; chapters → title. Returns true if handled internally. */
  back(): boolean {
    if (this.screen === 'path') {
      this.screen = 'chapters';
      this.chapterId = null;
      this.render();
      return true;
    }
    return false;
  }

  isPathScreen(): boolean {
    return this.screen === 'path';
  }

  private render(): void {
    if (!this.api) return;
    this.el.replaceChildren();
    if (this.screen === 'chapters') this.renderChapters();
    else this.renderPath();
  }

  private renderChapters(): void {
    const api = this.api!;
    const back = iconButton('back', 'Back', 'map-back');
    back.addEventListener('click', this.onBack);
    const title = document.createElement('h2');
    title.className = 'map-title';
    title.textContent = 'Choose a Chapter';
    const cards = document.createElement('div');
    cards.className = 'chapter-cards';
    for (const chapter of CHAPTERS) {
      const unlocked = api.chapterUnlocked(chapter.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'chapter-card';
      card.dataset.chapterId = chapter.id;
      card.setAttribute('aria-label', `${chapter.name}${unlocked ? '' : ' locked'}`);
      card.disabled = !unlocked;
      const stars = api.chapterStars(chapter.id);
      card.innerHTML = `
        <div class="card-art" style="background:linear-gradient(160deg,${chapter.color},${chapter.color}66 55%,#2c1d10)">
          <img alt="" src="${api.chapterArt(chapter.id)}" />
        </div>
        <div class="card-body">
          <div class="card-name">${chapter.name}</div>
          <div class="card-stars">${iconSvg('star', 15)} ${stars}/30</div>
        </div>
        ${unlocked ? '' : `<div class="card-lock">${iconSvg('lock', 30)}<span>${api.chapterGateText(chapter.id)}</span></div>`}`;
      if (unlocked) {
        card.addEventListener('click', () => {
          this.screen = 'path';
          this.chapterId = chapter.id;
          this.render();
        });
      }
      cards.appendChild(card);
    }
    this.el.append(back, title, cards);
  }

  /** Node positions (percent) along a zigzag path, bottom to top.
   *  Adjacent nodes always differ by ≥26% horizontally so they can't overlap
   *  on short screens. */
  private pathPoints(n: number): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    const zig = [24, 50, 76, 50];
    for (let i = 0; i < n; i++) {
      const t = n <= 1 ? 0 : i / (n - 1);
      pts.push({
        x: zig[i % zig.length]!,
        y: 90 - t * 78,
      });
    }
    return pts;
  }

  private renderPath(): void {
    const api = this.api!;
    const chapter = CHAPTERS.find((c) => c.id === this.chapterId)!;
    const group = this.levels.filter((l) => l.chapter === chapter.id);
    const back = iconButton('back', 'Back to chapters', 'map-back');
    back.addEventListener('click', () => this.back());
    const title = document.createElement('h2');
    title.className = 'map-title';
    title.textContent = chapter.name;

    const wrap = document.createElement('div');
    wrap.className = 'path-wrap';
    const pts = this.pathPoints(group.length);
    const d = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 5.6} ${p.y * 6.4}`)
      .join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 560 640');
    svg.setAttribute('class', 'path-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="${d}" fill="none" stroke="#8a5a24" stroke-width="10" stroke-linecap="round" stroke-dasharray="1 26"/>`;
    wrap.appendChild(svg);

    const currentId = api.currentId();
    group.forEach((l, i) => {
      const p = pts[i]!;
      const stars = api.starsFor(l.id);
      const open = api.unlocked(l.id);
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'lvl-node';
      node.dataset.levelId = l.id;
      node.style.left = `${p.x}%`;
      node.style.top = `${p.y}%`;
      node.disabled = !open;
      if (l.id === currentId) node.classList.add('current');
      if (!open) node.classList.add('locked');
      const starsHtml = open
        ? `<span class="node-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`
        : '';
      node.innerHTML = open
        ? `<span>${i + 1}</span>${starsHtml}`
        : `${iconSvg('lock', 20)}${starsHtml}`;
      node.setAttribute(
        'aria-label',
        `Level ${i + 1} ${l.name}${open ? `, ${stars} stars` : ', locked'}`
      );
      node.title = l.name;
      if (open) node.addEventListener('click', () => this.onPick(l.id));
      wrap.appendChild(node);
    });
    this.el.append(back, title, wrap);
  }

  show(): void {
    this.screen = 'chapters';
    this.chapterId = null;
    this.render();
    this.el.classList.add('open');
  }

  hide(): void {
    this.el.classList.remove('open');
  }
}
