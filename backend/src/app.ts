import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { findRoles } from './modules/auth/auth.queries.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { mentorsRouter } from './modules/mentors/mentors.routes.js';

export const app = express();

app.use(express.json());
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/mentors', mentorsRouter);

app.get('/api/me', requireAuth, async (_req, res) => {
  const roles = await findRoles(res.locals.user.id);
  res.json({ user: { ...res.locals.user, ...roles } });
});

app.use(errorHandler);
