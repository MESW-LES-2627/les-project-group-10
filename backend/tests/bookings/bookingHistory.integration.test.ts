import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { createSessionToken } from '../../src/modules/auth/session.js';

let server: Server;
let origin: string;
const users: string[] = [];
const mentorName = 'Mentor da Silva';

async function newUser(username: string, role: 'student' | 'mentor') {
  const id = randomUUID();
  users.push(id);
  await pool.query(
    'INSERT INTO "user" (id, username, email, password_hash) VALUES ($1, $2, $3, $4)',
    [id, username, `${id}@example.com`, 'unused'],
  );
  if (role === 'student') {
    await pool.query('INSERT INTO student (user_id) VALUES ($1)', [id]);
  } else {
    await pool.query('INSERT INTO mentor (user_id, bio) VALUES ($1, $2)', [id, 'History fixture']);
  }
  return id;
}

async function newService() {
  const mentor = await newUser(mentorName, 'mentor');
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO service (mentor_id, title, description, price_cents, duration_minutes)
     VALUES ($1, 'Databases', 'SQL practice', 3000, 60) RETURNING id`,
    [mentor],
  );
  return rows[0].id;
}

async function newBooking(
  studentId: string,
  serviceId: string,
  daysFromNow: number,
  status: string,
) {
  const { rows } = await pool.query<{ id: string; scheduled_at: Date }>(
    `INSERT INTO booking (student_id, service_id, scheduled_at, status)
     VALUES ($1, $2, now() + make_interval(days => $3::int), $4) RETURNING id, scheduled_at`,
    [studentId, serviceId, daysFromNow, status],
  );
  return rows[0];
}

async function newAttempt(bookingId: string, status: string, createdAt: string, amount = 3150) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO payment (booking_id, status, amount_cents, currency, created_at, stripe_payment_intent_id)
     VALUES ($1, $2, $3, 'eur', $4, $5) RETURNING id`,
    [bookingId, status, amount, createdAt, `pi_${randomUUID()}`],
  );
  return rows[0].id;
}

function request(userId?: string, bookingId?: string) {
  return fetch(`${origin}/api/bookings/history${bookingId ? `/${bookingId}` : ''}`, {
    headers: userId ? { Cookie: `session=${createSessionToken(userId)}` } : undefined,
  });
}

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test listener');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await pool.query(
    'DELETE FROM payment WHERE booking_id IN (SELECT id FROM booking WHERE student_id=ANY($1::uuid[]))',
    [users],
  );
  await pool.query('DELETE FROM booking WHERE student_id = ANY($1::uuid[])', [users]);
  await pool.query('DELETE FROM service WHERE mentor_id = ANY($1::uuid[])', [users]);
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [users]);
  await pool.end();
});

describe('student booking history', () => {
  it('lists past bookings by session date and groups payments by booking, including future slots', async () => {
    const owner = await newUser('Student', 'student');
    const other = await newUser('Another student', 'student');
    const serviceId = await newService();
    const old = await newBooking(owner, serviceId, -3, 'confirmed');
    const recent = await newBooking(owner, serviceId, -1, 'completed');
    const future = await newBooking(owner, serviceId, 1, 'cancelled');
    const unowned = await newBooking(other, serviceId, -1, 'completed');
    await newAttempt(unowned.id, 'succeeded', '2026-01-01T14:00:00Z');
    await newAttempt(old.id, 'succeeded', '2026-01-01T14:00:00Z');
    await newAttempt(future.id, 'failed', '2026-01-03T14:00:00Z');
    await newAttempt(future.id, 'expired', '2026-01-04T14:00:00Z');

    const response = await request(owner);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({
      pastBookings: [
        { id: recent.id, status: 'completed' },
        {
          id: old.id,
          status: 'confirmed',
          mentor_name: mentorName,
          service_title: 'Databases',
          scheduled_at: old.scheduled_at.toJSON(),
        },
      ],
      paymentBookings: [
        { id: future.id, latest_payment: { status: 'expired' } },
        { id: old.id, latest_payment: { status: 'succeeded' } },
      ],
    });
  });

  it('shows all attempts and preserves the booked details after changes to the service', async () => {
    const owner = await newUser('Student', 'student');
    const serviceId = await newService();
    const { id } = await newBooking(owner, serviceId, -1, 'confirmed');
    const attemptIds = [
      await newAttempt(id, 'failed', '2026-01-01T14:00:00Z', 2650),
      await newAttempt(id, 'expired', '2026-01-02T14:00:00Z'),
      await newAttempt(id, 'succeeded', '2026-01-03T14:00:00Z'),
    ];
    await pool.query(
      `UPDATE service SET title = 'Renamed', duration_minutes = 90, price_cents = 5000,
       is_active = false WHERE id = $1`,
      [serviceId],
    );

    const response = await request(owner, id);
    expect(response.status).toBe(200);
    const { booking } = await response.json();
    expect(booking).toMatchObject({
      id,
      mentor_name: mentorName,
      service_title: 'Databases',
      duration_minutes: 60,
      service_price_cents: 3000,
      payments: [
        { id: attemptIds[2], status: 'succeeded', amount_cents: 3150, currency: 'eur' },
        { id: attemptIds[1], status: 'expired', amount_cents: 3150, currency: 'eur' },
        { id: attemptIds[0], status: 'failed', amount_cents: 2650, currency: 'eur' },
      ],
    });
    expect(booking.payments[0]).toEqual({
      id: attemptIds[2],
      status: 'succeeded',
      amount_cents: 3150,
      currency: 'eur',
      created_at: expect.any(String),
    });
    expect(new Date(booking.payments[0].created_at).toISOString()).toBe('2026-01-03T14:00:00.000Z');
    expect((await (await request(owner)).json()).pastBookings).toMatchObject([
      { id, service_title: 'Databases' },
    ]);
  });

  it('reads updated saved booking and payment statuses on the next request', async () => {
    const owner = await newUser('Student', 'student');
    const { id } = await newBooking(owner, await newService(), -1, 'pending_payment');
    const attempt = await newAttempt(id, 'pending', '2026-01-01T14:00:00Z');
    expect((await (await request(owner, id)).json()).booking).toMatchObject({
      status: 'pending_payment',
      payments: [{ status: 'pending' }],
    });

    await pool.query("UPDATE booking SET status = 'cancelled' WHERE id = $1", [id]);
    await pool.query("UPDATE payment SET status = 'expired' WHERE id = $1", [attempt]);

    expect((await (await request(owner, id)).json()).booking).toMatchObject({
      status: 'cancelled',
      payments: [{ status: 'expired' }],
    });
  });

  it('handles empty accounts and protects booking details from other accounts', async () => {
    const owner = await newUser('Student', 'student');
    const stranger = await newUser('Other student', 'student');
    const mentor = await newUser('Mentor only', 'mentor');
    const { id } = await newBooking(owner, await newService(), -1, 'cancelled');

    expect(await (await request(stranger)).json()).toEqual({
      pastBookings: [],
      paymentBookings: [],
    });
    expect((await request()).status).toBe(401);
    expect((await request(mentor)).status).toBe(403);
    expect((await request(mentor, id)).status).toBe(403);
    const forbidden = await request(stranger, id);
    expect(forbidden.status).toBe(404);
    expect(await forbidden.json()).toEqual({
      error: { code: 'booking_not_found', message: 'Booking not found' },
    });
    expect((await request(owner, 'invalid-id')).status).toBe(404);
    expect((await (await request(owner, id)).json()).booking.payments).toEqual([]);
  });
});
