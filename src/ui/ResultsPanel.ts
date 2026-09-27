import { iconButton, iconSvg } from './icons';
import type { IconName } from './icons';

export type ResultsAction =
  | 'retry'
  | 'next'
  | 'levels'
  | 'skip'
  | 'signin'
  | 'leaderboard';

export type ResultsShowOpts = {
  won: boolean;
  score: number;
  stars: number;
  newBest: boolean;
  canSkip: boolean;
  /** daily challenge stats — replaces Next/Skip actions */
  daily?: { best: number; streak: number };
  /** last level of the last chapter → end card instead of Next */
  isFinal: boolean;
  /** achievement names unlocked by this run */
  unlockedNames: string[];
  pigImgUrl: string;
  /** star-fill chime, pitch 1.0 / 1.12 / 1.26 */
  chime: (rate: number) => void;
  tick: () => void;
  /** online leaderboard availability for this run (undefined = offline) */
  online?: { signedIn: boolean; canSignIn: boolean };
};

export class ResultsPanel {
  readonly el: HTMLElement;
  private timers: number[] = [];

  constructor(parent: HTMLElement, onAction: (action: ResultsAction) => void) {
    this.el = document.createElement('div');
    this.el.className = 'ui-panel results-panel';
    this.el.innerHTML = `
      <h2 id="results-title">Victory!</h2>
      <img class="results-pig" alt="" hidden />
      <p class="results-score" aria-live="polite">0</p>
      <div class="results-ribbon" hidden>NEW HIGHSCORE!</div>
      <div id="results-stars"></div>
      <div class="results-achv"></div>
      <div class="results-daily" hidden></div>
      <div class="results-online" hidden></div>
      <div class="results-endcard" hidden>To be continued: more levels coming</div>
      <div class="results-actions"></div>
    `;
    parent.appendChild(this.el);
    for (const btn of this.el.querySelectorAll<HTMLButtonElement>('button[data-a]')) {
      btn.addEventListener('click', () => onAction(btn.dataset.a as ResultsAction));
    }
    this.onAction = onAction;
  }

  private onAction: (a: ResultsAction) => void;

  isVisible(): boolean {
    return this.el.classList.contains('open');
  }

  private clearTimers(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }

  show(o: ResultsShowOpts): void {
    this.clearTimers();
    this.el.classList.add('open');
    this.el.querySelector('#results-title')!.textContent = o.won
      ? 'LEVEL CLEARED!'
      : 'LEVEL FAILED';
    const pig = this.el.querySelector<HTMLImageElement>('.results-pig')!;
    pig.hidden = o.won;
    if (!o.won && o.pigImgUrl) pig.src = o.pigImgUrl;

    const ribbon = this.el.querySelector<HTMLElement>('.results-ribbon')!;
    ribbon.hidden = !(o.won && o.newBest);

    const achv = this.el.querySelector<HTMLElement>('.results-achv')!;
    achv.textContent = o.unlockedNames.length
      ? `Achievement unlocked: ${o.unlockedNames.join(', ')}`
      : '';

    const endcard = this.el.querySelector<HTMLElement>('.results-endcard')!;
    endcard.hidden = !(o.won && o.isFinal);

    const dailyEl = this.el.querySelector<HTMLElement>('.results-daily')!;
    dailyEl.hidden = !o.daily;
    if (o.daily) {
      dailyEl.textContent = `Daily best ${o.daily.best.toLocaleString()} · Streak ${o.daily.streak}`;
    }

    const onlineEl = this.el.querySelector<HTMLElement>('.results-online')!;
    onlineEl.hidden = true;
    onlineEl.replaceChildren();
    onlineEl.textContent = '';
    if (o.won && o.online) {
      onlineEl.hidden = false;
      if (o.online.signedIn) {
        onlineEl.textContent = 'Saving to leaderboard…';
      } else if (o.online.canSignIn) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ui-btn results-signin';
        b.dataset.a = 'signin';
        b.setAttribute('aria-label', 'Sign in with X to save your score');
        b.innerHTML = `${iconSvg('x', 18)} Sign in with X to save your score`;
        b.addEventListener('click', () => this.onAction('signin'));
        onlineEl.appendChild(b);
      } else {
        onlineEl.hidden = true;
      }
    }

    // Buttons: levels / retry / skip / next (daily runs only get Levels + Retry)
    const actions = this.el.querySelector('.results-actions')!;
    actions.replaceChildren();
    const mk = (icon: IconName, label: string, a: ResultsAction, cls = '') => {
      const b = iconButton(icon, label, cls);
      b.dataset.a = a;
      b.addEventListener('click', () => this.onAction(a));
      return b;
    };
    actions.appendChild(mk('levels', 'Levels', 'levels'));
    if (!o.daily && !o.won && o.canSkip) {
      actions.appendChild(mk('next', 'Skip level', 'skip', 'ui-danger'));
    }
    actions.appendChild(mk('restart', 'Retry', 'retry', o.won ? '' : 'ui-primary'));
    if (o.won && o.online) {
      actions.appendChild(mk('podium', 'Leaderboard', 'leaderboard'));
    }
    if (!o.daily && o.won && !o.isFinal) {
      actions.appendChild(mk('next', 'Next', 'next', 'ui-primary'));
    }

    // Score counts up over ~1s with tick audio.
    const scoreEl = this.el.querySelector<HTMLElement>('.results-score')!;
    const scoreStart = performance.now();
    let ticked = 0;
    const count = (): void => {
      const t = Math.min(1, (performance.now() - scoreStart) / 1000);
      scoreEl.textContent = Math.round(o.score * (1 - Math.pow(1 - t, 3))).toLocaleString();
      const tick = Math.floor(t * 9);
      if (tick > ticked) {
        ticked = tick;
        if (o.won) o.tick();
      }
      if (t < 1) this.timers.push(window.setTimeout(count, 33));
    };
    count();

    // Stars fill one at a time, 0.35s apart, with bounce + burst + chime.
    const starHost = this.el.querySelector('#results-stars')!;
    starHost.replaceChildren();
    const rates = [1, 1.12, 1.26];
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '☆';
      starHost.appendChild(star);
      if (o.won && i < o.stars) {
        this.timers.push(
          window.setTimeout(() => {
            star.classList.add('on');
            star.textContent = '★';
            o.chime(rates[i]!);
            this.burst(star);
          }, 1050 + i * 350)
        );
      }
    }
  }

  private burst(anchor: HTMLElement): void {
    const colors = ['#ffe066', '#63c132', '#37b6ff', '#e2452b'];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('span');
      c.className = 'confetti';
      const a = (i / 10) * Math.PI * 2;
      c.style.setProperty('--dx', `${Math.cos(a) * 46}px`);
      c.style.setProperty('--dy', `${Math.sin(a) * 46 - 14}px`);
      c.style.background = colors[i % colors.length]!;
      c.style.left = `${anchor.offsetLeft + anchor.offsetWidth / 2}px`;
      c.style.top = `${anchor.offsetTop}px`;
      anchor.parentElement!.style.position = 'relative';
      anchor.parentElement!.appendChild(c);
      this.timers.push(window.setTimeout(() => c.remove(), 750));
    }
  }

  /** Replace the online status line after a score submit resolves. */
  setOnlineStatus(text: string): void {
    const el = this.el.querySelector<HTMLElement>('.results-online')!;
    el.hidden = false;
    el.replaceChildren();
    el.textContent = text;
  }

  hide(): void {
    this.clearTimers();
    this.el.classList.remove('open');
  }
}
