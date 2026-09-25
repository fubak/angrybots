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
    this.el.className = 'ui-panel';
    this.el.style.cssText =
      'position:fixed;inset:20% 25%;display:none;flex-direction:column;gap:12px;z-index:20';
    this.el.innerHTML = `
      <button type="button" class="ui-btn" data-a="resume">Resume</button>
      <button type="button" class="ui-btn" data-a="restart">Restart</button>
      <button type="button" class="ui-btn" data-a="levels">Levels</button>
      <label>Music <input type="range" min="0" max="1" step="0.05" data-s="music" /></label>
      <label>Effects <input type="range" min="0" max="1" step="0.05" data-s="sfx" /></label>
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
  }

  setValues(v: { music: number; sfx: number }): void {
    for (const input of this.el.querySelectorAll<HTMLInputElement>('input[data-s]')) {
      const k = input.dataset.s;
      if (k === 'music') input.value = String(v.music);
      if (k === 'sfx') input.value = String(v.sfx);
    }
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.style.display = on ? 'flex' : 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }
}
