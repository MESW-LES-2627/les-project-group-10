import { HttpError } from '../../middleware/errorHandler.js';
import {
  expireUnattachedPayment,
  findPendingStripePayments,
  markStripePaymentResult,
} from './bookings.queries.js';
import type { PaymentScope } from './bookings.queries.js';
import { stripe } from './stripe.js';

// Await this work inside a request. Serverless instances do not run idle timers.
export async function synchronizeStripePayments(scope: PaymentScope) {
  const payments = await findPendingStripePayments(scope);
  const results = await Promise.allSettled(
    payments.map(async (payment) => {
      const id = payment.stripe_payment_intent_id;
      if (!id) {
        await expireUnattachedPayment(payment.id);
        return;
      }
      let intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
      if (intent.livemode) {
        throw new HttpError(
          502,
          'live_payment_disabled',
          'Only Stripe test payments are supported',
        );
      }
      if (
        intent.status !== 'succeeded' &&
        intent.status !== 'canceled' &&
        payment.reservation_expires_at <= new Date()
      ) {
        try {
          intent = await stripe.paymentIntents.cancel(id, { expand: ['latest_charge'] });
        } catch {
          // Payment can succeed concurrently with cancellation. Verify the final result.
          intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] });
          if (intent.status !== 'succeeded' && intent.status !== 'canceled') {
            throw new HttpError(
              502,
              'payment_verification_unavailable',
              'Try verifying payment again',
            );
          }
        }
      }
      if (intent.livemode) {
        throw new HttpError(
          502,
          'live_payment_disabled',
          'Only Stripe test payments are supported',
        );
      }
      if (intent.status === 'succeeded') {
        const charge = intent.latest_charge;
        if (
          !charge ||
          typeof charge === 'string' ||
          intent.amount_received !== payment.amount_cents ||
          intent.currency !== 'eur' ||
          !charge.paid
        ) {
          throw new HttpError(502, 'payment_mismatch', 'Stripe payment could not be verified');
        }
        await markStripePaymentResult(id, true, new Date(charge.created * 1000));
      } else if (intent.status === 'canceled') {
        await markStripePaymentResult(id, false);
      }
    }),
  );
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') {
    if (scope.checkout || scope.bookingId) {
      if (failure.reason instanceof HttpError) throw failure.reason;
      throw new HttpError(502, 'payment_verification_unavailable', 'Try verifying payment again');
    }
    // Keep confirmed dashboard bookings readable when another attempt cannot be checked.
    console.warn('Some pending Stripe payments could not be verified');
  }
}
