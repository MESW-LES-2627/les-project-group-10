import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { findRoles } from './modules/auth/auth.queries.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { mentorsRouter } from './modules/mentors/mentors.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { pool } from './db/pool.js';

export const app = express();
const healthQuery = { text: 'SELECT 1', query_timeout: 3_000 };

app.use(express.json());
app.get('/api/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await pool.query(healthQuery);
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/mentors', mentorsRouter);
app.use('/api/bookings', bookingsRouter);

app.get('/api/me', requireAuth, async (_req, res) => {
  const roles = await findRoles(res.locals.user.id);
  res.json({ user: { ...res.locals.user, ...roles } });
});

app.use(errorHandler);
