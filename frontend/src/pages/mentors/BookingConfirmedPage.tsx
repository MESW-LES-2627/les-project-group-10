import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Check, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Avatar, Button, buttonVariants } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { getBooking } from '@/api/bookings';
import type { BookingRecord } from '@/api/bookings';
import { ApiError } from '@/api/client';
import {
  buildCalendarInvite,
  downloadTextFile,
  formatEuro,
  formatTicketDate,
  lisbonBookingTime,
  sessionRange,
} from '@/lib/booking';

/** Shows confirmation only from the student's persisted, successful booking. */
export default function BookingConfirmedPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const search = bookingId ? new URLSearchParams({ bookingId }).toString() : '';

  // Keep only the booking reference before fetching status after a Stripe redirect.
  if (searchParams.toString() !== search) return <Navigate replace to={{ search }} />;

  return <BookingConfirmation key={bookingId} bookingId={bookingId} />;
}

function BookingConfirmation({ bookingId }: { bookingId: string | null }) {
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(!bookingId);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () =>
      getBooking(bookingId)
        .then(({ booking: record }) => {
          if (cancelled) return;
          setVerificationFailed(false);
          setBooking(record);
          if (record.payment_status === 'pending') timer = setTimeout(refresh, 1500);
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          if (cause instanceof ApiError && cause.status < 500) {
            setUnavailable(true);
            setBooking(null);
            return;
          }
          setVerificationFailed(true);
          timer = setTimeout(refresh, 5000);
        });
    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bookingId]);

  if ((!booking && !unavailable) || booking?.payment_status === 'pending') {
    return (
      <DashboardLayout title="Payment status">
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-16 lg:px-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Checking your booking
          </h1>
          <p role="status" className="font-sans text-ink-soft">
            {verificationFailed
              ? 'We’re still waiting to verify your payment. We’ll check again in a moment.'
              : 'Verifying your payment with Stripe…'}
          </p>
          {booking && (
            <Link to={retryPath(booking)} className="font-sans text-sm font-medium text-secondary">
              Return to checkout
            </Link>
          )}
        </div>
      </DashboardLayout>
    );
  }
  if (!booking || booking.status !== 'confirmed' || booking.payment_status !== 'succeeded') {
    const expired = booking?.payment_status === 'expired';
    const failed = booking?.payment_status === 'failed';
    return (
      <DashboardLayout title="Payment status">
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-16 lg:px-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            {expired
              ? 'Reservation expired'
              : failed
                ? 'Payment failed'
                : 'No confirmed booking to show'}
          </h1>
          {booking && (expired || failed) ? (
            <Link to={retryPath(booking)} className="font-sans text-sm font-medium text-secondary">
              Return to checkout to retry
            </Link>
          ) : (
            <Link to="/dashboard/mentors" className="font-sans text-sm font-medium text-secondary">
              Find a mentor
            </Link>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const confirmedBooking = booking;
  const { date, time } = lisbonBookingTime(confirmedBooking.scheduled_at);
  const when = formatTicketDate(date);
  const duration = `${confirmedBooking.duration_minutes} min`;
  const range = sessionRange(time, duration);
  const ref = confirmedBooking.id;

  function downloadReceipt() {
    downloadTextFile(
      `${ref}.txt`,
      [
        'FEUP Connect — Stripe test payment receipt',
        `Booking ref ${confirmedBooking.id}`,
        `${confirmedBooking.service_title} with ${confirmedBooking.mentor_name}`,
        `${when} · ${range}`,
        `Amount: ${formatEuro(confirmedBooking.amount_cents / 100)}`,
        `Booking reference: ${ref}`,
        'Payment processed in Stripe test mode.',
      ].join('\n'),
      'text/plain',
    );
  }

  function addToCalendar() {
    downloadTextFile(
      `${confirmedBooking.id}.ics`,
      buildCalendarInvite({
        title: `${confirmedBooking.service_title} with ${confirmedBooking.mentor_name}`,
        date,
        start: time,
        duration,
        description: `Booking ref ${confirmedBooking.id}. Meeting link is not yet provisioned.`,
      }),
      'text/calendar',
    );
  }

  return (
    <DashboardLayout title="Booking confirmed">
      <div className="mx-auto flex w-full max-w-180 flex-col items-center gap-7 px-4 py-8 lg:px-8">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-10" />
        </span>
        <h1 className="text-center font-display text-5xl font-bold tracking-tight text-ink">
          You&rsquo;re booked!
        </h1>
        <p className="max-w-xl text-center font-sans text-lg text-ink-soft">
          Your test payment was verified by Stripe and your booking is confirmed.
        </p>
        <article className="w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-[0px_16px_40px_0px_rgba(13,43,36,0.1)]">
          <div className="flex items-center gap-4 bg-primary p-7">
            <Avatar
              initials={booking.mentor_name
                .split(/\s+/)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
              tone="accent"
              size="md"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-display text-[22px] font-semibold tracking-tight text-ink-inverse">
                {booking.service_title} with {booking.mentor_name}
              </p>
              <p className="font-sans text-sm text-primary-soft">
                {booking.mentor_headline.split('·')[0]?.trim()}
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1.5 font-sans text-xs font-medium text-primary">
              TEST PAID
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-7 sm:grid-cols-4">
            <TicketField label="Date" value={when} />
            <TicketField label="Time" value={range} />
            <TicketField label="Format" value="Google Meet" />
            <TicketField label="Amount" value={formatEuro(booking.amount_cents / 100)} />
          </div>
          <div className="h-px bg-line" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-4">
            <p className="inline-flex items-center gap-2 font-sans text-xs font-medium text-ink-muted">
              <ShieldCheck className="size-4" />
              Booking {booking.id}
            </p>
            <button
              type="button"
              onClick={downloadReceipt}
              className="font-sans text-sm font-medium text-secondary"
            >
              Download receipt
            </button>
          </div>
        </article>
        <div className="grid w-full gap-3 sm:grid-cols-3">
          <Button type="button" variant="blue" fullWidth disabled>
            Messaging unavailable
          </Button>
          <Button type="button" variant="outlined" fullWidth onClick={addToCalendar}>
            Add to calendar
          </Button>
          <Link
            to="/dashboard"
            className={buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })}
          >
            My sessions
          </Link>
        </div>
        <section className="flex w-full flex-col gap-3.5 rounded-[20px] bg-accent-soft p-7">
          <p className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
            <Sparkles className="size-5 text-accent-strong" />
            Booking saved
          </p>
          <p className="inline-flex items-start gap-2.5 font-sans text-sm text-ink">
            <Check className="mt-0.5 size-4 shrink-0" />
            This prototype does not send email, create a meeting link, or unlock chat.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}

function retryPath(booking: BookingRecord) {
  const params = new URLSearchParams({ bookingId: booking.id });
  return `/mentors/${booking.mentor_id}/checkout?${params}`;
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-xs font-medium text-ink-muted">{label}</p>
      <p className="font-sans text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
