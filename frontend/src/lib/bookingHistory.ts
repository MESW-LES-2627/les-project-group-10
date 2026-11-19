import type { BookingHistorySummary, PaymentAttempt } from '@/api/bookingHistory';
import { formatTicketDate, lisbonBookingTime } from './booking';

export const bookingStatusLabels: Record<BookingHistorySummary['status'], string> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const attemptStatusLabels: Record<PaymentAttempt['status'], string> = {
  pending: 'Pending',
  succeeded: 'Succeeded',
  failed: 'Failed',
  expired: 'Expired',
};

export function formatSessionPaymentStatus(status: PaymentAttempt['status'] | null) {
  if (status === null) return 'Not attempted';
  if (status === 'succeeded') return 'Succeeded (test)';
  return attemptStatusLabels[status];
}

export function formatHistoryDate(timestamp: string) {
  const { date, time } = lisbonBookingTime(timestamp);
  return `${formatTicketDate(date)} · ${time} Lisbon time`;
}

export function formatAttemptAmount({ amount_cents, currency }: PaymentAttempt) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(amount_cents / 100);
}
