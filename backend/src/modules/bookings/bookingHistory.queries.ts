import { pool } from '../../db/pool.js';

type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'expired';

interface BookingSnapshot {
  id: string;
  status: BookingStatus;
  scheduled_at: Date;
  service_title: string;
  duration_minutes: number;
}

interface BookingSummary extends BookingSnapshot {
  service_price_cents: number;
  mentor_name: string;
}

interface PaymentAttempt {
  id: string;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  created_at: string;
}

interface MentorSession extends BookingSnapshot {
  student_name: string;
  payment_status: PaymentStatus | null;
}

const BOOKED_SESSION_FIELDS = `b.id, b.status, b.scheduled_at, b.service_title,
  b.service_duration_minutes AS duration_minutes`;
const LATEST_PAYMENT_JOIN = `LEFT JOIN LATERAL (
  SELECT id, status, amount_cents, currency, created_at
  FROM payment WHERE booking_id = b.id
  ORDER BY created_at DESC, id DESC LIMIT 1
) p ON true`;

// The service join identifies the mentor even when the service is no longer offered.
const BOOKING_FIELDS = `${BOOKED_SESSION_FIELDS}, b.service_price_cents, u.username AS mentor_name`;
const BOOKING_SOURCE = `FROM booking b JOIN service s ON s.id = b.service_id
  JOIN "user" u ON u.id = s.mentor_id`;

const MENTOR_SESSION_FIELDS = `${BOOKED_SESSION_FIELDS}, u.username AS student_name,
  p.status AS payment_status`;
const MENTOR_SESSION_SOURCE = `FROM booking b JOIN service s ON s.id = b.service_id
  JOIN "user" u ON u.id = b.student_id
  ${LATEST_PAYMENT_JOIN}`;

export async function findBookingHistory(studentId: string) {
  const { rows } = await pool.query<
    BookingSummary & { is_past: boolean; latest_payment: PaymentAttempt | null }
  >(
    `SELECT ${BOOKING_FIELDS}, b.scheduled_at < now() AS is_past,
            row_to_json(p) AS latest_payment
     ${BOOKING_SOURCE}
     ${LATEST_PAYMENT_JOIN}
     WHERE b.student_id = $1 AND (b.scheduled_at < now() OR p.id IS NOT NULL)
     ORDER BY b.scheduled_at DESC, b.id DESC`,
    [studentId],
  );

  const pastBookings: BookingSummary[] = [];
  const paymentBookings: (BookingSummary & { latest_payment: PaymentAttempt })[] = [];
  for (const { is_past, latest_payment, ...booking } of rows) {
    if (is_past) pastBookings.push(booking);
    if (latest_payment) paymentBookings.push({ ...booking, latest_payment });
  }
  paymentBookings.sort(
    (a, b) => Date.parse(b.latest_payment.created_at) - Date.parse(a.latest_payment.created_at),
  );
  return { pastBookings, paymentBookings };
}

export async function findBookingHistoryDetails(bookingId: string, studentId: string) {
  const { rows } = await pool.query<BookingSummary & { payments: PaymentAttempt[] }>(
    `SELECT ${BOOKING_FIELDS}, COALESCE((
       SELECT json_agg(p ORDER BY p.created_at DESC, p.id DESC)
       FROM (
         SELECT id, status, amount_cents, currency, created_at
         FROM payment WHERE booking_id = b.id
       ) p
     ), '[]'::json) AS payments
     ${BOOKING_SOURCE}
     WHERE b.id = $1 AND b.student_id = $2`,
    [bookingId, studentId],
  );
  return rows[0];
}

export async function findMentorSessions(mentorId: string) {
  const { rows } = await pool.query<MentorSession & { is_past: boolean }>(
    `SELECT ${MENTOR_SESSION_FIELDS}, b.scheduled_at < now() AS is_past
     ${MENTOR_SESSION_SOURCE}
     WHERE s.mentor_id = $1
     ORDER BY b.scheduled_at DESC, b.id DESC`,
    [mentorId],
  );

  const upcoming: MentorSession[] = [];
  const past: MentorSession[] = [];
  for (const { is_past, ...session } of rows) {
    (is_past ? past : upcoming).push(session);
  }
  return { upcoming: upcoming.reverse(), past };
}

export async function findMentorSession(bookingId: string, mentorId: string) {
  const { rows } = await pool.query<MentorSession>(
    `SELECT ${MENTOR_SESSION_FIELDS}
     ${MENTOR_SESSION_SOURCE}
     WHERE b.id = $1 AND s.mentor_id = $2`,
    [bookingId, mentorId],
  );
  return rows[0];
}
