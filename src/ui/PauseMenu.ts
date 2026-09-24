export type PauseSettings = {
  music: number;
  sfx: number;
  reducedMotion: boolean;
};

export class PauseMenu {
  readonly el: HTMLElement;
  private visible = false;

  constructor(
    parent: HTMLElement,
    handlers: {
      resume: () => void;
      restart: () => void;
      levels: () => void;
      onSettings: (key: string, value: number | boolean | string) => void;
    }
  ) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel pause-panel';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Paused');
    this.el.innerHTML = `
      <h2>Paused</h2>
      <div class="pause-actions">
        <button type="button" class="ui-btn ui-primary" data-a="resume">Resume</button>
        <button type="button" class="ui-btn" data-a="restart">Restart</button>
        <button type="button" class="ui-btn" data-a="levels">Levels</button>
      </div>
      <div class="pause-settings">
        <label class="setting-row"><span>Music</span><input type="range" min="0" max="1" step="0.05" data-s="music" aria-label="Music volume" /></label>
        <label class="setting-row"><span>Effects</span><input type="range" min="0" max="1" step="0.05" data-s="sfx" aria-label="Effects volume" /></label>
        <label class="setting-row setting-check"><span>Reduced motion</span><input type="checkbox" data-c="reducedMotion" /></label>
      </div>
      <p class="pause-keys">Esc pause · R restart · M mute · Space ability</p>
    `;
    parent.appendChild(this.el);
    this.el.querySelector('[data-a="resume"]')!.addEventListener('click', handlers.resume);
    this.el.querySelector('[data-a="restart"]')!.addEventListener('click', handlers.restart);
    this.el.querySelector('[data-a="levels"]')!.addEventListener('click', handlers.levels);
    for (const input of this.el.querySelectorAll<HTMLInputElement>('input[data-s]')) {
      input.addEventListener('input', () => {
        handlers.onSettings(input.dataset.s!, parseFloat(input.value));
      });
    }
    for (const input of this.el.querySelectorAll<HTMLInputElement>('input[data-c]')) {
      input.addEventListener('change', () => {
        handlers.onSettings(input.dataset.c!, input.checked);
      });
    }
  }

  setSettings(s: PauseSettings): void {
    const music = this.el.querySelector<HTMLInputElement>('input[data-s="music"]')!;
    const sfx = this.el.querySelector<HTMLInputElement>('input[data-s="sfx"]')!;
    const rm = this.el.querySelector<HTMLInputElement>('input[data-c="reducedMotion"]')!;
    music.value = String(s.music);
    sfx.value = String(s.sfx);
    rm.checked = s.reducedMotion;
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.style.display = on ? 'flex' : 'none';
    if (on) this.el.querySelector<HTMLButtonElement>('[data-a="resume"]')?.focus();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
