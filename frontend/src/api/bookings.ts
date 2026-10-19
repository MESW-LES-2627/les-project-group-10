import { apiGet, apiPost } from './client';

export interface BookingRecord {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
  scheduled_at: string;
  payment_status: 'pending' | 'succeeded' | 'failed';
  amount_cents: number;
  service_id: string;
  service_title: string;
  duration_minutes: number;
  mentor_id: string;
  mentor_name: string;
  mentor_headline: string;
}

export interface StripeCheckoutInput {
  serviceId: string;
  date: string;
  time: string;
  idempotencyKey: string;
}

export function createStripeCheckout(
  input: StripeCheckoutInput,
): Promise<{ bookingId: string; clientSecret: string }> {
  return apiPost('/api/bookings/checkout/stripe', input);
}

export function getStripeConfig(): Promise<{ publishableKey: string }> {
  return apiGet('/api/bookings/stripe/config');
}

export function getBooking(bookingId: string): Promise<{ booking: BookingRecord }> {
  return apiGet(`/api/bookings/${encodeURIComponent(bookingId)}`);
}

export function getUpcomingBookings(): Promise<{ bookings: BookingRecord[] }> {
  return apiGet('/api/bookings/me');
}
