import { iconSvg, iconButton } from './icons';
import {
  BOT_STICKER,
  MENU_STICKERS,
  eyePadBox,
  stickerArt,
  stickerEyesImage,
  stickerImage,
} from '../render/botArt';

export type TitleActions = {
  play: () => void;
  daily: () => void;
  settings: () => void;
  achievements: () => void;
  credits: () => void;
};

function lineupBot(id: string, front: boolean, i: number): HTMLElement {
  const art = stickerArt(id);
  const b = document.createElement('div');
  b.className = `lineup-bot${front ? ' front' : ''}`;
  b.style.setProperty('--i', String(i));
  const body = document.createElement('img');
  body.src = stickerImage(id);
  body.alt = '';
  const eyes = document.createElement('img');
  eyes.className = 'eyes';
  eyes.src = stickerEyesImage(id);
  eyes.alt = '';
  const pb = eyePadBox(art);
  eyes.style.left = `${(pb[0] / art.vbW) * 100}%`;
  eyes.style.top = `${(pb[1] / art.vbH) * 100}%`;
  eyes.style.width = `${(pb[2] / art.vbW) * 100}%`;
  b.append(body, eyes);
  return b;
}

export class TitleScreen {
  readonly el: HTMLElement;
  private readonly lineup: HTMLElement;
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

    // Animated lineup: all 12 official stickers, the 5 playable bots in front.
    this.lineup = document.createElement('div');
    this.lineup.className = 'title-lineup';
    this.lineup.setAttribute('aria-hidden', 'true');
    const back = document.createElement('div');
    back.className = 'lineup-row back';
    MENU_STICKERS.forEach((id, i) => back.appendChild(lineupBot(id, false, i)));
    const front = document.createElement('div');
    front.className = 'lineup-row front';
    Object.values(BOT_STICKER).forEach((id, i) => front.appendChild(lineupBot(id, true, i)));
    this.lineup.append(back, front);
    parent.appendChild(this.lineup);
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
    this.lineup.style.display = 'none';
  }

  show(): void {
    this.el.style.display = 'flex';
    this.lineup.style.display = 'flex';
  }
}
