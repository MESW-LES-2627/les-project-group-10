import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getMentorSession } from '@/api/bookingHistory';
import type { MentorSession } from '@/api/bookingHistory';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
  bookingStatusLabels,
  formatHistoryDate,
  formatSessionPaymentStatus,
} from '@/lib/bookingHistory';

type SessionResult = { session: MentorSession } | { error: string };

export default function MentorSessionDetailsPage() {
  const { bookingId } = useParams();
  const { user } = useAuth();

  return (
    <DashboardLayout title="Session details">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
        <Link
          to="/dashboard/mentor-sessions"
          className="flex w-fit items-center gap-2 text-sm text-secondary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to mentor sessions
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink">Session details</h1>
        {bookingId && user?.isMentor ? (
          <SessionDetails key={`${user.id}:${bookingId}`} bookingId={bookingId} />
        ) : (
          <p role="alert" className="font-sans text-sm text-danger">
            Session not found.
          </p>
        )}
      </main>
    </DashboardLayout>
  );
}

function SessionDetails({ bookingId }: { bookingId: string }) {
  const [result, setResult] = useState<SessionResult>();

  useEffect(() => {
    let cancelled = false;
    getMentorSession(bookingId)
      .then((session) => {
        if (!cancelled) setResult(session);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setResult({
          error:
            error instanceof ApiError && error.status === 404
              ? 'Session not found.'
              : 'Could not load this session. Refresh the page to try again.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!result) return <p className="text-sm text-ink-muted">Loading session…</p>;
  if ('error' in result) {
    return (
      <p role="alert" className="font-sans text-sm text-danger">
        {result.error}
      </p>
    );
  }

  const { session } = result;
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-display text-2xl font-semibold break-words text-ink">
        {session.service_title}
      </h2>
      <dl className="grid gap-4 font-sans text-sm break-words text-ink sm:grid-cols-2 [&_dt]:text-ink-muted">
        <div>
          <dt>Student</dt>
          <dd>{session.student_name}</dd>
        </div>
        <div>
          <dt>Scheduled for</dt>
          <dd>
            <time dateTime={session.scheduled_at}>{formatHistoryDate(session.scheduled_at)}</time>
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{session.duration_minutes} minutes</dd>
        </div>
        <div>
          <dt>Booking status</dt>
          <dd>{bookingStatusLabels[session.status]}</dd>
        </div>
        <div>
          <dt>Payment status</dt>
          <dd>{formatSessionPaymentStatus(session.payment_status)}</dd>
        </div>
      </dl>
    </section>
  );
}
