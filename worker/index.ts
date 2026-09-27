import {
  b64url,
  randomToken,
  sha256Base64Url,
  signSession,
  verifySession,
} from './session';
import { isLevelId, isScore, isStars, safeReturnPath } from './validate';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

const SESSION_COOKIE = 'ab_session';
const OAUTH_COOKIE = 'ab_oauth';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const OAUTH_TTL = 600;

type SessionPayload = { uid: string; exp: number };
type OAuthPayload = { state: string; verifier: string; ret: string; exp: number };

function cookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

function cookie(
  name: string,
  value: string,
  opts: { maxAge: number; path: string; secure: boolean }
): string {
  const c =
    `${name}=${value}; Path=${opts.path}; HttpOnly; SameSite=Lax; ` +
    `Max-Age=${opts.maxAge}`;
  return opts.secure ? `${c}; Secure` : c;
}

function clearCookie(name: string, path: string, secure: boolean): string {
  return cookie(name, '', { maxAge: 0, path, secure });
}

function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function authErrorRedirect(): Response {
  return new Response(null, {
    status: 302,
    headers: { location: '/?auth=error' },
  });
}

async function sessionUser(req: Request, env: Env): Promise<string | null> {
  const token = cookies(req)[SESSION_COOKIE];
  if (!token || !env.SESSION_SECRET) return null;
  const payload = await verifySession<SessionPayload>(token, env.SESSION_SECRET);
  return payload?.uid ?? null;
}

/** CSRF guard: same-origin POSTs only. */
function originOk(req: Request): boolean {
  const origin = req.headers.get('origin');
  return origin !== null && origin === new URL(req.url).origin;
}

async function handleLogin(req: Request, env: Env): Promise<Response> {
  if (!env.X_CLIENT_ID) return json({ error: 'oauth_not_configured' }, 503);
  const url = new URL(req.url);
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = await sha256Base64Url(verifier);
  const ret = safeReturnPath(url.searchParams.get('return'));
  const blob = await signSession<OAuthPayload>(
    { state, verifier, ret, exp: Math.floor(Date.now() / 1000) + OAUTH_TTL },
    env.SESSION_SECRET
  );
  const secure = url.protocol === 'https:';
  const authorize = new URL('https://x.com/i/oauth2/authorize');
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: env.X_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/x/callback`,
    scope: 'users.read tweet.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': cookie(OAUTH_COOKIE, blob, {
        maxAge: OAUTH_TTL,
        path: '/api/auth',
        secure,
      }),
    },
  });
}

async function handleCallback(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const secure = url.protocol === 'https:';
  const fail = (reason: string): Response => {
    console.error('oauth callback failed:', reason);
    return authErrorRedirect();
  };
  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const blob = cookies(req)[OAUTH_COOKIE];
    if (!code || !state || !blob) return fail('missing code/state/cookie');
    const pending = await verifySession<OAuthPayload>(blob, env.SESSION_SECRET);
    if (!pending || pending.state !== state) return fail('state mismatch');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${url.origin}/api/auth/x/callback`,
      code_verifier: pending.verifier,
      client_id: env.X_CLIENT_ID,
    });
    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`)}`,
      },
      body,
    });
    if (!tokenRes.ok) return fail(`token exchange ${tokenRes.status}`);
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) return fail('no access_token');

    const meRes = await fetch(
      'https://api.x.com/2/users/me?user.fields=profile_image_url',
      { headers: { authorization: `Bearer ${tokenJson.access_token}` } }
    );
    if (!meRes.ok) return fail(`users/me ${meRes.status}`);
    const meJson = (await meRes.json()) as {
      data?: { id: string; username: string; name: string; profile_image_url?: string };
    };
    const u = meJson.data;
    if (!u?.id || !u.username) return fail('users/me missing fields');

    const avatarUrl = u.profile_image_url
      ? u.profile_image_url.replace('_normal', '_bigger')
      : null;
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO users (id, handle, name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, name=excluded.name,
         avatar_url=excluded.avatar_url, updated_at=excluded.updated_at`
    )
      .bind(u.id, u.username, u.name ?? u.username, avatarUrl, now, now)
      .run();

    const session = await signSession<SessionPayload>(
      { uid: u.id, exp: now + SESSION_TTL },
      env.SESSION_SECRET
    );
    const sep = pending.ret.includes('?') ? '&' : '?';
    return new Response(null, {
      status: 302,
      headers: [
        ['location', `${pending.ret}${sep}auth=ok`],
        [
          'set-cookie',
          cookie(SESSION_COOKIE, session, {
            maxAge: SESSION_TTL,
            path: '/',
            secure,
          }),
        ],
        ['set-cookie', clearCookie(OAUTH_COOKIE, '/api/auth', secure)],
      ],
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'unknown');
  }
}

type ScoreRow = { levelId: string; score: number; stars: number };

const UPSERT_SQL = `INSERT INTO scores (user_id, level_id, score, stars, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, level_id) DO UPDATE SET
    score = max(score, excluded.score),
    stars = max(stars, excluded.stars),
    updated_at = excluded.updated_at`;

function upsertStmt(db: D1Database, uid: string, row: ScoreRow): D1PreparedStatement {
  return db
    .prepare(UPSERT_SQL)
    .bind(uid, row.levelId, row.score, row.stars, Math.floor(Date.now() / 1000));
}

async function handleSubmitScore(req: Request, env: Env): Promise<Response> {
  const uid = await sessionUser(req, env);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const body = (await req.json().catch(() => null)) as {
    levelId?: unknown;
    score?: unknown;
    stars?: unknown;
  } | null;
  if (
    !body ||
    !isLevelId(body.levelId) ||
    !isScore(body.score) ||
    !isStars(body.stars)
  ) {
    return json({ error: 'invalid' }, 400);
  }
  await upsertStmt(env.DB, uid, {
    levelId: body.levelId,
    score: body.score,
    stars: body.stars,
  }).run();
  const row = await env.DB.prepare(
    `SELECT score, (SELECT COUNT(*) FROM scores s2
      WHERE s2.level_id = scores.level_id AND s2.score > scores.score) + 1 AS rank
     FROM scores WHERE user_id = ? AND level_id = ?`
  )
    .bind(uid, body.levelId)
    .first<{ score: number; rank: number }>();
  return json({ best: row?.score ?? body.score, rank: row?.rank ?? null });
}

async function handleSyncScores(req: Request, env: Env): Promise<Response> {
  const uid = await sessionUser(req, env);
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const body = (await req.json().catch(() => null)) as {
    scores?: unknown;
  } | null;
  if (!Array.isArray(body?.scores)) return json({ error: 'invalid' }, 400);
  const rows: ScoreRow[] = [];
  for (const raw of body.scores.slice(0, 200)) {
    const r = raw as { levelId?: unknown; score?: unknown; stars?: unknown };
    if (isLevelId(r.levelId) && isScore(r.score) && isStars(r.stars)) {
      rows.push({ levelId: r.levelId, score: r.score, stars: r.stars });
    }
  }
  if (rows.length) {
    await env.DB.batch(rows.map((r) => upsertStmt(env.DB, uid, r)));
  }
  return json({ ok: true, count: rows.length });
}

type LbRow = {
  id: string;
  handle: string;
  name: string;
  avatar_url: string | null;
  score: number;
  stars: number;
  levels?: number;
};

async function handleLeaderboard(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'global';
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50)
  );
  const uid = await sessionUser(req, env);
  const global = scope === 'global';

  if (!global) {
    const id = scope.startsWith('level:') ? scope.slice(6) : scope;
    if (!isLevelId(id)) return json({ error: 'invalid_scope' }, 400);
    const rows = (
      await env.DB.prepare(
        `SELECT u.id, u.handle, u.name, u.avatar_url, s.score, s.stars
         FROM scores s JOIN users u ON u.id = s.user_id
         WHERE s.level_id = ? ORDER BY s.score DESC, s.updated_at ASC LIMIT ?`
      )
        .bind(id, limit)
        .all<LbRow>()
    ).results;
    const entries = rows.map((r, i) => ({ rank: i + 1, ...r }));
    let me: { rank: number; score: number } | null = null;
    if (uid && !entries.some((e) => e.id === uid)) {
      const mine = await env.DB.prepare(
        `SELECT score FROM scores WHERE user_id = ? AND level_id = ?`
      )
        .bind(uid, id)
        .first<{ score: number }>();
      if (mine) {
        const better = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM scores WHERE level_id = ? AND score > ?`
        )
          .bind(id, mine.score)
          .first<{ n: number }>();
        me = { rank: (better?.n ?? 0) + 1, score: mine.score };
      }
    }
    return json({
      scope,
      entries: entries.map((e) => ({
        rank: e.rank,
        id: e.id,
        handle: e.handle,
        name: e.name,
        avatarUrl: e.avatar_url,
        score: e.score,
        stars: e.stars,
      })),
      me,
    });
  }

  const rows = (
    await env.DB.prepare(
      `SELECT u.id, u.handle, u.name, u.avatar_url,
              SUM(s.score) AS score, COUNT(*) AS levels, SUM(s.stars) AS stars
       FROM scores s JOIN users u ON u.id = s.user_id
       WHERE s.level_id NOT LIKE 'daily:%'
       GROUP BY u.id ORDER BY score DESC, levels DESC LIMIT ?`
    )
      .bind(limit)
      .all<LbRow>()
  ).results;
  const entries = rows.map((r, i) => ({ rank: i + 1, ...r }));
  let me: { rank: number; score: number } | null = null;
  if (uid && !entries.some((e) => e.id === uid)) {
    const mine = await env.DB.prepare(
      `SELECT SUM(score) AS score FROM scores
       WHERE user_id = ? AND level_id NOT LIKE 'daily:%'`
    )
      .bind(uid)
      .first<{ score: number | null }>();
    if (mine?.score != null) {
      const better = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM (
           SELECT SUM(score) AS total FROM scores
           WHERE level_id NOT LIKE 'daily:%'
           GROUP BY user_id HAVING total > ?)`
      )
        .bind(mine.score)
        .first<{ n: number }>();
      me = { rank: (better?.n ?? 0) + 1, score: mine.score };
    }
  }
  return json({
    scope,
    entries: entries.map((e) => ({
      rank: e.rank,
      id: e.id,
      handle: e.handle,
      name: e.name,
      avatarUrl: e.avatar_url,
      score: e.score,
      stars: e.stars,
      levels: e.levels,
    })),
    me,
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      if (req.method === 'POST' && !originOk(req)) {
        return json({ error: 'forbidden' }, 403);
      }
      switch (`${req.method} ${url.pathname}`) {
        case 'GET /api/auth/x/login':
          return await handleLogin(req, env);
        case 'GET /api/auth/x/callback':
          return await handleCallback(req, env);
        case 'GET /api/auth/me': {
          const uid = await sessionUser(req, env);
          let user = null;
          if (uid) {
            user = await env.DB.prepare(
              `SELECT id, handle, name, avatar_url FROM users WHERE id = ?`
            )
              .bind(uid)
              .first<{
                id: string;
                handle: string;
                name: string;
                avatar_url: string | null;
              }>();
          }
          return json({
            user: user
              ? {
                  id: user.id,
                  handle: user.handle,
                  name: user.name,
                  avatarUrl: user.avatar_url,
                }
              : null,
            oauth: Boolean(env.X_CLIENT_ID),
          });
        }
        case 'POST /api/auth/logout': {
          const secure = url.protocol === 'https:';
          return json(
            { ok: true },
            200,
            {
              'set-cookie': clearCookie(SESSION_COOKIE, '/', secure),
            }
          );
        }
        case 'POST /api/scores':
          return await handleSubmitScore(req, env);
        case 'POST /api/scores/sync':
          return await handleSyncScores(req, env);
        case 'GET /api/leaderboard':
          return await handleLeaderboard(req, env);
        default:
          return json({ error: 'not_found' }, 404);
      }
    } catch (e) {
      console.error('api error:', e);
      return json({ error: 'internal' }, 500);
    }
  },
};
