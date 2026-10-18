import { Router } from 'express';
import { HttpError } from '../../middleware/errorHandler.js';
import { parseBody } from '../../middleware/validate.js';
import { findUserByEmail, insertUser, type UserRow } from './auth.queries.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { hashPassword, verifyPassword } from './password.js';
import { clearSessionCookie, setSessionCookie } from './session.js';

export const authRouter = Router();

// never send password_hash (or flags) back to the client
function publicUser(user: UserRow) {
  return { id: user.id, username: user.username, email: user.email };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';
}

authRouter.post('/register', async (req, res) => {
  const { username, email, password } = parseBody(registerSchema, req.body);
  const passwordHash = await hashPassword(password);

  let user: UserRow;
  try {
    user = await insertUser(username, email, passwordHash);
  } catch (err) {
    // Postgres rejected a duplicate email through the UNIQUE constraint.
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'email_taken', 'This email is already registered', {
        email: 'This email is already registered',
      });
    }
    throw err;
  }

  setSessionCookie(res, user.id); //registering logs the user in
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body);
  const user = await findUserByEmail(email);
  const passwordOk = user ? await verifyPassword(password, user.password_hash) : false;

  // Same message for "no such email" and "wrong password".
  if (!user || !passwordOk || user.is_deleted) {
    throw new HttpError(401, 'invalid_credentials', 'Incorrect email or password');
  }
  if (user.is_banned) {
    throw new HttpError(403, 'banned', 'This account has been banned');
  }

  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
