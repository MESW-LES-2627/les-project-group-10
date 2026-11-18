import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { findRoles } from './modules/auth/auth.queries.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { mentorsRouter } from './modules/mentors/mentors.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { bookingHistoryRouter } from './modules/bookings/bookingHistory.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { studentsRouter } from './modules/student/student.routes.js';
import { pool } from './db/pool.js';

export const app = express();

app.use(express.json());
app.get('/api/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const migration = process.env.REQUIRED_MIGRATION;
    const query = {
      text: migration ? 'SELECT 1 FROM schema_migration WHERE filename = $1' : 'SELECT 1',
      values: migration ? [migration] : [],
      query_timeout: 3_000,
    };
    const result = await pool.query(query);
    if (!result.rowCount) throw new Error('Required database migration is missing');
    res.json({
      status: 'ok',
      revision: process.env.DEPLOYMENT_REVISION ?? null,
      migration: migration ?? null,
    });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/mentors', mentorsRouter);
app.use('/api/bookings/history', bookingHistoryRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/categories', categoriesRouter);

app.get('/api/me', requireAuth, async (_req, res) => {
  const roles = await findRoles(res.locals.user.id);
  res.json({ user: { ...res.locals.user, ...roles } });
});

app.use(errorHandler);
