import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Calendar, CheckCircle2, CreditCard } from 'lucide-react';
import { buttonVariants } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { UpcomingSessionRow } from '@/components/dashboard/UpcomingSessionRow';
import { getMentors } from '@/api/mentors';
import type { Mentor } from '@/api/mentors';
import { formatEuro, formatShortDate, readStudentBookings, sessionRange } from '@/lib/booking';
import type { StudentBooking } from '@/lib/booking';

/**
 * `/dashboard`: the logged-in student's home. Lists only sessions
 * they have booked; every other section stays empty until there is data.
 */
export default function StudentDashboardPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [bookings, setBookings] = useState<StudentBooking[]>([]);

  useEffect(() => {
    let cancelled = false;
    getMentors().then((data) => {
      if (!cancelled) {
        setMentors(data);
        setBookings(readStudentBookings());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = useMemo(
    () =>
      bookings.flatMap((booking) => {
        const mentor = mentors.find((item) => item.id === booking.mentorId);
        const service = mentor?.services.find((item) => item.id === booking.serviceId);
        if (!mentor || !service) return [];
        return [{ booking, mentor, service }];
      }),
    [bookings, mentors],
  );

  const spent = upcoming.reduce((sum, item) => sum + item.booking.total, 0);
  const welcome =
    upcoming.length === 0
      ? 'No sessions booked yet. Find a mentor when you’re ready.'
      : `You have ${upcoming.length} upcoming ${upcoming.length === 1 ? 'session' : 'sessions'}.`;

  return (
    <DashboardLayout title="Student dashboard">
      <div className="flex flex-1 flex-col gap-8 px-4 py-6 lg:flex-row lg:px-8 lg:py-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="font-display text-3xl font-bold tracking-tight text-ink">
                Welcome back, Ana
              </p>
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
            <StatCard icon={Calendar} value={String(upcoming.length)} label="Upcoming sessions" />
            <StatCard
              icon={CheckCircle2}
              iconClassName="flex size-10 items-center justify-center rounded-[10px] bg-secondary-soft"
              value="0"
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
              label="Spent on learning"
            />
          </div>

          <section
            id="sessions"
            className="flex w-full scroll-mt-24 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
          >
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              Upcoming sessions
            </p>
            {upcoming.length === 0 ? (
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
              upcoming.map(({ booking, mentor, service }) => (
                <UpcomingSessionRow
                  key={booking.id}
                  mentorId={mentor.id}
                  initials={mentor.initials}
                  avatarTone={mentor.avatarTone}
                  mentorName={mentor.name}
                  service={service.title}
                  time={`${formatShortDate(booking.date)} · ${sessionRange(booking.time, service.duration)}`}
                  action="details"
                />
              ))
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

          <section className="flex w-full flex-col gap-5 rounded-[20px] border border-line bg-surface p-7">
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              Past sessions
            </p>
            <EmptyState title="No past sessions" body="Finished sessions will show up here." />
          </section>
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
            <EmptyState
              title="No messages"
              body="Chat with a mentor unlocks after you book a session."
            />
          </section>
        </div>
      </div>
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
