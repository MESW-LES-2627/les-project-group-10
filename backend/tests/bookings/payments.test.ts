import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/bookings/bookings.queries.js', () => ({
  findPendingStripePayments: vi.fn(),
  markStripePaymentResult: vi.fn(),
}));
vi.mock('../../src/modules/bookings/stripe.js', () => ({
  stripe: { paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() } },
}));

import {
  findPendingStripePayments,
  markStripePaymentResult,
} from '../../src/modules/bookings/bookings.queries.js';
import { stripe } from '../../src/modules/bookings/stripe.js';
import { synchronizeStripePayments } from '../../src/modules/bookings/payments.js';

const pending = {
  stripe_payment_intent_id: 'pi_test',
  amount_cents: 3150,
  reservation_expires_at: new Date('2026-01-01T12:10:00Z'),
};
const success = {
  status: 'succeeded',
  livemode: false,
  amount_received: 3150,
  currency: 'eur',
  latest_charge: { paid: true, created: Date.parse('2026-01-01T12:05:00Z') / 1000 },
};

describe('request-time Stripe verification', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findPendingStripePayments).mockResolvedValue([pending]);
  });

  it('uses the Stripe charge time when a sleeping function observes success later', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue(success as never);
    await synchronizeStripePayments('student', 'booking');
    expect(findPendingStripePayments).toHaveBeenCalledWith('student', 'booking');
    expect(markStripePaymentResult).toHaveBeenCalledWith(
      'pi_test',
      true,
      new Date('2026-01-01T12:05:00Z'),
    );
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('cancels an expired unpaid intent before recording failure', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: 'requires_payment_method',
      livemode: false,
    } as never);
    vi.mocked(stripe.paymentIntents.cancel).mockResolvedValue({
      status: 'canceled',
      livemode: false,
    } as never);
    await synchronizeStripePayments();
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_test', {
      expand: ['latest_charge'],
    });
    expect(markStripePaymentResult).toHaveBeenCalledWith('pi_test', false);
  });

  it('verifies success when payment wins a cancellation race', async () => {
    vi.mocked(stripe.paymentIntents.retrieve)
      .mockResolvedValueOnce({ status: 'processing', livemode: false } as never)
      .mockResolvedValueOnce(success as never);
    vi.mocked(stripe.paymentIntents.cancel).mockRejectedValue(new Error('Already paid'));
    await synchronizeStripePayments();
    expect(markStripePaymentResult).toHaveBeenCalledWith('pi_test', true, expect.any(Date));
  });

  it('keeps the database pending when Stripe cannot verify or cancel', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: 'processing',
      livemode: false,
    } as never);
    vi.mocked(stripe.paymentIntents.cancel).mockRejectedValue(new Error('Network unavailable'));
    await expect(synchronizeStripePayments()).rejects.toMatchObject({
      code: 'payment_verification_unavailable',
    });
    expect(markStripePaymentResult).not.toHaveBeenCalled();
  });

  it.each([
    { ...success, amount_received: 1 },
    { ...success, currency: 'usd' },
    { ...success, latest_charge: null },
    { ...success, latest_charge: 'ch_unexpanded' },
    { ...success, latest_charge: { ...success.latest_charge, paid: false } },
  ])('does not confirm a mismatched or incomplete payment', async (intent) => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue(intent as never);
    await expect(synchronizeStripePayments()).rejects.toMatchObject({ code: 'payment_mismatch' });
    expect(markStripePaymentResult).not.toHaveBeenCalled();
  });

  it('does not mutate live-mode intents', async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      ...success,
      livemode: true,
    } as never);
    await expect(synchronizeStripePayments()).rejects.toMatchObject({
      code: 'live_payment_disabled',
    });
    expect(markStripePaymentResult).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('waits for a pending unexpired payment', async () => {
    vi.mocked(findPendingStripePayments).mockResolvedValue([
      { ...pending, reservation_expires_at: new Date(Date.now() + 60_000) },
    ]);
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: 'processing',
      livemode: false,
    } as never);
    await synchronizeStripePayments();
    expect(markStripePaymentResult).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });
});
