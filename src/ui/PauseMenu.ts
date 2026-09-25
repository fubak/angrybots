import { iconButton } from './icons';

export class PauseMenu {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;
  private visible = false;

  constructor(
    parent: HTMLElement,
    handlers: {
      resume: () => void;
      restart: () => void;
      levels: () => void;
      settings: () => void;
      onSettings: (key: string, value: number | boolean | string) => void;
    }
  ) {
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap';
    this.panel = document.createElement('div');
    this.panel.className = 'ui-panel modal modal-pop';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Paused');
    this.panel.innerHTML = `
      <h2 class="panel-title">Paused</h2>
      <div class="btn-row"></div>
      <label class="settings-row">Music <input type="range" min="0" max="1" step="0.05" data-s="music" aria-label="Music volume" /></label>
      <label class="settings-row">Effects <input type="range" min="0" max="1" step="0.05" data-s="sfx" aria-label="Effects volume" /></label>
    `;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    this.el.append(backdrop, this.panel);
    parent.appendChild(this.el);

    const row = this.panel.querySelector('.btn-row')!;
    const resume = iconButton('play', 'Resume', 'ui-primary');
    resume.addEventListener('click', handlers.resume);
    const restart = iconButton('restart', 'Restart');
    restart.dataset.a = 'restart';
    restart.addEventListener('click', handlers.restart);
    const levels = iconButton('levels', 'Levels');
    levels.dataset.a = 'levels';
    levels.addEventListener('click', handlers.levels);
    const settings = iconButton('settings', 'Settings');
    settings.dataset.a = 'settings';
    settings.addEventListener('click', handlers.settings);
    row.append(resume, restart, levels, settings);

    for (const input of this.panel.querySelectorAll<HTMLInputElement>('input[data-s]')) {
      input.addEventListener('input', () => {
        handlers.onSettings(input.dataset.s!, parseFloat(input.value));
      });
    }
  }

  setValues(v: { music: number; sfx: number }): void {
    for (const input of this.panel.querySelectorAll<HTMLInputElement>('input[data-s]')) {
      const k = input.dataset.s;
      if (k === 'music') input.value = String(v.music);
      if (k === 'sfx') input.value = String(v.sfx);
    }
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.classList.toggle('open', on);
    if (on) this.panel.querySelector<HTMLElement>('button')?.focus();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
