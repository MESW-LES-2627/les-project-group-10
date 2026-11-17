import { Router } from 'express';
import { listCategories } from './categories.queries.js';

export const categoriesRouter = Router();

/** GET /api/categories: the subject areas students and mentors choose from. Public, read-only. */
categoriesRouter.get('/', async (_req, res) => {
  res.json({ categories: await listCategories() });
});
