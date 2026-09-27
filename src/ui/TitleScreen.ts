import { iconSvg, iconButton } from './icons';
import {
  BOT_STICKER,
  MENU_STICKERS,
  stickerArt,
  stickerBodyImage,
  stickerEyeImage,
  yawEyeTransforms,
} from '../render/botArt';
import type { StickerArt } from '../render/botArt.generated';
import {
  createPlayground,
  setPointer,
  setZones,
  step,
  tapBot,
  type BotSpec,
  type Playground,
  type Zone,
} from './titlePlayground';

export type TitleActions = {
  play: () => void;
  daily: () => void;
  settings: () => void;
  achievements: () => void;
  credits: () => void;
};

type PgBot = {
  el: HTMLElement;
  body: HTMLImageElement;
  eyes: HTMLImageElement[];
  art: StickerArt;
  spec: BotSpec;
  i: number;
};

const EYE_PAD = 0.08; // matches stickerEyeImage's canvas padding
const STEP = 1 / 60;

function pgBot(id: string, i: number): PgBot {
  const art = stickerArt(id);
  const b = document.createElement('div');
  b.className = 'pg-bot';
  const body = document.createElement('img');
  body.className = 'body';
  body.src = stickerBodyImage(id);
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
  return { el: b, body, eyes, art, spec: { id, w: 64 }, i };
}

/** Neutral gaze for the static (reduced-motion) lineup. */
function neutralPose(): { yaw: number; pitch: number; lid: number; eyeW: number } {
  return { yaw: 0, pitch: 0, lid: 1, eyeW: 1 };
}

export class TitleScreen {
  readonly el: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly bots: PgBot[] = [];
  private readonly starsEl: HTMLElement;
  private readonly achvLabel: HTMLElement;
  private readonly dailyLabel: HTMLElement;
  private readonly isReducedMotion: () => boolean;
  private readonly onResize = (): void => this.layout();
  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.pg || !this.stageRect) return;
    setPointer(this.pg, e.clientY >= this.stageRect.top ? e.clientX - this.stageRect.left : null);
  };
  private pg: Playground | null = null;
  private stageRect: DOMRect | null = null;
  private zPool: HTMLElement[] = [];
  private raf = 0;
  private lastMs = 0;
  private acc = 0;

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

    // Playground stage: the 12 stickers roam the ground strip below/around
    // the card. Container ignores pointers; each bot is individually tappable.
    this.stage = document.createElement('div');
    this.stage.className = 'title-stage';
    this.stage.setAttribute('aria-hidden', 'true');
    MENU_STICKERS.forEach((id) => this.bots.push(pgBot(id, this.bots.length)));
    Object.values(BOT_STICKER).forEach((id) => this.bots.push(pgBot(id, this.bots.length)));
    this.bots.forEach((b, i) => {
      b.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.pg && !this.isReducedMotion()) tapBot(this.pg, i);
      });
      this.stage.appendChild(b.el);
    });
    parent.appendChild(this.stage);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  /**
   * Compute the walkable zones from the real layout: below the card when
   * there's room, otherwise the left/right gutters beside it. Both too
   * narrow → no playground at all.
   */
  private layout(): void {
    if (this.el.style.display === 'none') return;
    const W = this.stage.clientWidth || window.innerWidth;
    const H = window.innerHeight;
    const card = this.el.getBoundingClientRect();
    const playableH = Math.round(Math.min(64, Math.max(30, (H - card.bottom) * 0.3)));
    const menuH = Math.round(playableH * 0.72);
    const stageH = Math.min(160, Math.max(64, playableH + 60));
    this.stage.style.height = `${stageH}px`;

    // Gutter mode needs room for at least the small bots.
    const minGutter = menuH * 1.6;
    let zones: Zone[];
    if (card.bottom <= H - stageH + 10) {
      zones = [{ x0: 8, x1: W - 8 }];
    } else {
      zones = [];
      if (card.left - 14 >= minGutter) zones.push({ x0: 8, x1: card.left - 14 });
      if (W - card.right - 14 >= minGutter) zones.push({ x0: card.right + 14, x1: W - 8 });
      if (zones.length === 0) {
        this.stage.style.display = 'none';
        this.pg = null;
        return;
      }
    }
    for (const b of this.bots) {
      const h = b.spec.id.length <= 2 ? menuH : playableH;
      const w = h * (b.art.vbW / b.art.vbH);
      b.spec.w = w;
      b.el.style.height = `${h}px`;
      b.el.style.width = `${w}px`;
    }
    if (!this.pg) {
      this.pg = createPlayground(1234, zones, this.bots.map((b) => b.spec));
    } else {
      setZones(this.pg, zones);
    }
    // Reveal only after sizes and positions exist — render one frame now so
    // the bots never flash un-positioned at the stage corner.
    this.stage.style.display = 'block';
    this.render();
    this.stageRect = this.stage.getBoundingClientRect();
  }

  /** Push sim state → DOM. Transforms/opacity only. */
  private render(): void {
    const pg = this.pg;
    if (!pg) return;
    for (const b of this.bots) {
      const s = pg.bots[b.i]!;
      const pose = this.isReducedMotion() ? neutralPose() : s;
      b.el.dataset.behavior = s.kind;
      b.el.style.transform = `translate(${(s.x - s.w / 2).toFixed(1)}px, ${(-s.y).toFixed(1)}px)`;
      const leanYaw = Math.max(-0.42, Math.min(0.42, pose.yaw));
      b.body.style.transform = `rotate(${(s.tilt - leanYaw * 0.45).toFixed(3)}rad) scale(${s.sx.toFixed(3)}, ${s.sy.toFixed(3)})`;
      const poses = yawEyeTransforms(b.art, pose.yaw);
      b.eyes.forEach((img, ei) => {
        const p = poses[ei]!;
        const dxPct = (p.dx / (b.art.eyes[ei]!.box[2] * (1 + EYE_PAD * 2))) * 100;
        const dyPct =
          ((pose.pitch * -b.art.eyeBox[3] * 0.15) / (b.art.eyes[ei]!.box[3] * (1 + EYE_PAD * 2))) *
          100;
        img.style.opacity = p.visible ? '1' : '0';
        img.style.transform = `translate(-50%,-50%) translate(${dxPct}%, ${dyPct}%) scale(${Math.max(0.02, p.sx * pose.eyeW)}, ${pose.lid})`;
      });
    }
    // Nap z's: one pooled span per live puff, rising + fading with age.
    while (this.zPool.length < pg.zs.length) {
      const z = document.createElement('span');
      z.className = 'pg-z';
      z.textContent = 'z';
      this.stage.appendChild(z);
      this.zPool.push(z);
    }
    this.zPool.forEach((el, i) => {
      const z = pg.zs[i];
      if (!z) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      el.style.transform = `translate(${z.x.toFixed(0)}px, ${(-z.y - z.age * 30).toFixed(0)}px) scale(${(1 + z.age * 0.5).toFixed(2)})`;
      el.style.opacity = String(Math.max(0, 1 - z.age / 1.4));
    });
  }

  private readonly frame = (ms: number): void => {
    if (!this.pg) {
      this.raf = 0;
      return;
    }
    const dt = Math.min(0.1, (ms - this.lastMs) / 1000);
    this.lastMs = ms;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 6) {
      step(this.pg, STEP);
      this.acc -= STEP;
      n++;
    }
    this.render();
    this.raf = requestAnimationFrame(this.frame);
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
    this.stage.style.display = 'none';
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  show(): void {
    this.el.style.display = 'flex';
    // The stage stays display:none until layout() has placed every bot;
    // layout() reveals it (or leaves it hidden when there are no zones).
    this.layout();
    cancelAnimationFrame(this.raf);
    if (this.isReducedMotion() || !this.pg) {
      this.render(); // static neutral pose — no roaming under reduced motion
      this.raf = 0;
    } else {
      this.lastMs = performance.now();
      this.acc = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }
}
