import type Stripe from 'stripe';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  attachPaymentIntent,
  claimPaymentIntentCreation,
  expireUnattachedPayment,
  findPendingStripePayments,
  markStripePaymentResult,
} from './bookings.queries.js';
import type { PaymentScope, PendingPayment } from './bookings.queries.js';
import { stripe } from './stripe.js';

function ensureTestMode(intent: Stripe.PaymentIntent) {
  if (intent.livemode) {
    throw new HttpError(502, 'live_payment_disabled', 'Only Stripe test payments are supported');
  }
}

function verificationUnavailable() {
  return new HttpError(502, 'payment_verification_unavailable', 'Try verifying payment again');
}

async function readIntent(payment: PendingPayment, start: boolean) {
  if (payment.stripe_payment_intent_id) {
    const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {
      expand: ['latest_charge'],
    });
    return { intent, expiresAt: payment.reservation_expires_at };
  }

  const creation = await claimPaymentIntentCreation(payment.id, start);
  if (!creation) {
    if (payment.reservation_expires_at <= new Date()) {
      // The query only releases an attempt for which no provider call could be in flight.
      await expireUnattachedPayment(payment.id);
    }
    return null;
  }

  // A request can fail after Stripe creates the intent but before we save its ID.
  // Reuse the persisted key and the same inputs until the Stripe result is attached.
  const intent = await stripe.paymentIntents.create(
    {
      amount: creation.amount_cents,
      currency: creation.currency,
      allowed_payment_method_types: ['card', 'mb_way'],
      receipt_email: creation.stripe_receipt_email,
      metadata: { paymentId: creation.id, bookingId: creation.booking_id },
    },
    { idempotencyKey: creation.idempotency_key },
  );
  ensureTestMode(intent);
  // Newly created intents are never confirmed by this call. The secret is only
  // shared after attach succeeds, so an orphaned intent cannot be paid here.
  const attached = await attachPaymentIntent(payment.id, intent.id);
  return attached ? { intent, expiresAt: attached.reservation_expires_at } : null;
}

async function reconcilePayment(payment: PendingPayment, start: boolean) {
  const current = await readIntent(payment, start);
  if (!current) return null;
  let { intent } = current;
  ensureTestMode(intent);

  const expired = current.expiresAt <= new Date();
  const failed = intent.status === 'requires_payment_method' && Boolean(intent.last_payment_error);
  if (intent.status !== 'succeeded' && intent.status !== 'canceled' && (expired || failed)) {
    const id = intent.id;
    try {
      intent = await stripe.paymentIntents.cancel(id, { expand: ['latest_charge'] });
    } catch {
      // Stripe can finish a payment while a request is trying to cancel it.
      intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
    }
    if (intent.status !== 'succeeded' && intent.status !== 'canceled') {
      throw verificationUnavailable();
    }
    ensureTestMode(intent);
  }

  if (intent.status === 'succeeded') {
    const charge = intent.latest_charge;
    if (
      !charge ||
      typeof charge === 'string' ||
      intent.amount_received !== payment.amount_cents ||
      intent.currency !== payment.currency ||
      !charge.paid
    ) {
      throw new HttpError(502, 'payment_mismatch', 'Stripe payment could not be verified');
    }
    await markStripePaymentResult(intent.id, 'succeeded');
  } else if (intent.status === 'canceled') {
    await markStripePaymentResult(intent.id, expired ? 'expired' : 'failed');
  } else if (
    intent.status === 'requires_payment_method' ||
    intent.status === 'requires_confirmation'
  ) {
    return intent.client_secret;
  }
  return null;
}

// Await this work inside a request. Serverless instances do not run idle timers.
export async function synchronizeStripePayments(scope: PaymentScope, start = false) {
  const payments = await findPendingStripePayments(scope);
  const results = await Promise.allSettled(
    payments.map(async (payment) => ({
      id: payment.id,
      clientSecret: await reconcilePayment(payment, start),
    })),
  );
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') {
    if (scope.checkout || scope.bookingId) {
      if (failure.reason instanceof HttpError) throw failure.reason;
      throw verificationUnavailable();
    }
    // Keep confirmed dashboard bookings readable when another attempt cannot be checked.
    console.warn('Some pending Stripe payments could not be verified');
  }
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}
