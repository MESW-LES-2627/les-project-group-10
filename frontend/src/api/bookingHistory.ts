import { apiGet } from './client';

interface BookingSnapshot {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
  scheduled_at: string;
  service_title: string;
  duration_minutes: number;
}

export interface BookingHistorySummary extends BookingSnapshot {
  service_price_cents: number;
  mentor_name: string;
}

export interface PaymentAttempt {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'expired';
  amount_cents: number;
  currency: string;
  created_at: string;
}

export interface BookingHistory {
  pastBookings: BookingHistorySummary[];
  paymentBookings: (BookingHistorySummary & { latest_payment: PaymentAttempt })[];
}

export interface BookingHistoryDetails extends BookingHistorySummary {
  payments: PaymentAttempt[];
}

export interface MentorSession extends BookingSnapshot {
  student_name: string;
  payment_status: PaymentAttempt['status'] | null;
}

export interface MentorSessionHistory {
  upcoming: MentorSession[];
  past: MentorSession[];
}

export function getBookingHistory(): Promise<BookingHistory> {
  return apiGet('/api/bookings/history');
}

export function getBookingHistoryDetails(
  bookingId: string,
): Promise<{ booking: BookingHistoryDetails }> {
  return apiGet(`/api/bookings/history/${encodeURIComponent(bookingId)}`);
}

export function getMentorSessions(): Promise<MentorSessionHistory> {
  return apiGet('/api/bookings/mentor-sessions');
}

export function getMentorSession(bookingId: string): Promise<{ session: MentorSession }> {
  return apiGet(`/api/bookings/mentor-sessions/${encodeURIComponent(bookingId)}`);
}
