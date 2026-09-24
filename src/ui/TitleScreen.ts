export class TitleScreen {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement, onPlay: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel title-card';
    const title = document.createElement('h1');
    title.textContent = 'Angry Bots';
    const sub = document.createElement('p');
    sub.textContent = 'Pull. Launch. Clear the yard.';
    sub.style.margin = '0';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'ui-btn ui-primary';
    play.textContent = 'Play';
    play.setAttribute('aria-label', 'Play');
    play.addEventListener('click', onPlay);
    this.el.append(title, sub, play);
    parent.appendChild(this.el);
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  show(): void {
    this.el.style.display = 'flex';
  }
}
