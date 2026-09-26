declare const __APP_VERSION__: string;

const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export class Credits {
  readonly el: HTMLElement;
  private visible = false;

  constructor(parent: HTMLElement, onClose: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap';
    this.el.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="ui-panel modal modal-pop credits-body" role="dialog" aria-label="Credits">
        <h2 class="panel-title">Angry Bots</h2>
        <p>Pull. Launch. Clear the yard.</p>
        <p>Built with Three.js, Planck.js, Howler-free WebAudio.</p>
        <p>Font: Baloo 2 by Ek Type, SIL Open Font License 1.1.</p>
        <p>Version ${VERSION}</p>
        <div class="btn-row"><button type="button" class="ui-btn" data-back>Back</button></div>
      </div>`;
    this.el.querySelector('[data-back]')!.addEventListener('click', onClose);
    parent.appendChild(this.el);
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.classList.toggle('open', on);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
