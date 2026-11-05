import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from '../../src/modules/auth/session.js';

// Mirrors the signing scheme in session.ts so we can craft tokens by hand
// (expired, tampered) using the JWT_SECRET set for tests in vitest.config.ts.
function sign(payload: string): string {
  return createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('base64url');
}

function buildToken(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

describe('session', () => {
  it('returns the user id for a valid token', () => {
    const token = createSessionToken('user-123');
    expect(verifySessionToken(token)).toBe('user-123');
  });

  it('rejects a tampered token', () => {
    const token = createSessionToken('user-123');
    const [payload, signature] = token.split('.');
    const tampered = `${payload}.${signature!.slice(0, -1)}a`;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = buildToken({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 10 });
    expect(verifySessionToken(expired)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifySessionToken('not-a-real-token')).toBeNull();
    expect(verifySessionToken('')).toBeNull();
  });
});
