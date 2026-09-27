export class RotatePrompt {
  readonly el: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'rotate-prompt';
    this.el.innerHTML =
      '<p style="font-size:24px;font-weight:800">Turn your device sideways</p>';
    document.body.appendChild(this.el);
  }

  isVisible(): boolean {
    return this.el.classList.contains('visible');
  }

  /**
   * Show the prompt only while gameplay needs landscape (`active` = App is in
   * the play phase). Menus and modals stay usable in portrait.
   */
  update(active: boolean): boolean {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const portrait = window.innerHeight > window.innerWidth;
    const show = active && coarse && portrait;
    this.el.classList.toggle('visible', show);
    return show;
  }
}
