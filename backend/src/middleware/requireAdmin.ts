import type { NextFunction, Request, Response } from 'express';
import { isAdmin } from '../modules/auth/auth.queries.js';
import { HttpError } from './errorHandler.js';

// Authorization, not authentication: must run after requireAuth, which sets res.locals.user
// and already rejects logged-out, deleted and banned accounts.
export async function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (!(await isAdmin(res.locals.user.id))) {
    throw new HttpError(403, 'not_an_admin', 'Administrator access required');
  }
  next();
}
