import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BookingHistory, BookingHistorySummary, PaymentAttempt } from '@/api/bookingHistory';
import { attemptStatusLabels, bookingStatusLabels, formatHistoryDate } from '@/lib/bookingHistory';

interface HistorySectionProps {
  id: string;
  title: string;
  empty: string;
  error: string;
  bookings: (BookingHistorySummary & { latest_payment?: PaymentAttempt })[] | null | undefined;
}

function HistorySection({ id, title, empty, error, bookings }: HistorySectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex w-full scroll-mt-24 flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-7"
    >
      <h2 id={`${id}-heading`} className="font-display text-2xl font-semibold text-ink">
        {title}
      </h2>
      {bookings === undefined ? (
        <p role="status" className="font-sans text-sm text-ink-muted">
          Loading…
        </p>
      ) : bookings === null ? (
        <p role="alert" className="font-sans text-sm text-danger">
          {error}
        </p>
      ) : bookings.length === 0 ? (
        <p className="rounded-2xl bg-canvas px-5 py-4 font-sans text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul role="list" className="flex flex-col divide-y divide-line">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                to={`/dashboard/bookings/${booking.id}`}
                className="flex items-start gap-3 rounded-xl px-2 py-4 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-primary sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-semibold text-ink">
                    {booking.service_title}
                  </p>
                  <p className="font-sans text-sm text-ink-soft">{booking.mentor_name}</p>
                  <time
                    dateTime={booking.scheduled_at}
                    className="font-sans text-xs text-ink-muted"
                  >
                    {formatHistoryDate(booking.scheduled_at)}
                  </time>
                </div>
                <span className="rounded-full bg-canvas px-3 py-1 font-sans text-xs font-medium text-ink-soft">
                  {booking.latest_payment
                    ? attemptStatusLabels[booking.latest_payment.status]
                    : bookingStatusLabels[booking.status]}
                </span>
                <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-secondary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StudentBookingHistory({ history }: { history: BookingHistory | null | undefined }) {
  return (
    <>
      <HistorySection
        id="past-sessions"
        title="Past sessions"
        empty="No past sessions yet."
        error="Could not load your past sessions. Refresh the page to try again."
        bookings={history === null ? null : history?.pastBookings}
      />
      <HistorySection
        id="payment-history"
        title="Payment history"
        empty="No payment attempts yet."
        error="Could not load your payment history. Refresh the page to try again."
        bookings={history === null ? null : history?.paymentBookings}
      />
    </>
  );
}
