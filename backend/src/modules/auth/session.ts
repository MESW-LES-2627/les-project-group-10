import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'session';
const SESSION_SECONDS = 60 * 60 * 24; // 1 day

function requireSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET must be set to a string of 32+ characters');
  }
  return value;
}

const secret = requireSecret();
function sign(payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

// create the token itself
export function createSessionToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// returns the user id if the token is genuine and not expired, otherwise null.
export function verifySessionToken(token: string): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export function setSessionCookie(res: Response, userId: string): void {
  res.cookie(SESSION_COOKIE, createSessionToken(userId), {
    ...baseCookieOptions,
    maxAge: SESSION_SECONDS * 1000, // Express wants milliseconds here
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions);
}

// Express does not parse cookies, so read the raw header ourselves.
export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return undefined;
}
