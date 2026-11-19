import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '@/api/client';
import { getBookingHistoryDetails } from '@/api/bookingHistory';
import type { BookingHistoryDetails } from '@/api/bookingHistory';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useAuth } from '@/auth/useAuth';
import { formatEuro } from '@/lib/booking';
import {
  attemptStatusLabels,
  bookingStatusLabels,
  formatAttemptAmount,
  formatHistoryDate,
} from '@/lib/bookingHistory';

type DetailsResult = { booking: BookingHistoryDetails } | { error: string };

export default function StudentBookingDetailsPage() {
  const { bookingId } = useParams();
  const { user } = useAuth();

  return (
    <DashboardLayout title="Booking details">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
        <Link to="/dashboard" className="flex w-fit items-center gap-2 text-sm text-secondary">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink">Booking details</h1>
        {bookingId && user?.isStudent ? (
          <BookingDetails key={`${user.id}:${bookingId}`} bookingId={bookingId} />
        ) : (
          <p role="alert" className="font-sans text-sm text-danger">
            Booking not found.
          </p>
        )}
      </main>
    </DashboardLayout>
  );
}

function BookingDetails({ bookingId }: { bookingId: string }) {
  const [result, setResult] = useState<DetailsResult>();

  useEffect(() => {
    let cancelled = false;
    getBookingHistoryDetails(bookingId)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setResult({
          error:
            error instanceof ApiError && error.status === 404
              ? 'Booking not found.'
              : 'Could not load this booking. Refresh the page to try again.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!result) return <p role="status">Loading booking…</p>;
  if ('error' in result)
    return (
      <p role="alert" className="font-sans text-sm text-danger">
        {result.error}
      </p>
    );

  const { booking } = result;
  const sectionClass =
    'flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-7';
  return (
    <>
      <section aria-labelledby="booking-service" className={sectionClass}>
        <h2 id="booking-service" className="font-display text-2xl font-semibold text-ink">
          {booking.service_title}
        </h2>
        <dl className="grid gap-4 font-sans text-sm text-ink sm:grid-cols-2 [&_dt]:text-ink-muted">
          <div>
            <dt>Mentor</dt>
            <dd>{booking.mentor_name}</dd>
          </div>
          <div>
            <dt>Scheduled for</dt>
            <dd>
              <time dateTime={booking.scheduled_at}>{formatHistoryDate(booking.scheduled_at)}</time>
            </dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{booking.duration_minutes} minutes</dd>
          </div>
          <div>
            <dt>Booking status</dt>
            <dd>{bookingStatusLabels[booking.status]}</dd>
          </div>
          <div>
            <dt>Booked service price</dt>
            <dd>{formatEuro(booking.service_price_cents / 100)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="payment-attempts" className={sectionClass}>
        <h2 id="payment-attempts" className="font-display text-2xl font-semibold text-ink">
          Payment attempts
        </h2>
        {booking.payments.length === 0 ? (
          <p className="font-sans text-sm text-ink-soft">No payment attempts for this booking.</p>
        ) : (
          <>
            <p className="font-sans text-sm text-ink-soft">Stripe test payments</p>
            <ul role="list" className="flex flex-col divide-y divide-line">
              {booking.payments.map((attempt) => (
                <li key={attempt.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1 font-sans text-sm">
                    <span className="font-semibold text-ink">{formatAttemptAmount(attempt)}</span>
                    <time dateTime={attempt.created_at} className="text-ink-muted">
                      {formatHistoryDate(attempt.created_at)}
                    </time>
                  </div>
                  <span className="rounded-full bg-canvas px-3 py-1 font-sans text-xs font-medium text-ink-soft">
                    {attemptStatusLabels[attempt.status]}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
