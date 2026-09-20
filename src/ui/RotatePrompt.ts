export class RotatePrompt {
  readonly el: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'rotate-prompt';
    this.el.innerHTML =
      '<p style="font-size:24px;font-weight:800">Turn your device sideways</p>';
    document.body.appendChild(this.el);
  }

  update(): boolean {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const portrait = window.innerHeight > window.innerWidth;
    const show = coarse && portrait;
    this.el.classList.toggle('visible', show);
    return show;
  }
}
