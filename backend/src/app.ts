import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './modules/auth/auth.routes.js';

export const app = express();

app.use(express.json());
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

app.get('/api/me', requireAuth, (_req, res) => {
  res.json({ user: res.locals.user });
});

app.use(errorHandler);
