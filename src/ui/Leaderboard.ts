import { localDateString } from '../game/daily';
import type {
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardScope,
  OnlineClient,
} from '../net/api';
import { stickerImage } from '../render/botArt';
import { track } from '../analytics';
import { iconButton, iconSvg } from './icons';

type Deps = {
  client: OnlineClient;
  onClose: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

type Tab = { label: string; scope: LeaderboardScope };

export class LeaderboardScreen {
  readonly el: HTMLElement;
  private visible = false;
  private readonly deps: Deps;
  private readonly tabsEl: HTMLElement;
  private readonly accountEl: HTMLElement;
  private readonly listEl: HTMLElement;
  private ctx: { levelId?: string; levelName?: string } = {};
  private scope: LeaderboardScope = 'global';
  private rankEl: HTMLElement | null = null;

  constructor(parent: HTMLElement, deps: Deps) {
    this.deps = deps;
    this.el = document.createElement('div');
    this.el.className = 'modal-wrap lb-wrap';

    const panel = document.createElement('div');
    panel.className = 'ui-panel modal modal-pop';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Leaderboard');
    panel.innerHTML = `<h2 class="panel-title">Leaderboard</h2>`;

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'lb-tabs';
    this.accountEl = document.createElement('div');
    this.accountEl.className = 'lb-account';
    this.listEl = document.createElement('div');
    this.listEl.className = 'lb-list';

    const back = iconButton('back', 'Back');
    back.addEventListener('click', () => deps.onClose());
    const row = document.createElement('div');
    row.className = 'btn-row';
    row.appendChild(back);

    const privacy = document.createElement('a');
    privacy.className = 'lb-privacy';
    privacy.href = 'privacy.html';
    privacy.target = '_blank';
    privacy.rel = 'noopener';
    privacy.textContent = 'Privacy';

    panel.append(this.tabsEl, this.accountEl, this.listEl, privacy, row);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    this.el.append(backdrop, panel);
    parent.appendChild(this.el);

    deps.client.onChange(() => {
      if (this.visible) {
        this.renderAccount();
        void this.load();
      }
    });
  }

  private tabs(): Tab[] {
    const tabs: Tab[] = [
      { label: 'All-time', scope: 'global' },
      { label: 'Daily', scope: `daily:${localDateString()}` },
    ];
    if (this.ctx.levelId) {
      tabs.push({
        label: this.ctx.levelName ?? 'This level',
        scope: this.ctx.levelId.startsWith('daily:')
          ? (this.ctx.levelId as LeaderboardScope)
          : `level:${this.ctx.levelId}`,
      });
    }
    return tabs;
  }

  open(ctx: {
    levelId?: string;
    levelName?: string;
    defaultScope?: LeaderboardScope;
  }): void {
    this.ctx = { levelId: ctx.levelId, levelName: ctx.levelName };
    const valid = this.tabs().map((t) => t.scope);
    this.scope =
      ctx.defaultScope && valid.includes(ctx.defaultScope)
        ? ctx.defaultScope
        : 'global';
    this.renderTabs();
    this.renderAccount();
    this.el.parentElement?.appendChild(this.el);
    this.toggle(true);
    track('leaderboard_open', { scope: this.scope });
    void this.load();
  }

  toggle(on: boolean): void {
    this.visible = on;
    this.el.classList.toggle('open', on);
  }

  isVisible(): boolean {
    return this.visible;
  }

  refresh(): void {
    this.renderAccount();
    void this.load();
  }

  private renderTabs(): void {
    this.tabsEl.replaceChildren();
    for (const t of this.tabs()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `ui-btn lb-tab${t.scope === this.scope ? ' ui-primary' : ''}`;
      b.textContent = t.label;
      b.addEventListener('click', () => {
        if (this.scope === t.scope) return;
        this.scope = t.scope;
        this.renderTabs();
        track('leaderboard_open', { scope: this.scope });
        void this.load();
      });
      this.tabsEl.appendChild(b);
    }
  }

  private renderAccount(): void {
    const { client, onSignIn, onSignOut, onDeleteAccount } = this.deps;
    this.rankEl = null;
    this.accountEl.replaceChildren();
    if (client.status === 'offline') {
      this.accountEl.textContent = 'Leaderboards need angrybots.lol';
      return;
    }
    if (client.user) {
      const img = document.createElement('img');
      img.className = 'lb-avatar';
      img.alt = '';
      img.src = client.user.avatarUrl ?? stickerImage('01');
      const handle = document.createElement('strong');
      handle.textContent = `@${client.user.handle}`;
      const out = document.createElement('button');
      out.type = 'button';
      out.className = 'ui-btn lb-signout';
      out.textContent = 'Sign out';
      out.addEventListener('click', onSignOut);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ui-btn lb-danger';
      del.textContent = 'Delete account';
      del.addEventListener('click', () => {
        if (
          confirm(
            'Delete your account and all leaderboard scores? This cannot be undone.'
          )
        ) {
          onDeleteAccount();
        }
      });
      const rank = document.createElement('span');
      rank.className = 'lb-myrank';
      this.rankEl = rank;
      this.accountEl.append(img, handle, rank, out, del);
      return;
    }
    if (client.oauth || client.status === 'unknown') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-btn lb-signin';
      btn.setAttribute('aria-label', 'Sign in with X');
      btn.innerHTML = `<span class="lb-xbadge">${iconSvg('x', 20)}</span> Sign in with X`;
      btn.addEventListener('click', onSignIn);
      this.accountEl.appendChild(btn);
    }
  }

  private row(entry: LeaderboardEntry, me: boolean): HTMLElement {
    const r = document.createElement('div');
    r.className = `lb-row${me ? ' me' : ''}`;
    const rank =
      entry.rank === 1
        ? `<span class="lb-rank r1" aria-label="rank 1">${iconSvg('crown', 22)}</span>`
        : entry.rank === 2 || entry.rank === 3
          ? `<span class="lb-rank r${entry.rank}">${entry.rank}</span>`
          : `<span class="lb-rank">${entry.rank}</span>`;
    const sub = [entry.name];
    if (entry.levels != null) sub.push(`${entry.levels} levels`);
    if (entry.stars) sub.push(`★${entry.stars}`);
    r.innerHTML = `
      ${rank}
      <img class="lb-avatar" alt="">
      <div style="flex:1">
        <div class="lb-name"></div>
        <div class="lb-sub"></div>
      </div>
      <div class="lb-score"></div>`;
    r.querySelector<HTMLImageElement>('.lb-avatar')!.src =
      entry.avatarUrl ?? stickerImage('01');
    r.querySelector('.lb-name')!.textContent = `@${entry.handle}`;
    r.querySelector('.lb-sub')!.textContent = sub.join(' · ');
    r.querySelector('.lb-score')!.textContent = entry.score.toLocaleString();
    return r;
  }

  private async load(): Promise<void> {
    const empty = (text: string): void => {
      this.listEl.innerHTML = `<div class="lb-empty"></div>`;
      this.listEl.firstElementChild!.textContent = text;
    };
    if (this.deps.client.status === 'offline') {
      this.listEl.replaceChildren();
      return;
    }
    if (this.rankEl) this.rankEl.textContent = '';
    empty('Loading…');
    const scope = this.scope;
    const data: LeaderboardData | null = await this.deps.client.leaderboard(
      scope
    );
    if (scope !== this.scope || !this.visible) return;
    if (!data) {
      empty("Couldn't load leaderboard");
      return;
    }
    this.listEl.replaceChildren();
    if (this.rankEl && this.deps.client.user) {
      this.rankEl.textContent = data.me ? `#${data.me.rank}` : 'Unranked';
    }
    if (data.entries.length === 0 && !data.me) {
      empty('No scores yet — be the first!');
      return;
    }
    const uid = this.deps.client.user?.id;
    for (const e of data.entries) {
      this.listEl.appendChild(this.row(e, e.id === uid));
    }
    if (data.me && !data.entries.some((e) => e.id === uid)) {
      const gap = document.createElement('div');
      gap.className = 'lb-gap';
      gap.textContent = '…';
      this.listEl.appendChild(gap);
      this.listEl.appendChild(
        this.row(
          {
            rank: data.me.rank,
            id: uid ?? '',
            handle: this.deps.client.user?.handle ?? '',
            name: this.deps.client.user?.name ?? '',
            avatarUrl: this.deps.client.user?.avatarUrl ?? null,
            score: data.me.score,
            stars: 0,
          },
          true
        )
      );
    }
  }
}
