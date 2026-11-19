import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Calendar, CheckCircle2, CreditCard } from 'lucide-react';
import { buttonVariants } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { StudentBookingHistory } from '@/components/dashboard/StudentBookingHistory';
import { UpcomingSessionRow } from '@/components/dashboard/UpcomingSessionRow';
import { getBookingHistory } from '@/api/bookingHistory';
import type { BookingHistory } from '@/api/bookingHistory';
import { getUpcomingBookings } from '@/api/bookings';
import type { BookingRecord } from '@/api/bookings';
import { useAuth } from '@/auth/useAuth';
import { firstName, formatEuro, sessionRange } from '@/lib/booking';

/** Reads confirmed sessions from the API so this view follows persisted state. */
export default function StudentDashboardPage() {
  const { user } = useAuth();
  const studentId = user?.isStudent ? user.id : null;
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyResult, setHistoryResult] = useState<{
    studentId: string;
    data: BookingHistory | null;
  }>();

  useEffect(() => {
    let cancelled = false;
    getUpcomingBookings()
      .then(({ bookings: records }) => {
        if (!cancelled) setBookings(records);
      })
      .catch((error) => {
        console.error('Could not load upcoming bookings:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    getBookingHistory()
      .then((data) => {
        if (!cancelled) setHistoryResult({ studentId, data });
      })
      .catch(() => {
        if (!cancelled) setHistoryResult({ studentId, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const history = historyResult?.studentId === studentId ? historyResult.data : undefined;
  const completedCount = history?.pastBookings.filter(
    (booking) => booking.status === 'completed',
  ).length;
  const spent = bookings.reduce((sum, booking) => sum + booking.amount_cents / 100, 0);
  const welcome = loading
    ? 'Loading your sessions…'
    : bookings.length === 0
      ? 'No sessions booked yet. Find a mentor when you’re ready.'
      : `You have ${bookings.length} upcoming ${bookings.length === 1 ? 'session' : 'sessions'}.`;

  return (
    <DashboardLayout title="Student dashboard">
      <main className="flex flex-1 flex-col gap-8 px-4 py-6 lg:flex-row lg:px-8 lg:py-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                Welcome back{user ? `, ${firstName(user.username)}` : ''}
              </h1>
              <p className="font-sans text-base text-ink-soft">{welcome}</p>
            </div>
            <Link
              to="/dashboard/mentors"
              className={buttonVariants({ variant: 'blue', size: 'md' })}
            >
              Find a mentor
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="flex w-full flex-wrap gap-5">
            <StatCard icon={Calendar} value={String(bookings.length)} label="Upcoming sessions" />
            <StatCard
              icon={CheckCircle2}
              iconClassName="flex size-10 items-center justify-center rounded-[10px] bg-secondary-soft"
              value={completedCount?.toString() ?? '—'}
              label="Completed sessions"
            />
            <StatCard
              icon={Bookmark}
              iconClassName="flex size-10 items-center justify-center rounded-[10px] bg-tertiary-soft"
              value="0"
              label="Saved mentors"
            />
            <StatCard
              icon={CreditCard}
              iconClassName="flex size-10 items-center justify-center rounded-[10px] bg-accent-soft"
              value={formatEuro(spent)}
              label="Upcoming total"
            />
          </div>
          <section
            id="sessions"
            className="flex w-full scroll-mt-24 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
          >
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              Upcoming sessions
            </p>
            {loading ? (
              <p className="font-sans text-sm text-ink-muted">Loading…</p>
            ) : bookings.length === 0 ? (
              <EmptyState
                title="No upcoming sessions"
                body="Book a session with a mentor and it will show up here."
                action={
                  <Link
                    to="/dashboard/mentors"
                    className="font-sans text-sm font-medium text-secondary"
                  >
                    Find a mentor
                  </Link>
                }
              />
            ) : (
              bookings.map((booking) => {
                const startsAt = new Date(booking.scheduled_at);
                const date = new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Europe/Lisbon',
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                }).format(startsAt);
                const time = new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Europe/Lisbon',
                  hour: '2-digit',
                  minute: '2-digit',
                  hourCycle: 'h23',
                }).format(startsAt);
                return (
                  <UpcomingSessionRow
                    key={booking.id}
                    mentorId={booking.mentor_id}
                    initials={booking.mentor_name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                    avatarTone="primary"
                    mentorName={booking.mentor_name}
                    service={booking.service_title}
                    time={`${date} · ${sessionRange(time, `${booking.duration_minutes} min`)}`}
                    action="details"
                  />
                );
              })
            )}
          </section>
          <section
            id="saved"
            className="flex w-full scroll-mt-24 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
          >
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              Saved mentors
            </p>
            <EmptyState title="No saved mentors" body="Mentors you save will be listed here." />
          </section>
          {studentId && <StudentBookingHistory history={history} />}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-80">
          <section
            id="settings"
            className="flex w-full scroll-mt-24 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
          >
            <p className="font-sans text-base font-semibold text-ink">Settings</p>
            <div className="flex flex-col gap-3">
              <p className="font-sans text-sm font-semibold text-ink">Profile</p>
              <EmptyState
                title="Nothing here yet"
                body="Profile details will appear once they’re available."
              />
            </div>
          </section>
          <section
            id="messages"
            className="flex w-full scroll-mt-24 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
          >
            <p className="font-display text-lg font-semibold tracking-tight text-ink">Messages</p>
            <EmptyState title="No messages" body="Chat is not yet available in this prototype." />
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-canvas px-5 py-6">
      <p className="font-sans text-sm font-semibold text-ink">{title}</p>
      <p className="font-sans text-sm text-ink-soft">{body}</p>
      {action}
    </div>
  );
}
