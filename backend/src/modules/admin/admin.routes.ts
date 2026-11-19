import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import { listMentors, listStudents } from './admin.queries.js';
import { listUsersQuerySchema } from './admin.schemas.js';

export const adminRouter = Router();

// Every route below is admin-only. Guarding the router (not each route) means a route added
// later is protected by default. The frontend hiding the page is only a convenience.
adminRouter.use(requireAuth, requireAdmin);

/** GET /api/admin/students?page=1&pageSize=20 */
adminRouter.get('/students', async (req, res) => {
  const { page, pageSize } = parseBody(listUsersQuerySchema, req.query);
  const { users, total } = await listStudents(page, pageSize);
  res.json({ users, page, pageSize, total });
});

/** GET /api/admin/mentors?page=1&pageSize=20 */
adminRouter.get('/mentors', async (req, res) => {
  const { page, pageSize } = parseBody(listUsersQuerySchema, req.query);
  const { users, total } = await listMentors(page, pageSize);
  res.json({ users, page, pageSize, total });
});
