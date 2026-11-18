import { Router } from 'express';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { findRoles } from '../auth/auth.queries.js';
import { findBookingHistory, findBookingHistoryDetails } from './bookingHistory.queries.js';
import { bookingIdSchema } from './bookings.schemas.js';

export const bookingHistoryRouter = Router();

bookingHistoryRouter.use(requireAuth, async (_req, res, next) => {
  const { isStudent } = await findRoles(res.locals.user.id);
  if (!isStudent) throw new HttpError(403, 'not_a_student', 'Only students have booking history');
  res.set('Cache-Control', 'no-store');
  next();
});

bookingHistoryRouter.get('/', async (_req, res) => {
  res.json(await findBookingHistory(res.locals.user.id));
});

bookingHistoryRouter.get('/:bookingId', async (req, res) => {
  const bookingId = bookingIdSchema.safeParse(req.params.bookingId);
  if (!bookingId.success) throw new HttpError(404, 'booking_not_found', 'Booking not found');

  const booking = await findBookingHistoryDetails(bookingId.data, res.locals.user.id);
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  res.json({ booking });
});
