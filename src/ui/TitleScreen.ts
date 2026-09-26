import { iconSvg, iconButton } from './icons';

export type TitleActions = {
  play: () => void;
  daily: () => void;
  settings: () => void;
  achievements: () => void;
  credits: () => void;
};

export class TitleScreen {
  readonly el: HTMLElement;
  private readonly starsEl: HTMLElement;
  private readonly achvLabel: HTMLElement;
  private readonly dailyLabel: HTMLElement;

  constructor(parent: HTMLElement, actions: TitleActions) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel title-card';
    this.el.innerHTML = `
      <h1 class="game-logo">ANGRY<br>BOTS</h1>
      <p class="tagline">Pull. Launch. Clear the yard.</p>
      <div class="title-stars"></div>`;

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'ui-btn ui-primary title-play';
    play.innerHTML = `${iconSvg('play', 30)} Play`;
    play.setAttribute('aria-label', 'Play');
    play.addEventListener('click', actions.play);

    const daily = document.createElement('button');
    daily.type = 'button';
    daily.className = 'ui-btn title-daily';
    daily.innerHTML = `${iconSvg('star', 22)} <span class="daily-name"></span>`;
    daily.setAttribute('aria-label', 'Daily challenge');
    daily.addEventListener('click', actions.daily);
    this.dailyLabel = daily.querySelector('.daily-name')!;

    const secondary = document.createElement('div');
    secondary.className = 'title-secondary';
    const settings = iconButton('settings', 'Settings');
    settings.addEventListener('click', actions.settings);
    const achv = iconButton('trophy', 'Achievements');
    achv.addEventListener('click', actions.achievements);
    this.achvLabel = document.createElement('span');
    achv.appendChild(this.achvLabel);
    const credits = iconButton('star', 'Credits');
    credits.addEventListener('click', actions.credits);
    secondary.append(settings, achv, credits);

    this.starsEl = this.el.querySelector('.title-stars')!;
    this.el.append(play, daily, secondary);
    parent.appendChild(this.el);
  }

  setDaily(levelName: string): void {
    this.dailyLabel.textContent = `Daily · ${levelName}`;
  }

  setStats(totalStars: number, maxStars: number, achvDone: number, achvTotal: number): void {
    this.starsEl.innerHTML = `${iconSvg('star', 20)} ${totalStars} / ${maxStars}`;
    this.achvLabel.textContent = ` ${achvDone}/${achvTotal}`;
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  show(): void {
    this.el.style.display = 'flex';
  }
}
