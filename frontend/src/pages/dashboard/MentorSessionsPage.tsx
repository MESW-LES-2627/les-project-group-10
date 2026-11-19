import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMentorSessions } from '@/api/bookingHistory';
import type { MentorSession, MentorSessionHistory } from '@/api/bookingHistory';
import { useAuth } from '@/auth/useAuth';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
  bookingStatusLabels,
  formatHistoryDate,
  formatSessionPaymentStatus,
} from '@/lib/bookingHistory';

export default function MentorSessionsPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Mentor sessions">
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-ink">Mentor sessions</h1>
        {user?.isMentor ? (
          <MentorSessionList key={user.id} />
        ) : (
          <p role="alert" className="font-sans text-sm text-danger">
            Only mentors can view mentor sessions.
          </p>
        )}
      </main>
    </DashboardLayout>
  );
}

function MentorSessionList() {
  const [history, setHistory] = useState<MentorSessionHistory | null>();

  useEffect(() => {
    let cancelled = false;
    getMentorSessions()
      .then((sessions) => {
        if (!cancelled) setHistory(sessions);
      })
      .catch(() => {
        if (!cancelled) setHistory(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (history === undefined) return <p className="text-sm text-ink-muted">Loading sessions…</p>;
  if (history === null) {
    return (
      <p role="alert" className="font-sans text-sm text-danger">
        Could not load your sessions. Refresh the page to try again.
      </p>
    );
  }

  return (
    <>
      <SessionSection
        title="Upcoming sessions"
        id="upcoming-sessions"
        empty="No upcoming sessions yet."
        sessions={history.upcoming}
      />
      <SessionSection
        title="Past sessions"
        id="past-sessions"
        empty="No past sessions yet."
        sessions={history.past}
      />
    </>
  );
}

function SessionSection({
  title,
  id,
  empty,
  sessions,
}: {
  title: string;
  id: string;
  empty: string;
  sessions: MentorSession[];
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-7"
    >
      <h2 id={id} className="font-display text-2xl font-semibold text-ink">
        {title}
      </h2>
      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-canvas px-5 py-4 font-sans text-sm text-ink-soft">{empty}</p>
      ) : (
        <ol role="list" className="divide-y divide-line">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                to={`/dashboard/mentor-sessions/${session.id}`}
                className="flex items-start gap-3 rounded-xl px-2 py-4 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-primary sm:px-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-6">
                  <div className="min-w-0 break-words font-sans text-sm">
                    <p className="font-semibold text-ink">{session.service_title}</p>
                    <p className="text-ink-soft">{session.student_name}</p>
                    <time dateTime={session.scheduled_at} className="text-xs text-ink-muted">
                      {formatHistoryDate(session.scheduled_at)}
                    </time>
                  </div>
                  <dl className="grid w-fit grid-cols-[auto_auto] gap-x-3 gap-y-1 rounded-xl bg-canvas px-3 py-2 font-sans text-xs text-ink-soft">
                    <dt>Booking</dt>
                    <dd className="font-medium text-ink">{bookingStatusLabels[session.status]}</dd>
                    <dt>Payment</dt>
                    <dd className="font-medium text-ink">
                      {formatSessionPaymentStatus(session.payment_status)}
                    </dd>
                  </dl>
                </div>
                <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-secondary" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
