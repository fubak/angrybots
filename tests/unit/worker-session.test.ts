import { describe, expect, it } from 'vitest';
import {
  randomToken,
  sha256Base64Url,
  signSession,
  verifySession,
} from '../../worker/session';

const SECRET = 'test-secret-do-not-use';

describe('worker/session', () => {
  it('sign/verify roundtrip returns the payload', async () => {
    const payload = { uid: 'u123', exp: Math.floor(Date.now() / 1000) + 60 };
    const token = await signSession(payload, SECRET);
    expect(await verifySession<typeof payload>(token, SECRET)).toEqual(payload);
  });

  it('tampered token → null', async () => {
    const token = await signSession(
      { uid: 'u1', exp: Math.floor(Date.now() / 1000) + 60 },
      SECRET
    );
    const [data, sig] = token.split('.');
    const tampered = `${data}.${sig?.slice(0, -2)}AA`;
    expect(await verifySession(tampered, SECRET)).toBeNull();
    const payload = JSON.parse(
      Buffer.from(data!, 'base64url').toString()
    ) as { uid: string; exp: number };
    payload.uid = 'hacker';
    const resealed = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    expect(await verifySession(resealed, SECRET)).toBeNull();
  });

  it('wrong secret → null', async () => {
    const token = await signSession(
      { uid: 'u1', exp: Math.floor(Date.now() / 1000) + 60 },
      SECRET
    );
    expect(await verifySession(token, 'other-secret')).toBeNull();
  });

  it('expired token → null', async () => {
    const token = await signSession(
      { uid: 'u1', exp: Math.floor(Date.now() / 1000) - 1 },
      SECRET
    );
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('malformed tokens → null', async () => {
    expect(await verifySession('', SECRET)).toBeNull();
    expect(await verifySession('nodot', SECRET)).toBeNull();
    expect(await verifySession('a.!!!', SECRET)).toBeNull();
  });

  it('PKCE challenge is 43-char base64url (S256 of verifier)', async () => {
    const verifier = randomToken(32);
    const challenge = await sha256Base64Url(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('randomToken produces distinct base64url strings', () => {
    const a = randomToken(16);
    const b = randomToken(16);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
