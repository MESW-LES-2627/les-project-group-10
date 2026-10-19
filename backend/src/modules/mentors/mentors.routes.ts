import { Router } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import { completeOnboarding, findPublicMentor, findPublicMentors } from './mentors.queries.js';
import { mentorOnboardingSchema } from './mentors.schemas.js';

export const mentorsRouter = Router();

// The logged-in mentor submits the onboarding data (availability excluded).
mentorsRouter.post('/me/onboarding', requireAuth, async (req, res) => {
  const input = parseBody(mentorOnboardingSchema, req.body);
  await withTransaction((client) => completeOnboarding(client, res.locals.user.id, input));
  res.status(204).end();
});

// A mentor's public profile. Anyone can read it, logged in or not.
mentorsRouter.get('/', async (_req, res) => {
  res.json({ mentors: await findPublicMentors() });
});

mentorsRouter.get('/:id', async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  const mentor = id.success ? await findPublicMentor(id.data) : undefined;
  if (!mentor) throw new HttpError(404, 'mentor_not_found', 'Mentor not found');
  res.json({ mentor });
});
