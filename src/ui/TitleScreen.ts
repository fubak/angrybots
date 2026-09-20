export class TitleScreen {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement, onPlay: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel';
    this.el.style.cssText =
      'position:fixed;inset:20% 25%;display:flex;flex-direction:column;align-items:center;gap:16px;z-index:15';
    const title = document.createElement('h1');
    title.textContent = 'Angry Bots';
    title.style.fontSize = '48px';
    title.style.transform = 'rotate(-3deg)';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'ui-btn';
    play.textContent = 'Play';
    play.setAttribute('aria-label', 'Play');
    play.addEventListener('click', onPlay);
    this.el.append(title, play);
    parent.appendChild(this.el);
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  show(): void {
    this.el.style.display = 'flex';
  }
}
