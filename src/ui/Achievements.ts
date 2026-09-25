import { ACHIEVEMENTS, type AchievementSave } from '../game/achievements';
import type { LevelRef } from '../game/progression';
import { iconButton, iconSvg } from './icons';

export class AchievementsScreen {
  readonly el: HTMLElement;
  private visible = false;
  private readonly list: HTMLElement;

  constructor(parent: HTMLElement, onClose: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap';
    this.list = document.createElement('div');
    this.list.className = 'achv-list';
    const panel = document.createElement('div');
    panel.className = 'ui-panel modal modal-pop';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Achievements');
    panel.innerHTML = `<h2 class="panel-title">Achievements</h2>`;
    const back = iconButton('back', 'Back');
    back.addEventListener('click', onClose);
    const top = document.createElement('div');
    top.className = 'btn-row';
    top.appendChild(back);
    panel.append(this.list, top);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    this.el.append(backdrop, panel);
    parent.appendChild(this.el);
  }

  populate(
    unlocked: Readonly<Record<string, true>>,
    save: AchievementSave,
    levels: readonly LevelRef[]
  ): void {
    this.list.replaceChildren();
    for (const a of ACHIEVEMENTS) {
      const done = Boolean(unlocked[a.id]);
      const row = document.createElement('div');
      row.className = `achv-row${done ? '' : ' locked'}`;
      const prog = a.progress?.(save, levels);
      row.innerHTML = `
        <span aria-hidden="true">${iconSvg(done ? 'trophy' : 'lock', 26)}</span>
        <div style="flex:1">
          <div class="achv-name">${a.name}</div>
          <div class="achv-desc">${a.desc}</div>
          ${prog ? `<div class="achv-bar"><div style="width:${Math.min(100, (prog.done / prog.total) * 100)}%"></div></div>` : ''}
        </div>`;
      this.list.appendChild(row);
    }
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.classList.toggle('open', on);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
