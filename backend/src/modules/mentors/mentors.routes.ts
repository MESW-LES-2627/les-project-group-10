import { Router } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import {
  completeOnboarding,
  findPublicMentor,
  findPublicMentors,
  findProfileEditor,
  updateMentorProfile,
} from './mentors.queries.js';
import { mentorOnboardingSchema, mentorProfileSchema } from './mentors.schemas.js';
import {
  createMentorSlot,
  deleteMentorSlot,
  listMentorSlots,
  updateMentorSlot,
} from './mentors.slots.queries.js';
import { mentorSlotSchema } from './mentors.slots.schemas.js';
import {
  createMentorService,
  listMentorServices,
  setMentorServiceActive,
  updateMentorService,
} from './mentors.services.queries.js';
import { mentorServiceActiveSchema, mentorServiceSchema } from './mentors.services.schemas.js';
import {
  createMentorPost,
  deleteMentorPost,
  findPublicMentorPost,
  listMentorPosts,
  updateMentorPost,
} from './mentors.posts.queries.js';
import { mentorPostSchema } from './mentors.posts.schemas.js';

export const mentorsRouter = Router();

// The logged-in mentor submits the onboarding data (availability excluded).
mentorsRouter.post('/me/onboarding', requireAuth, async (req, res) => {
  const input = parseBody(mentorOnboardingSchema, req.body);
  await withTransaction((client) => completeOnboarding(client, res.locals.user.id, input));
  res.status(204).end();
});

mentorsRouter.get('/me/profile', requireAuth, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await withTransaction((client) => findProfileEditor(client, res.locals.user.id)));
});

mentorsRouter.put('/me/profile', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const input = parseBody(mentorProfileSchema, req.body);
  const profile = await withTransaction((client) =>
    updateMentorProfile(client, res.locals.user.id, input),
  );
  res.json({ profile });
});

mentorsRouter.get('/me/slots', requireAuth, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ slots: await listMentorSlots(res.locals.user.id) });
});

mentorsRouter.post('/me/slots', requireAuth, async (req, res) => {
  const input = parseBody(mentorSlotSchema, req.body);
  const slot = await withTransaction((client) =>
    createMentorSlot(client, res.locals.user.id, input),
  );
  res.status(201).json({ slot });
});

mentorsRouter.put('/me/slots/:id', requireAuth, async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'slot_not_found', 'Slot not found');
  const input = parseBody(mentorSlotSchema, req.body);
  const slot = await withTransaction((client) =>
    updateMentorSlot(client, res.locals.user.id, id.data, input),
  );
  res.json({ slot });
});

mentorsRouter.delete('/me/slots/:id', requireAuth, async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'slot_not_found', 'Slot not found');
  await withTransaction((client) => deleteMentorSlot(client, res.locals.user.id, id.data));
  res.status(204).end();
});

mentorsRouter.get('/me/services', requireAuth, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ services: await listMentorServices(res.locals.user.id) });
});

mentorsRouter.post('/me/services', requireAuth, async (req, res) => {
  const input = parseBody(mentorServiceSchema, req.body);
  const service = await withTransaction((client) =>
    createMentorService(client, res.locals.user.id, input),
  );
  res.status(201).json({ service });
});

mentorsRouter.put('/me/services/:id', requireAuth, async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'service_not_found', 'Service not found');
  const input = parseBody(mentorServiceSchema, req.body);
  const service = await withTransaction((client) =>
    updateMentorService(client, res.locals.user.id, id.data, input),
  );
  res.json({ service });
});

mentorsRouter.patch('/me/services/:id/active', requireAuth, async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'service_not_found', 'Service not found');
  const input = parseBody(mentorServiceActiveSchema, req.body);
  const service = await withTransaction((client) =>
    setMentorServiceActive(client, res.locals.user.id, id.data, input.isActive),
  );
  res.json({ service });
});

mentorsRouter.get('/me/posts', requireAuth, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ posts: await listMentorPosts(res.locals.user.id) });
});

mentorsRouter.post('/me/posts', requireAuth, async (req, res) => {
  const input = parseBody(mentorPostSchema, req.body);
  const post = await withTransaction((client) =>
    createMentorPost(client, res.locals.user.id, input),
  );
  res.status(201).json({ post });
});

mentorsRouter.put('/me/posts/:id', requireAuth, async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'post_not_found', 'Post not found');
  const input = parseBody(mentorPostSchema, req.body);
  const post = await withTransaction((client) =>
    updateMentorPost(client, res.locals.user.id, id.data, input),
  );
  res.json({ post });
});

mentorsRouter.delete('/me/posts/:id', requireAuth, async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, 'post_not_found', 'Post not found');
  await withTransaction((client) => deleteMentorPost(client, res.locals.user.id, id.data));
  res.status(204).end();
});

// A mentor's public profile. Anyone can read it, logged in or not.
mentorsRouter.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ mentors: await findPublicMentors() });
});

mentorsRouter.get('/:id/posts/:postId', async (req, res) => {
  const mentorId = z.guid().safeParse(req.params.id);
  const postId = z.guid().safeParse(req.params.postId);
  const post =
    mentorId.success && postId.success
      ? await findPublicMentorPost(mentorId.data, postId.data)
      : undefined;
  if (!post) throw new HttpError(404, 'post_not_found', 'Post not found');
  res.set('Cache-Control', 'no-store');
  res.json({ post });
});

mentorsRouter.get('/:id', async (req, res) => {
  const id = z.guid().safeParse(req.params.id);
  const mentor = id.success ? await findPublicMentor(id.data) : undefined;
  if (!mentor) throw new HttpError(404, 'mentor_not_found', 'Mentor not found');
  res.set('Cache-Control', 'no-store');
  res.json({ mentor });
});
