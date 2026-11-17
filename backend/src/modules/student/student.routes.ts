import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';

import {
  ProfileValidationError,
  getStudentProfile,
  updateStudentProfile,
} from './student.queries.js';

import { toFieldErrors, updateStudentProfileSchema } from './student.schemas.js';

export const studentsRouter = Router();

// The id of the user always comes from the session cookie

/**GET /api/students/me: restores saved details after a refresh or a new sign-in */
studentsRouter.get('/me', requireAuth, async (_req, res) => {
  const profile = await getStudentProfile(res.locals.user.id);
  if (!profile) {
    res.status(403).json({ error: 'Only students have a student profile' });
    return;
  }
  res.json(profile);
});

/**PATCH /api/students/me: used by onboarding (first save) and the edit profile page */
studentsRouter.patch('/me', requireAuth, async (req, res) => {
  const parsed = updateStudentProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', fields: toFieldErrors(parsed.error) });
    return;
  }

  try {
    const profile = await updateStudentProfile(res.locals.user.id, parsed.data);
    if (!profile) {
      res.status(403).json({ error: 'Only students have a student profile' });
      return;
    }
    res.json(profile);
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      res.status(400).json({ error: err.message, fields: err.fields });
      return;
    }
    throw err; // anything else goes to the central error handler (Express 5)
  }
});
