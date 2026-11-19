import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/bookings/stripe.js', () => ({
  stripe: { paymentIntents: { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() } },
}));
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { withTransaction } from '../../src/db/transaction.js';
import { createSessionToken } from '../../src/modules/auth/session.js';
import { createPendingBooking } from '../../src/modules/bookings/bookings.queries.js';
import type Stripe from 'stripe';
import { stripe } from '../../src/modules/bookings/stripe.js';

let server: Server;
let origin: string;
const users: string[] = [];
const mentors: string[] = [];
async function student() {
  const id = randomUUID();
  await pool.query('INSERT INTO "user" (id, username, email, password_hash) VALUES ($1,$2,$3,$4)', [
    id,
    'Booking review',
    `${id}@example.com`,
    'unused',
  ]);
  await pool.query('INSERT INTO student (user_id) VALUES ($1)', [id]);
  users.push(id);
  return id;
}
async function selection() {
  const mentor = await student();
  mentors.push(mentor);
  await pool.query('INSERT INTO mentor (user_id, bio, onboarding_finished) VALUES ($1,$2,true)', [
    mentor,
    'Booking test',
  ]);
  const service = await pool.query(
    'INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,$2,$3,3000,60) RETURNING id',
    [mentor, 'Review', 'Test session'],
  );
  const slot = await pool.query(
    `INSERT INTO mentor_availability_slot (mentor_id,service_id,starts_at,ends_at)
     VALUES ($1,$2,date_trunc('hour', now()) + interval '2 days', date_trunc('hour', now()) + interval '2 days 1 hour')
     RETURNING to_char(starts_at AT TIME ZONE 'Europe/Lisbon','YYYY-MM-DD') AS date, to_char(starts_at AT TIME ZONE 'Europe/Lisbon','HH24:MI') AS time`,
    [mentor, service.rows[0].id],
  );
  return {
    serviceId: service.rows[0].id as string,
    ...(slot.rows[0] as { date: string; time: string }),
    idempotencyKey: randomUUID(),
  };
}
function request(user: string, path: string, body?: object) {
  return fetch(`${origin}/api/bookings/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Cookie: `session=${createSessionToken(user)}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function checkout(user: string, input: Awaited<ReturnType<typeof selection>>) {
  return request(user, 'checkout/stripe', input);
}
function getCheckout(user: string, bookingId: string) {
  return request(user, `checkout/${bookingId}`);
}
function retry(user: string, bookingId: string, attemptId: string) {
  return request(user, `checkout/${bookingId}/retry`, { attemptId });
}
function intent(id: string, overrides: Partial<Stripe.PaymentIntent> = {}) {
  return {
    id,
    client_secret: 'test_secret',
    livemode: false,
    status: 'requires_payment_method',
    ...overrides,
  } as Stripe.PaymentIntent;
}
async function state(bookingId: string) {
  return (
    await pool.query(
      'SELECT b.status AS booking, p.status AS payment, p.stripe_payment_intent_id FROM booking b JOIN payment p ON p.booking_id=b.id WHERE b.id=$1 ORDER BY p.created_at DESC, p.id DESC',
      [bookingId],
    )
  ).rows[0];
}
async function expire(bookingId: string) {
  await pool.query(
    "UPDATE payment SET reservation_expires_at=now()-interval '1 minute' WHERE booking_id=$1",
    [bookingId],
  );
}
beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test listener');
  origin = `http://127.0.0.1:${address.port}`;
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(stripe.paymentIntents.create).mockImplementation(async (params) =>
    intent(`pi_${params!.metadata!.paymentId}`),
  );
  vi.mocked(stripe.paymentIntents.retrieve).mockImplementation(async (id) => intent(id));
  vi.mocked(stripe.paymentIntents.cancel).mockImplementation(async (id) =>
    intent(id, { status: 'canceled' }),
  );
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.query(
    'DELETE FROM payment WHERE booking_id IN (SELECT id FROM booking WHERE student_id=ANY($1::uuid[]))',
    [users],
  );
  await pool.query('DELETE FROM booking WHERE student_id=ANY($1::uuid[])', [users]);
  await pool.query('DELETE FROM service WHERE mentor_id=ANY($1::uuid[])', [mentors]);
  await pool.query('DELETE FROM mentor_availability_slot WHERE mentor_id=ANY($1::uuid[])', [
    mentors,
  ]);
  await pool.query('DELETE FROM "user" WHERE id=ANY($1::uuid[])', [users]);
  await pool.end();
});

describe('checkout reconciliation and reservation lifecycle', () => {
  it('does not retrieve another student’s unrelated PaymentIntent', async () => {
    const a = await student(),
      b = await student();
    expect((await checkout(a, await selection())).status).toBe(200);
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(new Error('No such PaymentIntent'));
    expect((await checkout(b, await selection())).status).toBe(200);
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it('expires an attempt that was never sent to Stripe and reopens it by its initial key', async () => {
    const user = await student();
    const input = await selection();
    const id = await withTransaction((client) => createPendingBooking(client, user, input));
    await expire(id);
    const response = await checkout(user, input);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      booking: { id, status: 'cancelled', payment_status: 'expired' },
      clientSecret: null,
    });
    expect(await state(id)).toMatchObject({ booking: 'cancelled', payment: 'expired' });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('recovers the same booking and intent after Stripe creates it but its response is lost', async () => {
    const user = await student();
    const input = await selection();
    vi.mocked(stripe.paymentIntents.create).mockRejectedValueOnce(new Error('Connection lost'));
    const initial = await checkout(user, input);
    expect(initial.status).toBe(200);
    const first = await initial.json();
    expect(first).toMatchObject({ booking: { payment_status: 'pending' }, clientSecret: null });

    const replay = await checkout(user, input);
    expect(replay.status).toBe(200);
    expect(replay.headers.get('cache-control')).toBe('no-store');
    expect(await replay.json()).toMatchObject({
      booking: { id: first.booking.id, status: 'pending_payment' },
      attemptId: first.attemptId,
      clientSecret: 'test_secret',
    });
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(2);
    const [original, repeated] = vi.mocked(stripe.paymentIntents.create).mock.calls;
    expect(original).toEqual(repeated);
    expect(original[1]).toEqual({ idempotencyKey: input.idempotencyKey });
  });

  it('keeps a slot reserved when its old Stripe payment cannot be verified', async () => {
    const a = await student(),
      b = await student(),
      input = await selection();
    const original = await (await checkout(a, input)).json();
    await expire(original.booking.id);
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(new Error('Stripe unavailable'));
    const response = await checkout(b, { ...input, idempotencyKey: randomUUID() });
    expect(response.status).toBe(502);
    expect(await state(original.booking.id)).toMatchObject({
      booking: 'pending_payment',
      payment: 'pending',
    });
    expect(stripe.paymentIntents.create).toHaveBeenCalledOnce();
  });

  it('confirms an earlier successful payment before another student can reuse its slot', async () => {
    const a = await student(),
      b = await student(),
      input = await selection();
    const original = await (await checkout(a, input)).json();
    await expire(original.booking.id);
    vi.mocked(stripe.paymentIntents.retrieve).mockImplementation(async (id) =>
      intent(id, {
        status: 'succeeded',
        amount_received: 3150,
        currency: 'eur',
        latest_charge: { paid: true } as Stripe.Charge,
      }),
    );
    expect((await checkout(b, { ...input, idempotencyKey: randomUUID() })).status).toBe(409);
    expect(await state(original.booking.id)).toMatchObject({
      booking: 'confirmed',
      payment: 'succeeded',
    });
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('cancels an expired unpaid intent before allowing the slot to be booked again', async () => {
    const a = await student(),
      b = await student(),
      input = await selection();
    const original = await (await checkout(a, input)).json();
    await expire(original.booking.id);
    expect((await checkout(b, { ...input, idempotencyKey: randomUUID() })).status).toBe(200);
    expect(await state(original.booking.id)).toMatchObject({
      booking: 'cancelled',
      payment: 'expired',
    });
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledOnce();
  });

  it('does not return a client secret when the reservation expires during intent creation', async () => {
    const user = await student(),
      input = await selection();
    vi.mocked(stripe.paymentIntents.create).mockImplementation(async (params) => {
      await expire(params!.metadata!.bookingId as string);
      return intent('pi_too_late', { client_secret: 'must_not_be_returned' });
    });
    const response = await checkout(user, input);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      booking: { payment_status: 'expired' },
      clientSecret: null,
    });
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_too_late', {
      expand: ['latest_charge'],
    });
    const rows = await pool.query(
      'SELECT p.status AS payment,b.status AS booking FROM payment p JOIN booking b ON b.id=p.booking_id WHERE b.student_id=$1',
      [user],
    );
    expect(rows.rows).toEqual([{ payment: 'expired', booking: 'cancelled' }]);
  });

  it('allows only one concurrent active booking for a slot', async () => {
    const a = await student(),
      b = await student(),
      input = await selection();
    const responses = await Promise.all([
      checkout(a, input),
      checkout(b, { ...input, idempotencyKey: randomUUID() }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(stripe.paymentIntents.create).toHaveBeenCalledOnce();
  });

  it('keeps an uncertain creation reserved at expiry until Stripe can recover and cancel it', async () => {
    const a = await student();
    const b = await student();
    const input = await selection();
    vi.mocked(stripe.paymentIntents.create)
      .mockRejectedValueOnce(new Error('Provider response lost'))
      .mockRejectedValueOnce(new Error('Provider unavailable'));
    const original = await (await checkout(a, input)).json();
    await expire(original.booking.id);

    const competingInput = { ...input, idempotencyKey: randomUUID() };
    expect((await checkout(b, competingInput)).status).toBe(502);
    expect(await state(original.booking.id)).toMatchObject({ payment: 'pending' });
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();

    expect((await checkout(b, competingInput)).status).toBe(200);
    expect(await state(original.booking.id)).toMatchObject({ payment: 'expired' });
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(`pi_${original.attemptId}`, {
      expand: ['latest_charge'],
    });
  });

  it('persists a decline, reuses the quote on retry, and ignores stale retry requests', async () => {
    const user = await student();
    const input = await selection();
    const original = await (await checkout(user, input)).json();
    const id = original.booking.id;
    const originalAttempt = original.attemptId;
    vi.mocked(stripe.paymentIntents.retrieve).mockImplementation(async (stripeId) =>
      intent(stripeId, {
        last_payment_error: { code: 'card_declined' } as Stripe.PaymentIntent.LastPaymentError,
      }),
    );

    const declined = await (await getCheckout(user, id)).json();
    expect(declined).toMatchObject({
      booking: { id, status: 'cancelled', payment_status: 'failed' },
      attemptId: originalAttempt,
      clientSecret: null,
    });
    await pool.query('UPDATE service SET price_cents = 4000, title = $2 WHERE id = $1', [
      input.serviceId,
      'Edited service',
    ]);
    vi.mocked(stripe.paymentIntents.retrieve).mockImplementation(async (stripeId) =>
      intent(stripeId),
    );

    const responses = await Promise.all([
      retry(user, id, originalAttempt),
      retry(user, id, originalAttempt),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    const [firstRetry, replayed] = await Promise.all(responses.map((response) => response.json()));
    expect(firstRetry).toMatchObject({
      booking: {
        id,
        status: 'pending_payment',
        payment_status: 'pending',
        amount_cents: 3150,
        service_title: 'Review',
      },
    });
    expect(firstRetry.attemptId).not.toBe(originalAttempt);
    expect(replayed.attemptId).toBe(firstRetry.attemptId);

    await expire(id);
    const expired = await (await getCheckout(user, id)).json();
    expect(expired.booking.payment_status).toBe('expired');
    const stale = await (await retry(user, id, originalAttempt)).json();
    expect(stale).toEqual(expired);
    const { rows } = await pool.query(
      'SELECT id, status, amount_cents FROM payment WHERE booking_id = $1 ORDER BY created_at',
      [id],
    );
    expect(rows).toEqual([
      { id: originalAttempt, status: 'failed', amount_cents: 3150 },
      { id: firstRetry.attemptId, status: 'expired', amount_cents: 3150 },
    ]);
  });

  it('rechecks availability when retrying after another student takes the slot', async () => {
    const a = await student();
    const b = await student();
    const input = await selection();
    const original = await (await checkout(a, input)).json();
    await expire(original.booking.id);
    expect((await checkout(b, { ...input, idempotencyKey: randomUUID() })).status).toBe(200);
    const response = await retry(a, original.booking.id, original.attemptId);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'slot_unavailable' } });
    expect(await state(original.booking.id)).toMatchObject({ payment: 'expired' });
  });

  it('reserves a freed slot exactly once when a retry races a fresh checkout', async () => {
    const a = await student();
    const b = await student();
    const input = await selection();
    const original = await (await checkout(a, input)).json();
    await expire(original.booking.id);
    const expired = await (await getCheckout(a, original.booking.id)).json();
    expect(expired.booking.payment_status).toBe('expired');

    const responses = await Promise.all([
      retry(a, original.booking.id, original.attemptId),
      checkout(b, { ...input, idempotencyKey: randomUUID() }),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(2);
  });

  it('denies another student status and retry without contacting Stripe', async () => {
    const owner = await student();
    const other = await student();
    const original = await (await checkout(owner, await selection())).json();
    vi.clearAllMocks();
    const responses = await Promise.all([
      getCheckout(other, original.booking.id),
      retry(other, original.booking.id, original.attemptId),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'booking_not_found' } });
    }
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('returns a controlled response for a malformed booking id', async () => {
    const user = await student();
    const response = await fetch(`${origin}/api/bookings/not-a-uuid`, {
      headers: { Cookie: `session=${createSessionToken(user)}` },
    });
    expect(response.status).toBe(404);
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
});
