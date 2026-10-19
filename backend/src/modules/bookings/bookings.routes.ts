import { Router } from 'express';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import {
  createPendingMockPayment,
  finalizeMockPayment,
  findBookingForStudent,
  findUpcomingBookingsForStudent,
} from './bookings.queries.js';
import { mockCheckoutSchema } from './bookings.schemas.js';
import { processMockPayment } from './mockPaymentProvider.js';

export const bookingsRouter = Router();

bookingsRouter.post('/checkout/mock', requireAuth, async (req, res) => {
  const input = parseBody(mockCheckoutSchema, req.body);
  const attempt = await withTransaction((client) =>
    createPendingMockPayment(client, res.locals.user.id, input),
  );

  if (attempt.status === 'pending') {
    // Persist first so retries can resume an interrupted mock payment with the same key.
    const result = await processMockPayment({
      paymentId: attempt.paymentId,
      method: attempt.method,
      outcome: attempt.outcome,
    });
    await withTransaction((client) => finalizeMockPayment(client, attempt, result));
  }

  const booking = await findBookingForStudent(attempt.bookingId, res.locals.user.id);
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  res.json({ booking });
});

bookingsRouter.get('/me', requireAuth, async (_req, res) => {
  res.json({ bookings: await findUpcomingBookingsForStudent(res.locals.user.id) });
});

bookingsRouter.get('/:bookingId', requireAuth, async (req, res) => {
  const bookingId = req.params.bookingId;
  if (typeof bookingId !== 'string') {
    throw new HttpError(404, 'booking_not_found', 'Booking not found');
  }
  const booking = await findBookingForStudent(bookingId, res.locals.user.id);
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  res.json({ booking });
});
