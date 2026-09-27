/**
 * Thin client for the angrybots.lol worker API. Every call fails soft: any
 * network error, non-2xx, or non-JSON response degrades to offline/null so
 * the game never breaks when the backend is unreachable (e.g. the GH Pages
 * mirror, which has no /api at all).
 */

export type User = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  stars: number;
  levels?: number;
};

export type LeaderboardScope =
  | 'global'
  | `level:${string}`
  | `daily:${string}`;

export type LeaderboardData = {
  scope: string;
  entries: LeaderboardEntry[];
  me: { rank: number; score: number } | null;
};

import type { Replay } from '../game/replay';

const BASE = import.meta.env.BASE_URL;

export class OnlineClient {
  status: 'unknown' | 'offline' | 'online' = 'unknown';
  user: User | null = null;
  oauth = false;
  private listeners: (() => void)[] = [];

  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }

  private changed(): void {
    for (const cb of this.listeners) cb();
  }

  private async getJson(path: string): Promise<unknown> {
    const res = await fetch(`${BASE}${path}`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json();
  }

  private async postJson(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
    return res.json();
  }

  async init(): Promise<void> {
    try {
      const data = (await this.getJson('api/auth/me')) as {
        user?: User | null;
        oauth?: boolean;
      };
      this.user = data.user ?? null;
      this.oauth = Boolean(data.oauth);
      this.status = 'online';
    } catch {
      this.user = null;
      this.oauth = false;
      this.status = 'offline';
    }
    this.changed();
  }

  /** Full-page redirect into the OAuth flow; `returnPath` comes back to us. */
  loginUrl(returnPath: string): string {
    return `${BASE}api/auth/x/login?return=${encodeURIComponent(returnPath)}`;
  }

  async logout(): Promise<boolean> {
    try {
      await this.postJson('api/auth/logout', {});
      this.user = null;
      this.changed();
      return true;
    } catch {
      return false;
    }
  }

  async deleteAccount(): Promise<boolean> {
    try {
      await this.postJson('api/auth/delete', {});
      this.user = null;
      this.changed();
      return true;
    } catch {
      return false;
    }
  }

  async submitScore(
    levelId: string,
    score: number,
    stars: number,
    replay: Replay
  ): Promise<{
    best: number;
    rank: number | null;
    score?: number;
    stars?: number;
    verified?: boolean;
  } | null> {
    try {
      const r = (await this.postJson('api/scores', {
        levelId,
        score,
        stars,
        replay,
      })) as {
        best?: number;
        rank?: number | null;
        score?: number;
        stars?: number;
        verified?: boolean;
      };
      return typeof r.best === 'number' ? r as {
        best: number;
        rank: number | null;
        score?: number;
        stars?: number;
        verified?: boolean;
      } : null;
    } catch {
      return null;
    }
  }

  async leaderboard(
    scope: LeaderboardScope,
    limit = 10
  ): Promise<LeaderboardData | null> {
    try {
      return (await this.getJson(
        `api/leaderboard?scope=${encodeURIComponent(scope)}&limit=${limit}`
      )) as LeaderboardData;
    } catch {
      return null;
    }
  }
}
