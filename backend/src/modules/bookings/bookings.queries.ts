import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { withTransaction } from '../../db/transaction.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { StripeCheckoutInput } from './bookings.schemas.js';

const PLATFORM_FEE_CENTS = 150;
const RESERVATION_MINUTES = 10;

type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'expired';
type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';

async function findBookableService(client: PoolClient, serviceId: string) {
  const { rows } = await client.query<{
    id: string;
    mentor_id: string;
    title: string;
    duration_minutes: number;
    price_cents: number;
  }>(
    `SELECT s.id, s.mentor_id, s.title, s.duration_minutes, s.price_cents FROM service s
       JOIN mentor m ON m.user_id = s.mentor_id JOIN "user" u ON u.id = m.user_id
      WHERE s.id = $1 AND s.is_active AND m.onboarding_finished AND NOT u.is_banned AND NOT u.is_deleted
      FOR SHARE OF s`,
    [serviceId],
  );
  if (!rows[0]) throw new HttpError(404, 'service_not_found', 'This service is not available');
  return rows[0];
}

async function requireFreeSlot(client: PoolClient, slotId: string | undefined) {
  if (slotId) {
    const occupied = await client.query(
      "SELECT 1 FROM booking WHERE availability_slot_id = $1 AND status <> 'cancelled'",
      [slotId],
    );
    if (!occupied.rowCount) return;
  }
  throw new HttpError(409, 'slot_unavailable', 'That time is no longer available');
}

async function insertPayment(
  client: PoolClient,
  bookingId: string,
  amountCents: number,
  currency: string,
  idempotencyKey?: string,
) {
  await client.query(
    `INSERT INTO payment (booking_id, amount_cents, currency, status, idempotency_key, reservation_expires_at)
     VALUES ($1, $2, $3, 'pending', COALESCE($4, gen_random_uuid()),
             clock_timestamp() + ($5 * interval '1 minute'))`,
    [bookingId, amountCents, currency, idempotencyKey ?? null, RESERVATION_MINUTES],
  );
}

export async function createPendingBooking(
  client: PoolClient,
  userId: string,
  input: StripeCheckoutInput,
) {
  await client.query('SELECT pg_advisory_xact_lock(1650812275, hashtext($1))', [
    input.idempotencyKey,
  ]);
  const previous = await client.query<{
    booking_id: string;
    student_id: string;
    service_id: string;
    date: string;
    time: string;
  }>(
    `SELECT b.id AS booking_id, b.student_id, b.service_id,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM-DD') AS date,
            to_char(b.scheduled_at AT TIME ZONE 'Europe/Lisbon', 'HH24:MI') AS time
       FROM payment p JOIN booking b ON b.id = p.booking_id
      WHERE p.idempotency_key = $1`,
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
    return existing.booking_id;
  }

  const student = await client.query('SELECT 1 FROM student WHERE user_id = $1', [userId]);
  if (!student.rowCount)
    throw new HttpError(403, 'not_a_student', 'Only student accounts can book a session');
  const service = await findBookableService(client, input.serviceId);
  if (service.mentor_id === userId)
    throw new HttpError(400, 'self_booking', 'You cannot book your own session');
  const slotResult = await client.query<{ id: string; starts_at: Date }>(
    `SELECT id, starts_at FROM mentor_availability_slot
      WHERE mentor_id = $1 AND service_id = $2
        AND starts_at = (($3::date + $4::time) AT TIME ZONE 'Europe/Lisbon')
        AND starts_at > clock_timestamp() FOR UPDATE`,
    [service.mentor_id, service.id, input.date, input.time],
  );
  const slot = slotResult.rows[0];
  await requireFreeSlot(client, slot?.id);

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
  const bookingId = booking.rows[0].id;
  await insertPayment(
    client,
    bookingId,
    service.price_cents + PLATFORM_FEE_CENTS,
    'eur',
    input.idempotencyKey,
  );
  return bookingId;
}

export async function retryBooking(
  client: PoolClient,
  bookingId: string,
  studentId: string,
  attemptId: string,
) {
  const {
    rows: [booking],
  } = await client.query<{
    service_id: string;
    availability_slot_id: string | null;
    status: BookingStatus;
  }>(
    'SELECT service_id, availability_slot_id, status FROM booking WHERE id = $1 AND student_id = $2 FOR UPDATE',
    [bookingId, studentId],
  );
  if (!booking) throw new HttpError(404, 'booking_not_found', 'Booking not found');
  const {
    rows: [previous],
  } = await client.query<{
    id: string;
    status: PaymentStatus;
    amount_cents: number;
    currency: string;
  }>(
    'SELECT id, status, amount_cents, currency FROM payment WHERE booking_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1',
    [bookingId],
  );
  if (
    !previous ||
    previous.id !== attemptId ||
    booking.status !== 'cancelled' ||
    !['failed', 'expired'].includes(previous.status)
  )
    return;

  // Stripe reconciliation for other expired occupants is scoped to this slot before retry starts.
  const service = await findBookableService(client, booking.service_id);
  const {
    rows: [slot],
  } = await client.query<{ id: string }>(
    'SELECT id FROM mentor_availability_slot WHERE id = $1 AND mentor_id = $2 AND starts_at > clock_timestamp() FOR UPDATE',
    [booking.availability_slot_id, service.mentor_id],
  );
  await requireFreeSlot(client, slot?.id);
  await client.query("UPDATE booking SET status = 'pending_payment' WHERE id = $1", [bookingId]);
  await insertPayment(client, bookingId, previous.amount_cents, previous.currency);
}

export type PendingPayment = {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_creation_started_at: Date | null;
  reservation_expires_at: Date;
  amount_cents: number;
  currency: string;
};

export type PaymentScope = {
  studentId: string;
  bookingId?: string;
  checkout?: StripeCheckoutInput;
  retrySlot?: boolean;
};

export async function findPendingStripePayments(scope: PaymentScope) {
  const { rows } = await pool.query<PendingPayment>(
    `SELECT p.id, p.booking_id, p.stripe_payment_intent_id, p.stripe_creation_started_at,
            p.reservation_expires_at, p.amount_cents, p.currency
       FROM payment p JOIN booking b ON b.id = p.booking_id
      WHERE p.status = 'pending' AND b.status = 'pending_payment'
        AND CASE WHEN $3::uuid IS NOT NULL THEN
          p.reservation_expires_at <= clock_timestamp()
          AND NOT EXISTS (SELECT 1 FROM payment WHERE idempotency_key = $3)
          AND b.availability_slot_id IN (
            SELECT slot.id FROM mentor_availability_slot slot JOIN service s ON s.mentor_id = slot.mentor_id
             WHERE s.id = $4 AND slot.starts_at = (($5::date + $6::time) AT TIME ZONE 'Europe/Lisbon')
          )
        WHEN $7::boolean THEN
          p.reservation_expires_at <= clock_timestamp() AND b.availability_slot_id = (
            SELECT availability_slot_id FROM booking WHERE id = $2 AND student_id = $1
          )
        ELSE
          b.student_id = $1 AND ($2::uuid IS NULL OR b.id = $2)
        END`,
    [
      scope.studentId,
      scope.bookingId ?? null,
      scope.checkout?.idempotencyKey ?? null,
      scope.checkout?.serviceId ?? null,
      scope.checkout?.date ?? null,
      scope.checkout?.time ?? null,
      scope.retrySlot ?? false,
    ],
  );
  return rows;
}

export async function claimPaymentIntentCreation(paymentId: string, start: boolean) {
  const { rows } = await pool.query<
    PendingPayment & {
      idempotency_key: string;
      stripe_receipt_email: string;
    }
  >(
    `UPDATE payment p
        SET stripe_creation_started_at = COALESCE(p.stripe_creation_started_at, clock_timestamp()),
            stripe_receipt_email = COALESCE(p.stripe_receipt_email, u.email),
            idempotency_key = COALESCE(p.idempotency_key, p.id)
       FROM booking b JOIN "user" u ON u.id = b.student_id
      WHERE p.id = $1 AND b.id = p.booking_id AND p.status = 'pending'
        AND b.status = 'pending_payment' AND p.stripe_payment_intent_id IS NULL
        AND (p.stripe_creation_started_at > clock_timestamp() - interval '23 hours'
          OR (p.stripe_creation_started_at IS NULL AND $2 AND p.reservation_expires_at > clock_timestamp()))
      RETURNING p.id, p.booking_id, p.stripe_payment_intent_id, p.stripe_creation_started_at,
                p.reservation_expires_at, p.amount_cents, p.currency, p.idempotency_key, p.stripe_receipt_email`,
    [paymentId, start],
  );
  return rows[0];
}

export async function attachPaymentIntent(paymentId: string, intentId: string) {
  const { rows } = await pool.query<{ reservation_expires_at: Date }>(
    `UPDATE payment p SET stripe_payment_intent_id = $2 FROM booking b
      WHERE p.id = $1 AND b.id = p.booking_id AND p.status = 'pending'
        AND b.status = 'pending_payment'
        AND (p.stripe_payment_intent_id IS NULL OR p.stripe_payment_intent_id = $2)
      RETURNING p.reservation_expires_at`,
    [paymentId, intentId],
  );
  return rows[0];
}

async function finishAttempt(
  value: string,
  outcome: Exclude<PaymentStatus, 'pending'>,
  unattached = false,
) {
  return withTransaction(async (client) => {
    const {
      rows: [payment],
    } = await client.query<{ id: string; booking_id: string }>(
      `SELECT p.id, p.booking_id FROM payment p JOIN booking b ON b.id = p.booking_id
        WHERE p.status = 'pending' AND b.status = 'pending_payment' AND ${
          unattached
            ? `p.id = $1 AND p.stripe_payment_intent_id IS NULL AND p.stripe_creation_started_at IS NULL
                 AND p.reservation_expires_at <= clock_timestamp()`
            : 'p.stripe_payment_intent_id = $1'
        }
        FOR UPDATE OF b, p`,
      [value],
    );
    if (!payment) return;
    await client.query('UPDATE payment SET status = $2 WHERE id = $1', [payment.id, outcome]);
    await client.query('UPDATE booking SET status = $2 WHERE id = $1', [
      payment.booking_id,
      outcome === 'succeeded' ? 'confirmed' : 'cancelled',
    ]);
  });
}

export function expireUnattachedPayment(paymentId: string) {
  return finishAttempt(paymentId, 'expired', true);
}

export function markStripePaymentResult(
  intentId: string,
  outcome: Exclude<PaymentStatus, 'pending'>,
) {
  return finishAttempt(intentId, outcome);
}

export interface BookingRecord {
  id: string;
  status: BookingStatus;
  scheduled_at: Date;
  payment_status: PaymentStatus;
  amount_cents: number;
  service_id: string;
  service_title: string;
  duration_minutes: number;
  service_price_cents: number;
  mentor_id: string;
  mentor_name: string;
  mentor_headline: string;
}

// Use the booked service snapshot even if the mentor later changes it.
const BOOKING_DETAILS_SQL = `
  SELECT b.id, b.status, b.scheduled_at, p.status AS payment_status, p.amount_cents,
         b.service_id, b.service_title, b.service_duration_minutes AS duration_minutes,
         b.service_price_cents, p.id AS attempt_id,
         m.user_id AS mentor_id, u.username AS mentor_name, m.headline AS mentor_headline
    FROM booking b JOIN LATERAL (
      SELECT id, status, amount_cents FROM payment WHERE booking_id = b.id
       ORDER BY created_at DESC, id DESC LIMIT 1
    ) p ON true JOIN service s ON s.id = b.service_id JOIN mentor m ON m.user_id = s.mentor_id
      JOIN "user" u ON u.id = m.user_id`;

export async function findBookingForStudent(bookingId: string, studentId: string) {
  const { rows } = await pool.query<BookingRecord & { attempt_id: string }>(
    `${BOOKING_DETAILS_SQL} WHERE b.id = $1 AND b.student_id = $2`,
    [bookingId, studentId],
  );
  return rows[0];
}

export async function findUpcomingBookingsForStudent(studentId: string) {
  const { rows } = await pool.query<BookingRecord>(
    `${BOOKING_DETAILS_SQL}
      WHERE b.student_id = $1 AND b.status = 'confirmed' AND b.scheduled_at >= now() ORDER BY b.scheduled_at`,
    [studentId],
  );
  return rows;
}
