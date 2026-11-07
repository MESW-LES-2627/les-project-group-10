import { Router } from 'express';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import {
  attachPaymentIntent,
  createPendingBooking,
  expireUnattachedPayment,
  findBookingForStudent,
  findUpcomingBookingsForStudent,
} from './bookings.queries.js';
import { bookingIdSchema, stripeCheckoutSchema } from './bookings.schemas.js';
import { stripe } from './stripe.js';
import { synchronizeStripePayments } from './payments.js';

export const bookingsRouter = Router();

bookingsRouter.get('/stripe/config', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

bookingsRouter.post('/checkout/stripe', requireAuth, async (req, res) => {
  const input = parseBody(stripeCheckoutSchema, req.body);
  await synchronizeStripePayments({ studentId: res.locals.user.id, checkout: input });
  const attempt = await withTransaction((client) =>
    createPendingBooking(client, res.locals.user.id, input),
  );
  let intent;
  if (attempt.paymentIntentId) {
    intent = await stripe.paymentIntents.retrieve(attempt.paymentIntentId);
  } else {
    intent = await stripe.paymentIntents.create(
      {
        amount: attempt.amountCents,
        currency: 'eur',
        allowed_payment_method_types: ['card', 'mb_way'],
        receipt_email: res.locals.user.email,
        metadata: { paymentId: attempt.paymentId, bookingId: attempt.bookingId },
      },
      { idempotencyKey: input.idempotencyKey },
    );
  }
  if (!(await attachPaymentIntent(attempt.paymentId, intent.id))) {
    await stripe.paymentIntents.cancel(intent.id);
    await expireUnattachedPayment(attempt.paymentId);
    throw new HttpError(409, 'payment_attempt_closed', 'Start a new checkout attempt');
  }
  if (!intent.client_secret)
    throw new HttpError(502, 'stripe_checkout_unavailable', 'Checkout could not be started');
  res.json({ bookingId: attempt.bookingId, clientSecret: intent.client_secret });
});

bookingsRouter.get('/me', requireAuth, async (_req, res) => {
  await synchronizeStripePayments({ studentId: res.locals.user.id });
  res.json({ bookings: await findUpcomingBookingsForStudent(res.locals.user.id) });
});

bookingsRouter.get('/:bookingId', requireAuth, async (req, res) => {
  const bookingId = req.params.bookingId;
  if (typeof bookingId !== 'string' || !bookingIdSchema.safeParse(bookingId).success)
    throw new HttpError(404, 'booking_not_found', 'Booking not found');
  await synchronizeStripePayments({ studentId: res.locals.user.id, bookingId });
  const booking = await findBookingForStudent(bookingId, res.locals.user.id);
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  res.json({ booking });
});
