import { iconSvg, iconButton } from './icons';
import {
  BOT_STICKER,
  MENU_STICKERS,
  lookAroundYaw,
  stickerArt,
  stickerEyeImage,
  stickerImage,
  yawEyeTransforms,
} from '../render/botArt';
import type { StickerArt } from '../render/botArt.generated';

export type TitleActions = {
  play: () => void;
  daily: () => void;
  settings: () => void;
  achievements: () => void;
  credits: () => void;
};

type LineupBot = {
  el: HTMLElement;
  body: HTMLImageElement;
  eyes: HTMLImageElement[];
  art: StickerArt;
  i: number;
};

const EYE_PAD = 0.08; // matches stickerEyeImage's canvas padding

function lineupBot(id: string, front: boolean, i: number): LineupBot {
  const art = stickerArt(id);
  const b = document.createElement('div');
  b.className = `lineup-bot${front ? ' front' : ''}`;
  b.style.setProperty('--i', String(i));
  const body = document.createElement('img');
  body.className = 'body';
  body.src = stickerImage(id);
  body.alt = '';
  b.appendChild(body);
  const eyes: HTMLImageElement[] = [];
  art.eyes.forEach((e, ei) => {
    const img = document.createElement('img');
    img.className = 'eye';
    img.src = stickerEyeImage(id, ei);
    img.alt = '';
    img.style.left = `${((e.box[0] + e.box[2] / 2) / art.vbW) * 100}%`;
    img.style.top = `${((e.box[1] + e.box[3] / 2) / art.vbH) * 100}%`;
    img.style.width = `${((e.box[2] * (1 + EYE_PAD * 2)) / art.vbW) * 100}%`;
    b.appendChild(img);
    eyes.push(img);
  });
  return { el: b, body, eyes, art, i };
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Blink schedule shared shape with tickBot: ~3.4 s cycle, staggered per bot. */
function lineupLid(t: number, i: number): number {
  const c = (t / 3.4 + hash01(i * 3.1) * 0.8) % 1;
  return c > 0.94 ? Math.max(0.12, Math.abs(Math.sin(((c - 0.94) / 0.06) * Math.PI * 0.5 + Math.PI / 2))) : 1;
}

/** Rare gag: a quick turn-away-and-back, ≤ once per ~22 s per bot. */
function lineupGag(t: number, i: number): number | null {
  const u = (t + i * 7.31 + hash01(i * 17.3) * 11) % 23;
  if (u >= 1.2) return null;
  const dir = i % 2 === 0 ? 1 : -1;
  return dir * 1.08 * Math.sin((u / 1.2) * Math.PI);
}

export class TitleScreen {
  readonly el: HTMLElement;
  private readonly lineup: HTMLElement;
  private readonly lineupBots: LineupBot[] = [];
  private readonly starsEl: HTMLElement;
  private readonly achvLabel: HTMLElement;
  private readonly dailyLabel: HTMLElement;
  private readonly isReducedMotion: () => boolean;
  private raf = 0;

  constructor(parent: HTMLElement, actions: TitleActions, isReducedMotion: () => boolean = () => false) {
    this.isReducedMotion = isReducedMotion;
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
    MENU_STICKERS.forEach((id, i) => {
      const b = lineupBot(id, false, i);
      this.lineupBots.push(b);
      back.appendChild(b.el);
    });
    const front = document.createElement('div');
    front.className = 'lineup-row front';
    Object.values(BOT_STICKER).forEach((id, i) => {
      const b = lineupBot(id, true, i + MENU_STICKERS.length);
      this.lineupBots.push(b);
      front.appendChild(b.el);
    });
    this.lineup.append(back, front);
    parent.appendChild(this.lineup);
  }

  /** Deterministic per-bot yaw pose — look-around cycle + rare gag turn-away. */
  private poseLineup(t: number, neutral = false): void {
    for (const b of this.lineupBots) {
      const gag = neutral ? null : lineupGag(t, b.i);
      const yaw = neutral ? 0 : (gag ?? lookAroundYaw(t, hash01(b.i * 5.7) * 1.0));
      const pitch = neutral ? 0 : Math.sin(t * 0.83 + b.i) * 0.25;
      const lid = neutral ? 1 : lineupLid(t, b.i);
      const poses = yawEyeTransforms(b.art, yaw);
      // Silhouette follows the look: ~10° lean (capped) + slight bob, like the
      // reference strips — matches tickBot's in-game body motion.
      const leanYaw = Math.max(-0.42, Math.min(0.42, yaw));
      const bob = Math.sin(t * 1.31 + b.i * 1.7) * 1.2;
      b.body.style.transform = `translateX(${yaw * 3}%) translateY(${bob}%) rotate(${-leanYaw * 28.6}deg)`;
      b.eyes.forEach((img, ei) => {
        const p = poses[ei]!;
        const dxPct = (p.dx / (b.art.eyes[ei]!.box[2] * (1 + EYE_PAD * 2))) * 100;
        const dyPct = (pitch * -b.art.eyeBox[3] * 0.15) / (b.art.eyes[ei]!.box[3] * (1 + EYE_PAD * 2)) * 100;
        img.style.opacity = p.visible ? '1' : '0';
        img.style.transform = `translate(-50%,-50%) translate(${dxPct}%, ${dyPct}%) scale(${Math.max(0.02, p.sx)}, ${lid}) rotate(${-yaw * 12.6}deg)`;
      });
    }
  }

  private readonly poseFrame = (ms: number): void => {
    this.poseLineup(ms / 1000);
    this.raf = requestAnimationFrame(this.poseFrame);
  };

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
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  show(): void {
    this.el.style.display = 'flex';
    this.lineup.style.display = 'flex';
    cancelAnimationFrame(this.raf);
    if (this.isReducedMotion()) {
      this.poseLineup(0, true); // static neutral pose
      this.raf = 0;
    } else {
      this.raf = requestAnimationFrame(this.poseFrame);
    }
  }
}
