import { apiGet, apiPost } from './client';

export type MockPaymentMethod = 'card' | 'mbway' | 'apple';
export type MockPaymentOutcome = 'approved' | 'declined';

export interface BookingRecord {
  id: string;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
  scheduled_at: string;
  payment_status: 'pending' | 'succeeded' | 'failed';
  amount_cents: number;
  mock_method: MockPaymentMethod | null;
  mock_reference: string | null;
  service_id: string;
  service_title: string;
  duration_minutes: number;
  mentor_id: string;
  mentor_name: string;
  mentor_headline: string;
}

export interface MockCheckoutInput {
  serviceId: string;
  date: string;
  time: string;
  paymentMethod: MockPaymentMethod;
  outcome: MockPaymentOutcome;
  idempotencyKey: string;
}

export function createMockCheckout(input: MockCheckoutInput): Promise<{ booking: BookingRecord }> {
  return apiPost('/api/bookings/checkout/mock', input);
}

export function getBooking(bookingId: string): Promise<{ booking: BookingRecord }> {
  return apiGet(`/api/bookings/${encodeURIComponent(bookingId)}`);
}

export function getUpcomingBookings(): Promise<{ bookings: BookingRecord[] }> {
  return apiGet('/api/bookings/me');
}
