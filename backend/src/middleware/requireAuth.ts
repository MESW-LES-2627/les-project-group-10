import type { NextFunction, Request, Response } from 'express';
import { findUserById } from '../modules/auth/auth.queries.js';
import { readSessionCookie, verifySessionToken } from '../modules/auth/session.js';
import { HttpError } from './errorHandler.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readSessionCookie(req);
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) throw new HttpError(401, 'unauthenticated', 'Please log in');

  const user = await findUserById(userId);
  if (!user || user.is_deleted) throw new HttpError(401, 'unauthenticated', 'Please log in');
  if (user.is_banned) throw new HttpError(403, 'banned', 'This account has been banned');

  res.locals.user = { id: user.id, username: user.username, email: user.email };
  next();
}
