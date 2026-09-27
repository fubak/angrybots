/**
 * Session signing + PKCE/crypto helpers. Pure Web Crypto + base64url — no
 * Cloudflare types, no Env/D1 — so this file is unit-testable in Node.
 */

const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  const b64 =
    typeof btoa === 'function' ? btoa(s) : Buffer.from(arr).toString('base64');
  return b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin =
    typeof atob === 'function'
      ? atob(b64 + pad)
      : Buffer.from(b64 + pad, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Random URL-safe token (`bytes` raw random bytes → base64url). */
export function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

/** SHA-256 digest as base64url — the PKCE S256 code challenge. */
export async function sha256Base64Url(str: string): Promise<string> {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(str)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Constant-time compare of two equal-length byte strings. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Sign a JSON payload carrying an `exp` unix-second field.
 * Token: base64url(JSON) "." base64url(HMAC-SHA256).
 * (Async — HMAC lives behind crypto.subtle.)
 */
export async function signSession<P extends { exp: number }>(
  payload: P,
  secret: string
): Promise<string> {
  const data = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    enc.encode(data)
  );
  return `${data}.${b64url(sig)}`;
}

/** Verify a signSession token; null when malformed, bad sig, or expired. */
export async function verifySession<P extends { exp: number }>(
  token: string,
  secret: string
): Promise<P | null> {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  let sig: Uint8Array;
  try {
    sig = b64urlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data))
  );
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(data))) as P;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000)
      return null;
    return payload;
  } catch {
    return null;
  }
}
