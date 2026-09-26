import { iconButton, iconSvg } from './icons';

export type SettingsValues = {
  music: number;
  sfx: number;
  voice: number;
  muted: boolean;
  reducedMotion: boolean | null;
  aimGuide: 'off' | 'short';
};

export class Settings {
  readonly el: HTMLElement;
  private visible = false;
  private resetArmed = false;
  private resetTimer = 0;
  private resetBtn: HTMLButtonElement | null = null;

  constructor(
    parent: HTMLElement,
    handlers: {
      onChange: (key: string, value: number | boolean | string | null) => void;
      onReset: () => void;
      onClose: () => void;
    }
  ) {
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap';
    this.el.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="ui-panel modal modal-pop" role="dialog" aria-label="Settings">
        <h2 class="panel-title">Settings</h2>
        <label class="settings-row">Music <input type="range" min="0" max="1" step="0.05" data-s="music" aria-label="Music volume" /></label>
        <label class="settings-row">Effects <input type="range" min="0" max="1" step="0.05" data-s="sfx" aria-label="Effects volume" /></label>
        <label class="settings-row">Voice <input type="range" min="0" max="1" step="0.05" data-s="voice" aria-label="Voice volume" /></label>
        <div class="settings-row"><span>Mute</span><button type="button" class="ui-btn" data-mute aria-label="Toggle mute"></button></div>
        <div class="settings-row"><span>Reduced motion</span>
          <div class="seg" data-seg="motion" role="group" aria-label="Reduced motion">
            <button type="button" data-v="auto">Auto</button><button type="button" data-v="on">On</button><button type="button" data-v="off">Off</button>
          </div>
        </div>
        <div class="settings-row"><span>Aim guide</span>
          <div class="seg" data-seg="guide" role="group" aria-label="Aim guide">
            <button type="button" data-v="short">Short</button><button type="button" data-v="off">Off</button>
          </div>
        </div>
        <div class="settings-row"><span>Progress</span><button type="button" class="ui-btn ui-danger" data-reset>Reset progress</button></div>
      </div>`;
    parent.appendChild(this.el);

    for (const input of this.el.querySelectorAll<HTMLInputElement>('input[data-s]')) {
      input.addEventListener('input', () =>
        handlers.onChange(input.dataset.s!, parseFloat(input.value))
      );
    }
    this.el.querySelector('[data-mute]')!.addEventListener('click', () => {
      const b = this.el.querySelector<HTMLElement>('[data-mute]')!;
      const on = b.dataset.on !== '1';
      handlers.onChange('muted', on);
      this.paintMute(on);
    });
    for (const seg of this.el.querySelectorAll<HTMLElement>('[data-seg]')) {
      for (const b of seg.querySelectorAll<HTMLButtonElement>('button')) {
        b.addEventListener('click', () => {
          const key = seg.dataset.seg!;
          const v = b.dataset.v!;
          handlers.onChange(key === 'motion' ? 'reducedMotion' : 'aimGuide',
            key === 'motion' ? (v === 'auto' ? null : v === 'on') : v);
          this.paintSeg(seg, v);
        });
      }
    }
    this.resetBtn = this.el.querySelector('[data-reset]');
    this.resetBtn!.addEventListener('click', () => {
      if (!this.resetArmed) {
        this.resetArmed = true;
        this.resetBtn!.textContent = 'Are you sure? Tap again';
        this.resetTimer = window.setTimeout(() => this.disarmReset(), 3000);
        return;
      }
      this.disarmReset();
      handlers.onReset();
    });

    const close = iconButton('close', 'Close settings');
    close.style.position = 'absolute';
    close.style.right = '10px';
    close.style.top = '10px';
    close.addEventListener('click', handlers.onClose);
    this.el.querySelector('.ui-panel.modal')!.appendChild(close);
  }

  private disarmReset(): void {
    window.clearTimeout(this.resetTimer);
    this.resetArmed = false;
    if (this.resetBtn) this.resetBtn.textContent = 'Reset progress';
  }

  private paintMute(muted: boolean): void {
    const b = this.el.querySelector<HTMLElement>('[data-mute]')!;
    b.dataset.on = muted ? '1' : '0';
    b.innerHTML = iconSvg(muted ? 'mute' : 'sound');
    b.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  private paintSeg(seg: HTMLElement, value: string): void {
    for (const b of seg.querySelectorAll<HTMLButtonElement>('button')) {
      b.classList.toggle('on', b.dataset.v === value);
    }
  }

  populate(v: SettingsValues): void {
    for (const input of this.el.querySelectorAll<HTMLInputElement>('input[data-s]')) {
      input.value = String(v[input.dataset.s as 'music' | 'sfx' | 'voice'] ?? 0.8);
    }
    this.paintMute(v.muted);
    this.paintSeg(
      this.el.querySelector('[data-seg="motion"]')!,
      v.reducedMotion === null ? 'auto' : v.reducedMotion ? 'on' : 'off'
    );
    this.paintSeg(this.el.querySelector('[data-seg="guide"]')!, v.aimGuide);
    this.disarmReset();
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.classList.toggle('open', on);
    if (on) this.el.querySelector<HTMLElement>('input[data-s="music"]')?.focus();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
