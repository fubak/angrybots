export class Splash {
  private el: HTMLElement;
  private bar: HTMLElement;
  private t0 = performance.now();
  private dismissed = false;

  constructor(root: HTMLElement, botImgUrl: string) {
    this.el = document.createElement('div');
    this.el.id = 'splash';
    this.el.innerHTML = `
      <div class="splash-logo">ANGRY<br>BOTS</div>
      <img class="splash-bot" alt="" />
      <div class="splash-bar"><div></div></div>`;
    this.el.querySelector('img')!.src = botImgUrl;
    this.bar = this.el.querySelector('.splash-bar > div')!;
    root.appendChild(this.el);
    this.animate();
  }

  /** Progress 0..1 while loading; 1 fades the splash away. */
  private animate = (): void => {
    if (this.dismissed) return;
    const t = performance.now() - this.t0;
    this.bar.style.width = `${Math.min(95, (t / 600) * 100)}%`;
    if (t < 3000) requestAnimationFrame(this.animate);
  };

  /** Call once fonts + first render are ready; respects the 0.6s minimum. */
  ready(onDone: () => void): void {
    const wait = Math.max(0, 600 - (performance.now() - this.t0));
    setTimeout(() => {
      this.dismissed = true;
      this.bar.style.width = '100%';
      this.el.classList.add('gone');
      setTimeout(() => {
        this.el.remove();
        onDone();
      }, 380);
    }, wait);
  }
}
