import { Router } from 'express';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import {
  attachPaymentIntent,
  createPendingBooking,
  expirePendingPayments,
  findPendingStripePayments,
  findBookingForStudent,
  findUpcomingBookingsForStudent,
  markStripePaymentResult,
} from './bookings.queries.js';
import { stripeCheckoutSchema } from './bookings.schemas.js';
import { stripe } from './stripe.js';

export const bookingsRouter = Router();

bookingsRouter.get('/stripe/config', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

bookingsRouter.post('/checkout/stripe', requireAuth, async (req, res) => {
  const input = parseBody(stripeCheckoutSchema, req.body);
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
    await attachPaymentIntent(attempt.paymentId, intent.id);
  }
  if (!intent.client_secret)
    throw new HttpError(502, 'stripe_checkout_unavailable', 'Checkout could not be started');
  res.json({ bookingId: attempt.bookingId, clientSecret: intent.client_secret });
});

bookingsRouter.get('/me', requireAuth, async (_req, res) => {
  res.json({ bookings: await findUpcomingBookingsForStudent(res.locals.user.id) });
});

bookingsRouter.get('/:bookingId', requireAuth, async (req, res) => {
  const bookingId = req.params.bookingId;
  if (typeof bookingId !== 'string')
    throw new HttpError(404, 'booking_not_found', 'Booking not found');
  const booking = await findBookingForStudent(bookingId, res.locals.user.id);
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  res.json({ booking });
});

export async function pollStripePayments() {
  const pendingIntentIds = await findPendingStripePayments();
  await Promise.all(
    pendingIntentIds.map(async (id) => {
      try {
        const intent = await stripe.paymentIntents.retrieve(id);
        if (intent.status === 'succeeded' || intent.status === 'canceled') {
          await markStripePaymentResult(id, intent.status === 'succeeded');
        }
      } catch (error) {
        console.warn(`Could not check Stripe PaymentIntent ${id}`, error);
      }
    }),
  );

  const expiredIntentIds = await expirePendingPayments();
  await Promise.all(
    expiredIntentIds.map(async (id) => {
      try {
        await stripe.paymentIntents.cancel(id);
      } catch (error) {
        console.warn(`Could not cancel expired Stripe PaymentIntent ${id}`, error);
      }
    }),
  );
}
