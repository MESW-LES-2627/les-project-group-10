import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { withTransaction } from '../../db/transaction.js';
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
    booking_status: string;
    reservation_valid: boolean;
  }>(
    `SELECT p.id AS payment_id, b.id AS booking_id, b.student_id, b.service_id,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM-DD') AS date,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'HH24:MI') AS time,
            p.status AS payment_status, p.stripe_payment_intent_id, p.amount_cents,
            b.status AS booking_status, p.reservation_expires_at > clock_timestamp() AS reservation_valid
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
    if (
      existing.payment_status !== 'pending' ||
      existing.booking_status !== 'pending_payment' ||
      !existing.reservation_valid
    ) {
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
  const services = await client.query<{
    id: string;
    mentor_id: string;
    title: string;
    duration_minutes: number;
    price_cents: number;
  }>(
    `SELECT s.id, s.mentor_id, s.title, s.duration_minutes, s.price_cents FROM service s
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
      WHERE mentor_id = $1 AND service_id = $2
        AND starts_at = (($3::date + $4::time) AT TIME ZONE 'Europe/Lisbon')
        AND starts_at > now() FOR UPDATE`,
    [service.mentor_id, service.id, input.date, input.time],
  );
  const slot = slotResult.rows[0];
  if (!slot) throw new HttpError(409, 'slot_unavailable', 'That time is no longer available');

  // Stripe must be reconciled before releasing a reservation, even after its deadline.
  const occupied = await client.query(
    "SELECT 1 FROM booking WHERE availability_slot_id = $1 AND status <> 'cancelled'",
    [slot.id],
  );
  if (occupied.rowCount)
    throw new HttpError(409, 'slot_unavailable', 'That time is no longer available');
  const amountCents = service.price_cents + PLATFORM_FEE_CENTS;
  const booking = await client.query<{ id: string }>(
    `INSERT INTO booking (student_id, service_id, scheduled_at, status, availability_slot_id,
                           service_title, service_duration_minutes, service_price_cents)
     VALUES ($1, $2, $3, 'pending_payment', $4, $5, $6, $7) RETURNING id`,
    [
      userId,
      service.id,
      slot.starts_at,
      slot.id,
      service.title,
      service.duration_minutes,
      service.price_cents,
    ],
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
  const result = await pool.query(
    `UPDATE payment p SET stripe_payment_intent_id = $2 FROM booking b
      WHERE p.id = $1 AND b.id = p.booking_id AND p.status = 'pending'
        AND b.status = 'pending_payment' AND p.reservation_expires_at > clock_timestamp()
        AND (p.stripe_payment_intent_id IS NULL OR p.stripe_payment_intent_id = $2)`,
    [paymentId, intentId],
  );
  return result.rowCount === 1;
}

export type PaymentScope = {
  studentId: string;
  bookingId?: string;
  checkout?: StripeCheckoutInput;
};

export async function findPendingStripePayments(scope: PaymentScope) {
  const { rows } = await pool.query<{
    id: string;
    stripe_payment_intent_id: string | null;
    reservation_expires_at: Date;
    amount_cents: number;
  }>(
    `SELECT p.id, p.stripe_payment_intent_id, p.reservation_expires_at, p.amount_cents FROM payment p
       JOIN booking b ON b.id = p.booking_id
      WHERE p.status = 'pending' AND b.status = 'pending_payment'
        AND CASE WHEN $3::uuid IS NULL THEN
          b.student_id = $1 AND ($2::uuid IS NULL OR b.id = $2)
        ELSE
          (b.student_id = $1 AND p.idempotency_key = $3) OR
          (p.reservation_expires_at <= clock_timestamp() AND b.availability_slot_id IN (
            SELECT slot.id FROM mentor_availability_slot slot JOIN service s ON s.mentor_id = slot.mentor_id
             WHERE s.id = $4 AND slot.starts_at = (($5::date + $6::time) AT TIME ZONE 'Europe/Lisbon')
          ))
        END`,
    [
      scope.studentId,
      scope.bookingId ?? null,
      scope.checkout?.idempotencyKey ?? null,
      scope.checkout?.serviceId ?? null,
      scope.checkout?.date ?? null,
      scope.checkout?.time ?? null,
    ],
  );
  return rows;
}

export async function expireUnattachedPayment(paymentId: string) {
  return withTransaction(async (client) => {
    const found = await client.query<{ booking_id: string }>(
      `SELECT p.booking_id FROM payment p JOIN booking b ON b.id = p.booking_id
        WHERE p.id = $1 AND p.stripe_payment_intent_id IS NULL AND p.status = 'pending'
          AND b.status = 'pending_payment' AND p.reservation_expires_at <= clock_timestamp()
        FOR UPDATE OF p, b`,
      [paymentId],
    );
    if (!found.rows[0]) return;
    await client.query("UPDATE payment SET status = 'failed' WHERE id = $1", [paymentId]);
    await client.query("UPDATE booking SET status = 'cancelled' WHERE id = $1", [
      found.rows[0].booking_id,
    ]);
  });
}

export async function markStripePaymentResult(
  intentId: string,
  succeeded: boolean,
  paidAt = new Date(),
) {
  return withTransaction(async (client) => {
    const found = await client.query<{
      id: string;
      booking_id: string;
      status: string;
      reservation_expires_at: Date;
      booking_status: string;
    }>(
      `SELECT p.id, p.booking_id, p.status, p.reservation_expires_at, b.status AS booking_status
         FROM payment p JOIN booking b ON b.id = p.booking_id
        WHERE p.stripe_payment_intent_id = $1 FOR UPDATE OF p, b`,
      [intentId],
    );
    const payment = found.rows[0];
    if (!payment || payment.status !== 'pending') return null;
    // A sleeping function may observe success later. Use Stripe's charge time.
    const isValid =
      succeeded &&
      payment.booking_status === 'pending_payment' &&
      payment.reservation_expires_at >= paidAt;
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

// service_title/duration_minutes come from the booking's own snapshot, not a live join, so a
// later edit to the service (title, duration or price) never changes a past booking's record.
const BOOKING_DETAILS_SQL = `
  SELECT b.id, b.status, b.scheduled_at, p.status AS payment_status, p.amount_cents,
         b.service_id, b.service_title, b.service_duration_minutes AS duration_minutes,
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
