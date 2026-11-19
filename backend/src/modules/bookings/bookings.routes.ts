import { Router } from 'express';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import {
  createPendingBooking,
  findBookingForStudent,
  findUpcomingBookingsForStudent,
  retryBooking,
} from './bookings.queries.js';
import { bookingIdSchema, retryCheckoutSchema, stripeCheckoutSchema } from './bookings.schemas.js';
import { synchronizeStripePayments } from './payments.js';

export const bookingsRouter = Router();

function readBookingId(value: unknown) {
  const result = bookingIdSchema.safeParse(value);
  if (!result.success) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  return result.data;
}

async function requireBooking(bookingId: string, studentId: string) {
  const booking = await findBookingForStudent(bookingId, studentId);
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  return booking;
}

async function checkoutStatus(bookingId: string, studentId: string) {
  const current = await requireBooking(bookingId, studentId);
  let secrets: Awaited<ReturnType<typeof synchronizeStripePayments>> = [];
  if (current.payment_status === 'pending') {
    try {
      secrets = await synchronizeStripePayments({ studentId, bookingId }, true);
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 'payment_verification_unavailable') {
        throw error;
      }
      // Keep the checkout recoverable if a provider request times out.
    }
  }

  const { attempt_id: attemptId, ...booking } =
    current.payment_status === 'pending' ? await requireBooking(bookingId, studentId) : current;
  return {
    booking,
    attemptId,
    clientSecret:
      booking.payment_status === 'pending'
        ? (secrets.find(({ id }) => id === attemptId)?.clientSecret ?? null)
        : null,
  };
}

bookingsRouter.get('/stripe/config', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

bookingsRouter.post('/checkout/stripe', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const input = parseBody(stripeCheckoutSchema, req.body);
  const studentId = res.locals.user.id;
  await synchronizeStripePayments({ studentId, checkout: input });
  const bookingId = await withTransaction((client) =>
    createPendingBooking(client, studentId, input),
  );
  res.json({ bookingId, ...(await checkoutStatus(bookingId, studentId)) });
});

bookingsRouter.get('/checkout/:bookingId', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await checkoutStatus(readBookingId(req.params.bookingId), res.locals.user.id));
});

bookingsRouter.post('/checkout/:bookingId/retry', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const bookingId = readBookingId(req.params.bookingId);
  const studentId = res.locals.user.id;
  const { attemptId } = parseBody(retryCheckoutSchema, req.body);
  const current = await requireBooking(bookingId, studentId);
  if (
    current.attempt_id === attemptId &&
    current.status === 'cancelled' &&
    (current.payment_status === 'failed' || current.payment_status === 'expired')
  ) {
    await synchronizeStripePayments({ studentId, bookingId, retrySlot: true });
    await withTransaction((client) => retryBooking(client, bookingId, studentId, attemptId));
  }
  res.json(await checkoutStatus(bookingId, studentId));
});

bookingsRouter.get('/me', requireAuth, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  await synchronizeStripePayments({ studentId: res.locals.user.id });
  res.json({ bookings: await findUpcomingBookingsForStudent(res.locals.user.id) });
});

bookingsRouter.get('/:bookingId', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const studentId = res.locals.user.id;
  const bookingId = readBookingId(req.params.bookingId);
  const current = await requireBooking(bookingId, studentId);
  if (current.payment_status === 'pending') {
    await synchronizeStripePayments({ studentId, bookingId });
  }
  res.json({
    booking:
      current.payment_status === 'pending' ? await requireBooking(bookingId, studentId) : current,
  });
});
