import { apiGet } from './client';

export interface BookingHistorySummary {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
  scheduled_at: string;
  service_title: string;
  duration_minutes: number;
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

export function getBookingHistory(): Promise<BookingHistory> {
  return apiGet('/api/bookings/history');
}

export function getBookingHistoryDetails(
  bookingId: string,
): Promise<{ booking: BookingHistoryDetails }> {
  return apiGet(`/api/bookings/history/${encodeURIComponent(bookingId)}`);
}
