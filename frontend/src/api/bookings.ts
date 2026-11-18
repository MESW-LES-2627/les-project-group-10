import { apiGet, apiPost } from './client';

export interface BookingRecord {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
  scheduled_at: string;
  payment_status: 'pending' | 'succeeded' | 'failed' | 'expired';
  amount_cents: number;
  service_id: string;
  service_title: string;
  service_price_cents: number;
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

export interface StripeCheckout {
  booking: BookingRecord;
  attemptId: string;
  clientSecret: string | null;
}

export function createStripeCheckout(input: StripeCheckoutInput): Promise<StripeCheckout> {
  return apiPost('/api/bookings/checkout/stripe', input);
}

export function getStripeCheckout(bookingId: string): Promise<StripeCheckout> {
  return apiGet(`/api/bookings/checkout/${encodeURIComponent(bookingId)}`);
}

export function retryStripeCheckout(bookingId: string, attemptId: string): Promise<StripeCheckout> {
  return apiPost(`/api/bookings/checkout/${encodeURIComponent(bookingId)}/retry`, { attemptId });
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
