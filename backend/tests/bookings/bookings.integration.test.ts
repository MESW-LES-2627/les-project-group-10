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
import {
  createPendingBooking,
  findPendingStripePayments,
} from '../../src/modules/bookings/bookings.queries.js';
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
    `INSERT INTO mentor_availability_slot (mentor_id,starts_at) VALUES ($1,date_trunc('hour', now()) + interval '2 days') RETURNING to_char(starts_at AT TIME ZONE 'Europe/Lisbon','YYYY-MM-DD') AS date, to_char(starts_at AT TIME ZONE 'Europe/Lisbon','HH24:MI') AS time`,
    [mentor],
  );
  return {
    serviceId: service.rows[0].id as string,
    ...(slot.rows[0] as { date: string; time: string }),
    idempotencyKey: randomUUID(),
  };
}
function checkout(user: string, input: Awaited<ReturnType<typeof selection>>) {
  return fetch(`${origin}/api/bookings/checkout/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `session=${createSessionToken(user)}` },
    body: JSON.stringify(input),
  });
}
async function state(bookingId: string) {
  return (
    await pool.query(
      'SELECT b.status AS booking, p.status AS payment, p.stripe_payment_intent_id FROM booking b JOIN payment p ON p.booking_id=b.id WHERE b.id=$1',
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
  vi.mocked(stripe.paymentIntents.create).mockImplementation(
    async (params) =>
      ({
        id: `pi_${params!.metadata!.paymentId}`,
        client_secret: 'test_secret',
        livemode: false,
      }) as never,
  );
  vi.mocked(stripe.paymentIntents.cancel).mockResolvedValue({
    status: 'canceled',
    livemode: false,
  } as never);
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

  it('expires interrupted attempts and rejects their old idempotency key', async () => {
    const user = await student(),
      input = await selection();
    const attempt = await withTransaction((client) => createPendingBooking(client, user, input));
    await expire(attempt.bookingId);
    expect(await findPendingStripePayments({ studentId: user, checkout: input })).toHaveLength(1);
    const response = await checkout(user, input);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('payment_attempt_closed');
    expect(await state(attempt.bookingId)).toMatchObject({
      booking: 'cancelled',
      payment: 'failed',
    });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect((await checkout(user, { ...input, idempotencyKey: randomUUID() })).status).toBe(200);
  });

  it('rejects expired retries even when called without request-time cleanup', async () => {
    const user = await student(),
      input = await selection();
    const attempt = await withTransaction((client) => createPendingBooking(client, user, input));
    await expire(attempt.bookingId);
    await expect(
      withTransaction((client) => createPendingBooking(client, user, input)),
    ).rejects.toMatchObject({ code: 'payment_attempt_closed' });
  });

  it('keeps a slot reserved when its old Stripe payment cannot be verified', async () => {
    const a = await student(),
      b = await student(),
      input = await selection();
    const original = await (await checkout(a, input)).json();
    await expire(original.bookingId);
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(new Error('Stripe unavailable'));
    const response = await checkout(b, { ...input, idempotencyKey: randomUUID() });
    expect(response.status).toBe(502);
    expect(await state(original.bookingId)).toMatchObject({
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
    await expire(original.bookingId);
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: 'succeeded',
      livemode: false,
      amount_received: 3150,
      currency: 'eur',
      latest_charge: { paid: true, created: Math.floor(Date.now() / 1000) - 120 },
    } as never);
    expect((await checkout(b, { ...input, idempotencyKey: randomUUID() })).status).toBe(409);
    expect(await state(original.bookingId)).toMatchObject({
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
    await expire(original.bookingId);
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      status: 'requires_payment_method',
      livemode: false,
    } as never);
    expect((await checkout(b, { ...input, idempotencyKey: randomUUID() })).status).toBe(200);
    expect(await state(original.bookingId)).toMatchObject({
      booking: 'cancelled',
      payment: 'failed',
    });
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledOnce();
  });

  it('does not return a client secret when the reservation expires during intent creation', async () => {
    const user = await student(),
      input = await selection();
    vi.mocked(stripe.paymentIntents.create).mockImplementation(async (params) => {
      await expire(params!.metadata!.bookingId as string);
      return { id: 'pi_too_late', client_secret: 'must_not_be_returned' } as never;
    });
    const response = await checkout(user, input);
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain('must_not_be_returned');
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_too_late');
    const rows = await pool.query(
      'SELECT p.status AS payment,b.status AS booking FROM payment p JOIN booking b ON b.id=p.booking_id WHERE b.student_id=$1',
      [user],
    );
    expect(rows.rows).toEqual([{ payment: 'failed', booking: 'cancelled' }]);
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

  it('returns a controlled response for a malformed booking id', async () => {
    const user = await student();
    const response = await fetch(`${origin}/api/bookings/not-a-uuid`, {
      headers: { Cookie: `session=${createSessionToken(user)}` },
    });
    expect(response.status).toBe(404);
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
});
