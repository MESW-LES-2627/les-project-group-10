import { Router } from 'express';
import { withTransaction } from '../../db/transaction.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import { completeOnboarding } from './mentors.queries.js';
import { mentorOnboardingSchema } from './mentors.schemas.js';

export const mentorsRouter = Router();

// The logged-in mentor submits the onboarding data (availability excluded).
mentorsRouter.post('/me/onboarding', requireAuth, async (req, res) => {
  const input = parseBody(mentorOnboardingSchema, req.body);
  await withTransaction((client) => completeOnboarding(client, res.locals.user.id, input));
  res.status(204).end();
});
