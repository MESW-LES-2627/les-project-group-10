import { Router } from 'express';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';

import {
  ProfileValidationError,
  getStudentProfile,
  updateStudentProfile,
} from './student.queries.js';

import { updateStudentProfileSchema } from './student.schemas.js';

export const studentsRouter = Router();

// The id of the user always comes from the session cookie

const notAStudent = () =>
  new HttpError(403, 'not_a_student', 'Only students have a student profile');

/**GET /api/students/me: restores saved details after a refresh or a new sign-in */
studentsRouter.get('/me', requireAuth, async (_req, res) => {
  const profile = await getStudentProfile(res.locals.user.id);
  if (!profile) throw notAStudent();
  res.json(profile);
});

/**PATCH /api/students/me: used by onboarding (first save) and the edit profile page */
studentsRouter.patch('/me', requireAuth, async (req, res) => {
  const input = parseBody(updateStudentProfileSchema, req.body);

  try {
    const profile = await updateStudentProfile(res.locals.user.id, input);
    if (!profile) throw notAStudent();
    res.json(profile);
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      // same shape as parseBody: one message per field
      const fields = Object.fromEntries(
        Object.entries(err.fields).map(([field, messages]) => [field, messages[0] ?? err.message]),
      );
      throw new HttpError(400, 'validation_error', 'Invalid input', fields);
    }
    throw err; // anything else goes to the central error handler (Express 5)
  }
});
