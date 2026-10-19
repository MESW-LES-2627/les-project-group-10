import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { MockCheckoutInput } from './bookings.schemas.js';

const PLATFORM_FEE_CENTS = 150;

export async function createPendingMockPayment(
  client: PoolClient,
  userId: string,
  input: MockCheckoutInput,
) {
  // Serializing a retry key makes browser retries return one booking/payment attempt.
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
    payment_method: string;
    outcome: string;
    payment_status: 'pending' | 'succeeded' | 'failed';
  }>(
    `SELECT p.id AS payment_id, b.id AS booking_id, b.student_id, b.service_id,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM-DD') AS date,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'HH24:MI') AS time,
            p.mock_method AS payment_method, p.mock_outcome AS outcome, p.status AS payment_status
       FROM payment p
       JOIN booking b ON b.id = p.booking_id
      WHERE p.idempotency_key = $1
      FOR UPDATE OF p, b`,
    [input.idempotencyKey],
  );

  if (previous.rows[0]) {
    const attempt = previous.rows[0];
    if (
      attempt.student_id !== userId ||
      attempt.service_id !== input.serviceId ||
      attempt.date !== input.date ||
      attempt.time !== input.time ||
      attempt.payment_method !== input.paymentMethod ||
      attempt.outcome !== input.outcome
    ) {
      throw new HttpError(409, 'idempotency_key_reused', 'Start a new payment attempt');
    }
    return {
      paymentId: attempt.payment_id,
      bookingId: attempt.booking_id,
      status: attempt.payment_status,
      method: input.paymentMethod,
      outcome: input.outcome,
      created: false,
    };
  }

  const student = await client.query('SELECT 1 FROM student WHERE user_id = $1', [userId]);
  if (student.rowCount === 0) {
    throw new HttpError(403, 'not_a_student', 'Only student accounts can book a session');
  }

  const services = await client.query<{
    id: string;
    mentor_id: string;
    price_cents: number;
  }>(
    `SELECT s.id, s.mentor_id, s.price_cents
       FROM service s
       JOIN mentor m ON m.user_id = s.mentor_id
       JOIN "user" u ON u.id = m.user_id
      WHERE s.id = $1 AND s.is_active AND m.onboarding_finished
        AND NOT u.is_banned AND NOT u.is_deleted`,
    [input.serviceId],
  );
  const service = services.rows[0];
  if (!service) throw new HttpError(404, 'service_not_found', 'This service is not available');
  if (service.mentor_id === userId) {
    throw new HttpError(400, 'self_booking', 'You cannot book your own session');
  }

  const slots = await client.query<{ id: string; starts_at: Date }>(
    `SELECT id, starts_at
       FROM mentor_availability_slot
      WHERE mentor_id = $1
        AND starts_at = (($2::date + $3::time) AT TIME ZONE 'Europe/Lisbon')
        AND starts_at > now()
      FOR UPDATE`,
    [service.mentor_id, input.date, input.time],
  );
  const slot = slots.rows[0];
  if (!slot) throw new HttpError(409, 'slot_unavailable', 'That time is no longer available');

  const occupied = await client.query(
    `SELECT 1
       FROM booking b
       JOIN service s ON s.id = b.service_id
      WHERE s.mentor_id = $1 AND b.scheduled_at = $2 AND b.status <> 'cancelled'`,
    [service.mentor_id, slot.starts_at],
  );
  if (occupied.rowCount) {
    throw new HttpError(409, 'slot_unavailable', 'That time is no longer available');
  }

  const amountCents = service.price_cents + PLATFORM_FEE_CENTS;
  const booking = await client.query<{ id: string }>(
    `INSERT INTO booking (student_id, service_id, scheduled_at, status, availability_slot_id)
     VALUES ($1, $2, $3, 'pending_payment', $4)
     RETURNING id`,
    [userId, service.id, slot.starts_at, slot.id],
  );
  const payment = await client.query<{ id: string }>(
    `INSERT INTO payment
       (booking_id, amount_cents, currency, status, idempotency_key, mock_method, mock_outcome)
     VALUES ($1, $2, 'eur', 'pending', $3, $4, $5)
     RETURNING id`,
    [booking.rows[0].id, amountCents, input.idempotencyKey, input.paymentMethod, input.outcome],
  );

  return {
    paymentId: payment.rows[0].id,
    bookingId: booking.rows[0].id,
    status: 'pending' as const,
    method: input.paymentMethod,
    outcome: input.outcome,
    created: true,
  };
}

export async function finalizeMockPayment(
  client: PoolClient,
  attempt: { paymentId: string; bookingId: string },
  result: { succeeded: boolean; reference: string },
) {
  const current = await client.query<{ status: string }>(
    'SELECT status FROM payment WHERE id = $1 FOR UPDATE',
    [attempt.paymentId],
  );
  if (current.rows[0]?.status !== 'pending') return;

  const paymentStatus = result.succeeded ? 'succeeded' : 'failed';
  const bookingStatus = result.succeeded ? 'confirmed' : 'cancelled';
  await client.query(`UPDATE payment SET status = $2, mock_reference = $3 WHERE id = $1`, [
    attempt.paymentId,
    paymentStatus,
    result.reference,
  ]);
  await client.query('UPDATE booking SET status = $2 WHERE id = $1', [
    attempt.bookingId,
    bookingStatus,
  ]);
}

const BOOKING_DETAILS_SQL = `
  SELECT b.id, b.status, b.scheduled_at,
         p.status AS payment_status, p.amount_cents, p.mock_method, p.mock_reference,
         s.id AS service_id, s.title AS service_title, s.duration_minutes,
         m.user_id AS mentor_id, u.username AS mentor_name, m.headline AS mentor_headline
    FROM booking b
    JOIN LATERAL (
      SELECT status, amount_cents, mock_method, mock_reference
        FROM payment WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1
    ) p ON true
    JOIN service s ON s.id = b.service_id
    JOIN mentor m ON m.user_id = s.mentor_id
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
      WHERE b.student_id = $1 AND b.status = 'confirmed' AND b.scheduled_at >= now()
      ORDER BY b.scheduled_at`,
    [studentId],
  );
  return rows;
}
