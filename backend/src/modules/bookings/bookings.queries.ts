import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { StripeCheckoutInput } from './bookings.schemas.js';

const PLATFORM_FEE_CENTS = 150;
const RESERVATION_MINUTES = 10;

export async function createPendingBooking(
  client: PoolClient,
  userId: string,
  input: StripeCheckoutInput,
) {
  await client.query('SELECT pg_advisory_xact_lock(1650812275, hashtext($1))', [
    input.idempotencyKey,
  ]);
  const previous = await client.query<{
    payment_id: string;
    booking_id: string;
    student_id: string;
    service_id: string;
    date: string;
    time: string;
    payment_status: 'pending' | 'succeeded' | 'failed';
    stripe_payment_intent_id: string | null;
    amount_cents: number;
  }>(
    `SELECT p.id AS payment_id, b.id AS booking_id, b.student_id, b.service_id,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM-DD') AS date,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'HH24:MI') AS time,
            p.status AS payment_status, p.stripe_payment_intent_id, p.amount_cents
       FROM payment p JOIN booking b ON b.id = p.booking_id
      WHERE p.idempotency_key = $1 FOR UPDATE OF p, b`,
    [input.idempotencyKey],
  );
  const existing = previous.rows[0];
  if (existing) {
    if (
      existing.student_id !== userId ||
      existing.service_id !== input.serviceId ||
      existing.date !== input.date ||
      existing.time !== input.time
    ) {
      throw new HttpError(409, 'idempotency_key_reused', 'Start a new payment attempt');
    }
    if (existing.payment_status !== 'pending') {
      throw new HttpError(409, 'payment_attempt_closed', 'Start a new checkout attempt');
    }
    return {
      paymentId: existing.payment_id,
      bookingId: existing.booking_id,
      paymentIntentId: existing.stripe_payment_intent_id,
      created: false,
      amountCents: existing.amount_cents,
    };
  }

  const student = await client.query('SELECT 1 FROM student WHERE user_id = $1', [userId]);
  if (!student.rowCount)
    throw new HttpError(403, 'not_a_student', 'Only student accounts can book a session');
  const services = await client.query<{ id: string; mentor_id: string; price_cents: number }>(
    `SELECT s.id, s.mentor_id, s.price_cents FROM service s
       JOIN mentor m ON m.user_id = s.mentor_id JOIN "user" u ON u.id = m.user_id
      WHERE s.id = $1 AND s.is_active AND m.onboarding_finished AND NOT u.is_banned AND NOT u.is_deleted`,
    [input.serviceId],
  );
  const service = services.rows[0];
  if (!service) throw new HttpError(404, 'service_not_found', 'This service is not available');
  if (service.mentor_id === userId)
    throw new HttpError(400, 'self_booking', 'You cannot book your own session');
  const slotResult = await client.query<{ id: string; starts_at: Date }>(
    `SELECT id, starts_at FROM mentor_availability_slot
      WHERE mentor_id = $1 AND starts_at = (($2::date + $3::time) AT TIME ZONE 'Europe/Lisbon')
        AND starts_at > now() FOR UPDATE`,
    [service.mentor_id, input.date, input.time],
  );
  const slot = slotResult.rows[0];
  if (!slot) throw new HttpError(409, 'slot_unavailable', 'That time is no longer available');

  // Expire stale reservations before the active-slot unique index checks this slot.
  await client.query(
    `UPDATE booking b SET status = 'cancelled'
       FROM payment p WHERE p.booking_id = b.id AND b.availability_slot_id = $1
         AND b.status = 'pending_payment' AND p.status = 'pending'
         AND p.reservation_expires_at <= now()`,
    [slot.id],
  );
  const amountCents = service.price_cents + PLATFORM_FEE_CENTS;
  const booking = await client.query<{ id: string }>(
    `INSERT INTO booking (student_id, service_id, scheduled_at, status, availability_slot_id)
     VALUES ($1, $2, $3, 'pending_payment', $4) RETURNING id`,
    [userId, service.id, slot.starts_at, slot.id],
  );
  const payment = await client.query<{ id: string }>(
    `INSERT INTO payment (booking_id, amount_cents, currency, status, idempotency_key, reservation_expires_at)
     VALUES ($1, $2, 'eur', 'pending', $3, now() + ($4 * interval '1 minute')) RETURNING id`,
    [booking.rows[0].id, amountCents, input.idempotencyKey, RESERVATION_MINUTES],
  );
  return {
    paymentId: payment.rows[0].id,
    bookingId: booking.rows[0].id,
    paymentIntentId: null,
    created: true,
    amountCents,
  };
}

export async function attachPaymentIntent(paymentId: string, intentId: string) {
  await pool.query('UPDATE payment SET stripe_payment_intent_id = $2 WHERE id = $1', [
    paymentId,
    intentId,
  ]);
}

export async function markPaymentEvent(intentId: string, succeeded: boolean) {
  return withPaymentLock(async (client) => {
    const found = await client.query<{
      id: string;
      booking_id: string;
      status: string;
      reservation_expires_at: Date;
    }>(
      'SELECT id, booking_id, status, reservation_expires_at FROM payment WHERE stripe_payment_intent_id = $1 FOR UPDATE',
      [intentId],
    );
    const payment = found.rows[0];
    if (!payment || payment.status !== 'pending') return null;
    const isValid = succeeded && payment.reservation_expires_at > new Date();
    await client.query('UPDATE payment SET status = $2 WHERE id = $1', [
      payment.id,
      isValid ? 'succeeded' : 'failed',
    ]);
    await client.query('UPDATE booking SET status = $2 WHERE id = $1', [
      payment.booking_id,
      isValid ? 'confirmed' : 'cancelled',
    ]);
    return { bookingId: payment.booking_id, confirmed: isValid };
  });
}

async function withPaymentLock<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function expirePendingPayments() {
  return withPaymentLock(async (client) => {
    const expired = await client.query<{
      id: string;
      booking_id: string;
      stripe_payment_intent_id: string | null;
    }>(
      `SELECT p.id, p.booking_id, p.stripe_payment_intent_id FROM payment p
        JOIN booking b ON b.id = p.booking_id
       WHERE p.status = 'pending' AND p.reservation_expires_at <= now() AND b.status = 'pending_payment'
       FOR UPDATE OF p, b SKIP LOCKED`,
    );
    for (const row of expired.rows) {
      await client.query("UPDATE payment SET status = 'failed' WHERE id = $1", [row.id]);
      await client.query("UPDATE booking SET status = 'cancelled' WHERE id = $1", [row.booking_id]);
    }
    return expired.rows.flatMap((row) =>
      row.stripe_payment_intent_id ? [row.stripe_payment_intent_id] : [],
    );
  });
}

const BOOKING_DETAILS_SQL = `
  SELECT b.id, b.status, b.scheduled_at, p.status AS payment_status, p.amount_cents,
         s.id AS service_id, s.title AS service_title, s.duration_minutes,
         m.user_id AS mentor_id, u.username AS mentor_name, m.headline AS mentor_headline
    FROM booking b JOIN LATERAL (
      SELECT status, amount_cents FROM payment WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1
    ) p ON true JOIN service s ON s.id = b.service_id JOIN mentor m ON m.user_id = s.mentor_id
      JOIN "user" u ON u.id = m.user_id`;

export async function findBookingForStudent(bookingId: string, studentId: string) {
  const { rows } = await pool.query(
    `${BOOKING_DETAILS_SQL} WHERE b.id = $1 AND b.student_id = $2`,
    [bookingId, studentId],
  );
  return rows[0];
}

export async function findUpcomingBookingsForStudent(studentId: string) {
  const { rows } = await pool.query(
    `${BOOKING_DETAILS_SQL}
      WHERE b.student_id = $1 AND b.status = 'confirmed' AND b.scheduled_at >= now() ORDER BY b.scheduled_at`,
    [studentId],
  );
  return rows;
}
