import { Router } from 'express';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { parseBody } from '../../middleware/validate.js';
import {
  attachPaymentIntent,
  createPendingBooking,
  expirePendingPayments,
  findBookingForStudent,
  findUpcomingBookingsForStudent,
  markPaymentEvent,
} from './bookings.queries.js';
import { stripeCheckoutSchema } from './bookings.schemas.js';
import { stripe } from './stripe.js';

export const bookingsRouter = Router();
export const stripeWebhookRouter = Router();

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

stripeWebhookRouter.post('/', async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.header('stripe-signature')!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    res.status(400).send('Invalid Stripe signature');
    return;
  }
  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.canceled') {
    const intent = event.data.object;
    await markPaymentEvent(intent.id, event.type === 'payment_intent.succeeded');
  }
  res.json({ received: true });
});

export async function sweepExpiredStripePayments() {
  const intentIds = await expirePendingPayments();
  await Promise.all(
    intentIds.map(async (id) => {
      try {
        await stripe.paymentIntents.cancel(id);
      } catch (error) {
        console.warn(`Could not cancel expired Stripe PaymentIntent ${id}`, error);
      }
    }),
  );
}
